import CategoriesGrid from "@/components/CategoriesGrid";
import Container from "@/components/Container";
import Header from "@/components/Header";
import ProductFilters from "@/components/ProductFilters";
import ProductsGrid from "@/components/ProductsGrid";
import Title from "@/components/Title";
import BackArrowIcon from "@/components/icons/BackArrowIcon";
import { primaryLight, url } from "@/lib/colors";
import { mongooseConnect } from "@/lib/mongoose";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";

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
`

export default function CategoryPage({category, initialProducts, categoryChildrens, properties}) {


  const [products, setProducts] = useState([]);
  const topLevelCategoryId = '64bac2f697faffcc04671e3c';

  useEffect(() => {
    setProducts(initialProducts)
  }, [category])

  return (
    <>
      <Header/>
      <Container>
        <StyledTitle>
          {category.parent === topLevelCategoryId && (
            <Link href={`/categories`}><BackArrowIcon/> Back</Link>
          )}
          {category.parent !== topLevelCategoryId && (
            <Link href={`/category/${category.parent}`}><BackArrowIcon/> Back</Link>
          )}
          <Title>{category.name}</Title>
        </StyledTitle>
        <CategoriesGrid colums={7} categories={categoryChildrens}/>
        {!!category.childrens.length && (
          <Devider/>
        )}
        <Row>
          <ProductFilters properties={properties} category={category} filterProducts={filtered => setProducts(filtered)}/>
          <ProductsGrid products={products}/>
        </Row>
      </Container>
    </>
  )
}

export async function getServerSideProps(context) {
  await mongooseConnect();
  const id = context.query.id;
  const searchQuery = context.query;
  delete searchQuery.id;
  console.log(searchQuery)
  Object.keys(searchQuery).forEach(key => {
    searchQuery['properties.'+key] = searchQuery[key].split(',')
    delete searchQuery[key];
  })
  console.log(searchQuery)

  const mainCategory = await Category.findOne({_id: '64bac2f697faffcc04671e3c'});
  const category = await Category.findOne({_id: id});
  // const parentCategory = await Category.findOne({_id: category.parent});
  const categoryChildrens = await Category.find({_id: category.childrens}, null, {sort: {order: 1}});

  const productsIds = [];

  const products = await Product.find({category});
  products.forEach(product => {
    productsIds.push(product._id)
  })

  const productsChildrens = await Product.find({category: categoryChildrens});
  productsChildrens.forEach(product => {
    productsIds.push(product._id);
  })

  await Promise.all(categoryChildrens.map(async cat => {
    if (cat.childrens.length > 0) {
      const deepLevelProducts = await Product.find({category: cat.childrens});
      deepLevelProducts.forEach(product => {
        productsIds.push(product._id);
      })
    }
  }))

  // properties: {$elemMatch: searchQuery}

  const allProducts = await Product.find({_id: productsIds, ...searchQuery}, null, {sort: {'_id': -1}});

  const categoryFilters = [];

  mainCategory.properties.forEach(property => {
    categoryFilters.push(property.name)
  })
  
  category.properties.forEach(property => {
    categoryFilters.push(property.name)
  })
  
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
      initialProducts: JSON.parse(JSON.stringify(allProducts)),
      categoryChildrens: JSON.parse(JSON.stringify(categoryChildrens)),
      properties,
    }
  }
}