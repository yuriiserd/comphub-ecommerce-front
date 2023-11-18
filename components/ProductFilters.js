import { primary } from "@/lib/colors"
import axios from "axios"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import styled from "styled-components"
import Range from "./Range"
import { useDispatch, useSelector } from "react-redux"
import { selectFilters, updateFilters } from "@/slices/filtersSlice"
import useUpdateFilters from "@/hooks/useUpdateFilters"

const StyledFilters = styled.div`
  background-color: #f4f4f4;
  border-radius: 1rem;
  padding: 1rem;
  h4 {
    margin-bottom: 0.5rem;
    color: ${primary};
    font-size: 1.2rem;
  }
`
const Filter = styled.div`
  position: relative;
  padding-bottom: 1rem;
`
const Checkbox = styled.div`
  display: flex;
  label {
    position: relative;
    cursor: pointer;
    padding-left: 1.3rem;
  }
  label::before,
  label::after {
    transition: all 0.1s;
  }
  label::before {
    content: '';
    position: absolute;
    width: 0.7rem;
    border-radius: 0.15rem;
    height: 0.7rem;
    border: 1px solid ${primary};
    left: 0.1rem;
    top: 50%;
    transform: translateY(-50%);
  }
  label::after {
    content: '';
    opacity: 0;
    position: absolute;
    width: 0.2rem;
    height: 0.4rem;
    border-radius: 0.01rem;
    border-bottom: 0.15rem solid #fff;
    border-right: 0.15rem solid #fff;
    left: 0.35rem;
    top: 45%;
    transform: translateY(-50%) rotate(35deg);
  }
  input {
    display: none;
    &:checked + label::before {
      background: ${primary};
    } 
    &:checked + label::after {
      opacity: 1;
    }
    &:checked + label {
      color: ${primary}
    }
  }
`
const MoreBtn = styled.button`
  border: none;
  background: none;
  position: absolute;
  right: 0;
  bottom: -0.5rem;
  padding: 0.5rem;
  opacity: 0.7;
  cursor: pointer;
`

export default function ProductFilters({properties, range, category, filterProducts, setProductsCount}) {

  
  const [categoryName, setCategoryName] = useState('')
  const [allFilters, setAllFilters] = useState({});
  const [selectedFilters, setSelectedFilters] = useState({});

  const router = useRouter();

  const dispatch = useDispatch()
  const filtersState = useSelector(selectFilters);

  useEffect(() => {
    setCategoryName(category.name);
    setSelectedFilters(filtersState);
  },[category, filtersState])

  useEffect(() => {

    Object.keys(properties).forEach(property => {
      setAllFilters(filters => {
        const arr = properties[property];
        let updatedFilter = {}
        if (arr.length > 10) {
          updatedFilter = {main: arr.slice(0, 10), other: arr.slice(10, arr.length), hidden: true};
        } else {
          updatedFilter = {main: arr, hidden: false};
        }
        return {
          ...filters,
          [property]: updatedFilter
        }
      })
    }) 
    
  },[categoryName])
  //TODO why i use categoryName instead of just category - check if it works with category
 
  function showOthers(filter) {
    setAllFilters(old => {
      const updatedFilter = {
        ...old[filter],
        hidden: false
      }
      return {
        ...old,
        [filter]: updatedFilter
      }
    })
  }

  async function runFilter(filter, item) {
    
    const filters = useUpdateFilters(selectedFilters, filter, item);

    const queryFilters = {};

    Object.keys(filters).forEach(key => { //key is a filter name
      if (filters[key].length > 1) {
        queryFilters[key] = filters[key].join(',')
      } else {
        queryFilters[key] = filters[key][0]
      }
    })
    
    setSelectedFilters(filters);
    dispatch(updateFilters(filters))

    console.log(filters)
    console.log(queryFilters)

    router.push({
      
      pathname: '/category/' + category._id, 
      query: {
        ...queryFilters,
      }
    },
    undefined,
    { shallow: true },
    )

    const products = await axios.post('/api/products/', {query: queryFilters, category})
    const allProductsCount = await axios.post('/api/products/', {query: queryFilters, category, all: true})

    filterProducts(products.data);
    setProductsCount(allProductsCount.data)
  } 

  return (
    <StyledFilters>
      <Filter>
        <h4>Price</h4>
        <Range range={range} filter={runFilter}/>
      </Filter>
      {Object.keys(allFilters).map(filter => (
        <Filter key={filter}>
          <h4>{filter}</h4>
          {allFilters[filter].main.map((item, i) => {
            let checked = false;
            if (!!selectedFilters[filter]?.length) {
              checked = selectedFilters[filter].includes(item);
            } 
            // const checked = false;
            return (
              <Checkbox key={item + i}>
                <input type="checkbox" checked={checked} onChange={() => runFilter(filter, item)} id={item + i}/>
                <label htmlFor={item + i}>{item}</label>
              </Checkbox>
            )
          })} 
          {!allFilters[filter].hidden && allFilters[filter]?.other && allFilters[filter].other.map((item, i) => {
            let checked = false;
            if (selectedFilters[filter]) {
              checked = selectedFilters[filter].includes(item);
            } 
            return (
              <Checkbox key={item}>
                <input type="checkbox" checked={checked} onChange={() => runFilter(filter, item)} id={item + i}/>
                <label htmlFor={item}>{item}</label>
              </Checkbox>
            )
          })}
          {allFilters[filter].hidden && (
            <MoreBtn onClick={() => showOthers(filter)}>show more</MoreBtn>
          )}
        </Filter>
      ))}
      
    </StyledFilters>
  )
}