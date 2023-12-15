import CategoriesGrid from "@/components/CategoriesGrid";
import Container from "@/components/Container";
import Header from "@/components/Header";
import ProductFilters from "@/components/ProductFilters";
import ProductsGrid from "@/components/ProductsGrid";
import Title from "@/components/Title";
import Footer from "@/components/Footer";
import BackArrowIcon from "@/components/icons/BackArrowIcon";
import { primaryLight, url } from "@/lib/colors";
import { mongooseConnect } from "@/lib/mongoose";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { useRouter } from "next/router";
import SelectedFilters from "@/components/SelectedFilters";
import LoadMoreBtn from "@/components/LoadMoreBtn";
import { useDispatch } from "react-redux";
import { updateFilters } from "@/slices/filtersSlice";
import useNormalizeFilterQuery from "@/hooks/useNormalizeFilterQuery";
import Spinner from "@/components/Spinner";
import LayoutNoPreloader from "@/components/LayoutNoPreloader";
import useWindowWidth from "@/hooks/useWindowWidth";

const StyledTitle = styled.div`
  a {
    color: ${url};
    text-decoration: none;
    font-weight: 600;
    margin-bottom: 1rem;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    svg {
      width: 1.6rem;
    }
  }
`
const Devider = styled.hr`
  margin-top: 2rem;
  margin-bottom: 2rem;
  border: none;
  border-bottom: 1px solid ${primaryLight};
`
const Row = styled.div`
  display: grid;
  grid-template-columns: 3fr 9fr;
  grid-gap: 1.3rem;
  align-items: flex-start;
  margin-bottom: 3rem;
`

