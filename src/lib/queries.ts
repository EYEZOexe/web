import { gql } from '@apollo/client'

// Enhanced product queries with variants and categories
export const GET_PRODUCTS = gql`
  query GetProducts {
    products {
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
  query GetProduct($slug: String!) {
    product(where: { slug: $slug }) {
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
      files {
        id
        name
        description
        fileSize
        mimeType
        isPublic
        sortOrder
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
      isActive
      sortOrder
      products {
        id
        name
        slug
        type
        status
        price
        compareAtPrice
        currency
      }
    }
  }
`

export const GET_CATEGORY_WITH_PRODUCTS = gql`
  query GetCategoryWithProducts($slug: String!) {
    category(where: { slug: $slug }) {
      id
      name
      slug
      description
      isActive
      products {
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
        variants {
          id
          name
          price
          isActive
        }
        createdAt
      }
    }
  }
`

export const GET_FEATURED_PRODUCTS = gql`
  query GetFeaturedProducts($limit: Int = 6) {
    products(take: $limit, where: { status: { equals: "active" } }) {
      id
      name
      slug
      description
      type
      price
      compareAtPrice
      currency
      tags
      category {
        id
        name
        slug
      }
      variants {
        id
        name
        price
        isActive
      }
    }
  }
`

// Search products by name or tags
export const SEARCH_PRODUCTS = gql`
  query SearchProducts($searchTerm: String!) {
    products(
      where: {
        AND: [
          { status: { equals: "active" } }
          {
            OR: [
              { name: { contains: $searchTerm, mode: insensitive } }
              { description: { contains: $searchTerm, mode: insensitive } }
              { tags: { contains: $searchTerm, mode: insensitive } }
            ]
          }
        ]
      }
    ) {
      id
      name
      slug
      description
      type
      price
      compareAtPrice
      currency
      category {
        name
        slug
      }
    }
  }
`
