import styled from "styled-components"
import HeartIcon from "./icons/HeartIcon"
import { useContext, useState } from "react"
import Button from "./Button";
import Image from "next/image";
import Link from "next/link";
import CartIcon from "./icons/CartIcon";
import { CartContext } from "./CartContext";

export default function ProductCard({product}) {

  const [liked, setLiked] = useState(false);

  const {addToCart} = useContext(CartContext);

  const StyledCard = styled(Link)`
    background-color: #ffffff;
    padding: 20px;
    position: relative;
    border: 1px solid #e9e9e9;
    border-radius: 1rem;
    transition: box-shadow 0.3s;
    box-shadow: 0px 14px 0px rgba(71, 82, 94, 0);
    color: #000;
    text-decoration: none;
    img {
      display: block;
      margin: 0 auto 1rem;
      object-fit: contain;
      max-height: 150px;
      transition: all 0.4s;
      scale: 1;
    }
    &:hover {
      box-shadow: 0px 14px 34px rgba(71, 82, 94, 0.21);
      img {
        scale: 1.05;
      }
    }
    h3 {
      text-align: center;
      margin-bottom: 1rem;
    }
    
    button {
      position: absolute;
      left: 1rem;
      top: 1rem;
      z-index: 2;
      margin-right: 0;
    }
    svg {
      width: 25px;
    }
    div {
      display: flex;
      justify-content: space-between;
      align-items: center;
      button {
        position: static;
      }
    }
  `
  const StyledPrice = styled.p`
    font-size: 1.3rem;
    margin-right: 0.5rem;
    ${product.salePrice && `
      color: #797878;
      text-decoration: line-through;
    `}
  `
  const StyledSalePrice = styled.p`
    font-size: 1.3rem;
    margin-right: auto;
    color: #f84147;
  `

  return (
    <StyledCard href={`/product/${product._id}`}>
      <Button $white $icon onClick={(event) => {
        event.preventDefault();
        setLiked(!liked);
      }}>
        <HeartIcon liked={liked} />
      </Button>
      <Image src={product.images[0]} width={300} height={200}/>
      <h3>{product.title}</h3>
      <div>
        
        <StyledPrice>{product.price}$</StyledPrice>
        {product.salePrice && (
          <StyledSalePrice>{product.salePrice}$</StyledSalePrice>
        )}
        <Button $white $icon onClick={(event) => {
          event.preventDefault();
          addToCart(product._id);
        }}>
          <CartIcon liked={liked} />
        </Button>
      </div>
    </StyledCard>
  )
}