export default function CategoryPage({
  category,
  initialProducts,
  allInitialProducts,
  initialCount,
  categoryChildrens,
  properties,
}) {

  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState('');
  const [productsCount, setProductsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  
  const [pageNumber, setPageNumber] = useState(router.query.page || 1);
  
  const topLevelCategoryId = '64bac2f697faffcc04671e3c';

  const dispatch = useDispatch();

  useEffect(() => {

    // check info in hook file
    const newQuery = useNormalizeFilterQuery(router?.query); 
    
    dispatch(updateFilters(newQuery)) // set filters from query

    setProductsCount(initialCount);
    setProducts(initialProducts); 
    setAllProducts(allInitialProducts); 

    const query = router.query;
    delete query.id;

    if (initialProducts.length > 0) {
      setShowFilters(true)
    } else if (Object.keys(query).length > 0) {
      setShowFilters(true)
    } else {
      setShowFilters(false)
    }
  }, [category])

  useEffect(() => {
    setPriceRange(() => {
      let sorted = JSON.parse(JSON.stringify(allProducts));
      sorted = sorted.sort((product1, product2) => {
        const price1 = product1.salePrice ? product1.salePrice : product1.price;
        const price2 = product2.salePrice ? product2.salePrice : product2.price;

        return price1 - price2;
      } )
      const lastIndex = sorted.length - 1; 
      const min = sorted[0]?.salePrice ? sorted[0]?.salePrice : sorted[0]?.price,
            max = sorted[lastIndex]?.salePrice ? sorted[lastIndex]?.salePrice : sorted[lastIndex]?.price;
      return `${min}-${max}`
    })
  }, [allProducts]);

  //set router query on pageNumber change
  useEffect(() => {
    if (pageNumber !== 1) {
      
      router.push({
        
        pathname: '/category/' + category._id, 
        query: {
          page: pageNumber,
          ...router.query
        }
      },
      undefined,
      { shallow: true },
      )
    }
  },[pageNumber])

  async function LoadProducts() {
    setLoading(true);
    setPageNumber(prev => parseInt(prev) + 1);
    const filters = router.query;
    delete filters.page;
    delete filters.id;
    axios.post('/api/products/', {query: filters, category, page: pageNumber}).then(res => {
      setProducts(prev => {
        return [
          ...prev,
          ...res.data
        ]
      })
      setLoading(false);
    })
  }

  const mobile = useWindowWidth() < 768;

  return (
    <LayoutNoPreloader>
      <StyledTitle>
        {category.parent === topLevelCategoryId && (
          <Link href={`/categories`}><BackArrowIcon/> Back</Link>
        )}
        {category.parent !== topLevelCategoryId && (
          <Link href={`/category/${category.parent}`}><BackArrowIcon/> Back</Link>
        )}
        <Title>{category.name}</Title>
      </StyledTitle>
      <CategoriesGrid colums={7} categories={categoryChildrens} disableAnimation/>
      {!!category.childrens.length && (
        <Devider/>
      )}
      {!mobile && (
        <SelectedFilters
          productsCount={productsCount}
          setProductsCount={setProductsCount} 
          category={category} 
          filterProducts={filtered => {
            setPageNumber(1)
            setProducts(filtered)
          }}
        />
      )}
      <Row>
        {showFilters && (
          <ProductFilters 
            range={priceRange} 
            setProductsCount={setProductsCount} 
            properties={properties} 
            category={category} 
            filterProducts={filtered => {
              setPageNumber(1)
              setProducts(filtered)
            }}
          />
        )}
        <div>
          <ProductsGrid products={products}/>
          {products.length < productsCount && (
            <>
              {loading ? <Spinner/> : <LoadMoreBtn onClick={LoadProducts}>Load More</LoadMoreBtn>}
            </>
          )}
        </div>
      </Row>
    </LayoutNoPreloader>
  )
}

export async function getServerSideProps(context) {
  await mongooseConnect();
  const id = context.query.id;
  const searchQuery = JSON.parse(JSON.stringify(context.query)); 
  const range = searchQuery.Range;
  const page = searchQuery.page;
  const min = range?.split('-')[0] || 0;
  const max = range?.split('-')[1] || 999999999999999;
  const limit = process.env.PRODUCTS_PER_PAGE * parseInt(page || 1);

  //delete keys that dont use in mongo search query
  delete searchQuery.id;
  delete searchQuery.Range;
  delete searchQuery.page;

  //normalize query for mongodb 
  Object.keys(searchQuery).forEach(key => {
    searchQuery['properties.'+key] = searchQuery[key].split(',');
    delete searchQuery[key];
  })

  //get main category , current category , category childrens
  const mainCategory = await Category.findOne({_id: '64bac2f697faffcc04671e3c'});
  const category = await Category.findOne({_id: id});
  const categoryChildrens = await Category.find({_id: category.childrens}, null, {sort: {order: 1}});

  // Get product IDs from all levels of categories concurrently
  const [products, productsChildrens, deepLevelProducts] = await Promise.all([
    //get products by current category id
    Product.find({category}, '_id'),
    //get products from children category
    Product.find({category: categoryChildrens}, '_id'),
    //get products from children of childrens categories LOL
    Promise.all(categoryChildrens.map(cat => {
      if (cat.childrens.length > 0) {
        return Product.find({category: cat.childrens}, '_id');
      }
    }))
  ]);
  // Combine all product IDs into one array
  const productsIds = [
    ...products.map(product => product._id),
    ...productsChildrens.map(product => product._id),
    ...deepLevelProducts.flat().map(product => product?._id)
  ];

  //get all products from ids array
  const allProducts = await Product.find({_id: {$in: productsIds}}, null, {sort: {'_id': -1}});

  // get products from ids array , searchQuery , price range , limit
  const initialProducts = await Product.find(
    {
      _id: productsIds, 
      ...searchQuery, 
      $and: [{ 
        $or: [{salePrice: {$gte: min}}, {price: {$gte: min}},] 
      },{ 
        $or: [{salePrice: {$lte: max}}, {price: {$lte: max}},] 
      }]
    }, 
    null, 
    {sort: {'_id': -1}} // sort to show latest 
  ).limit(limit); // set limit of products to show - depends on env value and page query 

  const initialCount = await Product.find(
    {
      _id: productsIds, 
      ...searchQuery, 
      $and: [{ 
        $or: [{salePrice: {$gte: min}}, {price: {$gte: min}},] 
      },{ 
        $or: [{salePrice: {$lte: max}}, {price: {$lte: max}},] 
      }]
    }, 
    null, 
    {sort: {'_id': -1}} // sort to show latest 
  ).count();

  const categoryFilters = [];

  //get filters from main category
  mainCategory.properties.forEach(property => {
    categoryFilters.push(property.name)
  })
  
  //get filters from current category
  category.properties.forEach(property => {
    categoryFilters.push(property.name)
  })
  

  // check if product include property from categories 
  // AND add this property to list that will be rendered
  let properties = {};
  allProducts.forEach(product => {
    Object.keys(product.properties).forEach(property => {
      if (!properties[property] && categoryFilters.includes(property)) {
        properties[property] = []
      }
      if (categoryFilters.includes(property) && !properties[property].includes(product.properties[property])) {
        properties[property].push(product.properties[property])
      }
    })
  })

  return {
    props: {
      category: JSON.parse(JSON.stringify(category)),
      initialProducts: JSON.parse(JSON.stringify(initialProducts)),
      allInitialProducts: JSON.parse(JSON.stringify(allProducts)),
      initialCount: initialCount || 0,
      categoryChildrens: JSON.parse(JSON.stringify(categoryChildrens)),
      properties: JSON.parse(JSON.stringify(properties)),
    }
  }
}