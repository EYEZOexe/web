import { gql } from '@apollo/client'

export const GET_PRODUCTS = gql`
  query GetProducts($take: Int, $skip: Int) {
    products(take: $take, skip: $skip) {
      id
      name
      description
      price
      status
      createdAt
      updatedAt
      category {
        id
        name
      }
    }
  }
`

export const GET_PRODUCT = gql`
  query GetProduct($id: ID!) {
    product(where: { id: $id }) {
      id
      name
      description
      price
      status
      createdAt
      updatedAt
      category {
        id
        name
      }
      productFiles {
        id
        file {
          filename
          url
        }
      }
      productVariants {
        id
        name
        price
        sku
      }
    }
  }
`

export const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      id
      name
      description
      status
    }
  }
`
