import { gql } from '@apollo/client'

export const GET_PRODUCTS = gql`
  query GetProducts($take: Int, $skip: Int) {
    products(take: $take, skip: $skip) {
      id
      name
      slug
      description
      type
      status
      price
      compareAtPrice
      currency
      tags
      downloadLimit
      accessDuration
      metaTitle
      metaDescription
      category {
        id
        name
        slug
        description
      }
      variants {
        id
        name
        price
        compareAtPrice
        downloadLimit
        accessDuration
        isActive
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_PRODUCT = gql`
  query GetProduct($id: ID!) {
    product(where: { id: $id }) {
      id
      name
      slug
      description
      type
      status
      price
      compareAtPrice
      currency
      tags
      downloadLimit
      accessDuration
      metaTitle
      metaDescription
      category {
        id
        name
        slug
        description
      }
      files {
        id
        file {
          filename
          url
        }
      }
      variants {
        id
        name
        price
        compareAtPrice
        downloadLimit
        accessDuration
        isActive
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      id
      name
      slug
      description
      status
      createdAt
      updatedAt
    }
  }
`

export const GET_PRODUCT_VARIANTS = gql`
  query GetProductVariants($where: ProductVariantWhereInput, $take: Int, $skip: Int) {
    productVariants(where: $where, take: $take, skip: $skip) {
      id
      name
      price
      compareAtPrice
      downloadLimit
      accessDuration
      isActive
      sku
      product {
        id
        name
        slug
      }
      createdAt
      updatedAt
    }
  }
`
