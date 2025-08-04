import { gql } from '@apollo/client'

// Test query to check API connection
export const TEST_CONNECTION = gql`
  query TestConnection {
    users(take: 1) {
      id
      name
      email
    }
  }
`

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
    products(take: $limit, where: { status: { equals: active } }) {
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
          { status: { equals: active } }
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

// ======================
// USER DASHBOARD QUERIES
// ======================

// Get user profile with basic information
export const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: ID!) {
    user(where: { id: $userId }) {
      id
      name
      email
      role
      isActive
      bio
      avatar {
        id
        filesize
        width
        height
        extension
        url
      }
      createdAt
      updatedAt
    }
  }
`

// Get user's orders with detailed information
export const GET_USER_ORDERS = gql`
  query GetUserOrders($userId: ID!) {
    orders(
      where: { customer: { id: { equals: $userId } } }
      orderBy: { createdAt: desc }
    ) {
      id
      orderNumber
      status
      paymentStatus
      subtotal
      tax
      total
      currency
      customerEmail
      stripePaymentIntentId
      orderItems {
        id
        productName
        variantName
        unitPrice
        quantity
        totalPrice
        downloadLimit
        accessDuration
        product {
          id
          name
          slug
          type
          featuredImage {
            url
          }
        }
        license {
          id
          licenseKey
          status
          downloadCount
          downloadLimit
          expiresAt
          lastAccessedAt
        }
      }
      createdAt
      updatedAt
    }
  }
`

// Get user's licenses and access rights
export const GET_USER_LICENSES = gql`
  query GetUserLicenses($userId: ID!) {
    licenses(
      where: { user: { id: { equals: $userId } } }
      orderBy: { createdAt: desc }
    ) {
      id
      licenseKey
      status
      downloadCount
      downloadLimit
      expiresAt
      lastAccessedAt
      orderItem {
        id
        productName
        variantName
        product {
          id
          name
          slug
          type
          description
          featuredImage {
            url
          }
          files {
            id
            name
            description
            fileSize
            mimeType
            isPublic
          }
        }
      }
      downloads {
        id
        fileName
        fileSize
        status
        createdAt
      }
      createdAt
    }
  }
`

// Get user's download history
export const GET_USER_DOWNLOADS = gql`
  query GetUserDownloads($userId: ID!) {
    downloads(
      where: { license: { user: { id: { equals: $userId } } } }
      orderBy: { createdAt: desc }
    ) {
      id
      fileName
      fileSize
      status
      ipAddress
      license {
        licenseKey
        orderItem {
          productName
          product {
            name
            slug
          }
        }
      }
      productFile {
        id
        name
        description
        mimeType
      }
      createdAt
    }
  }
`

// Get user statistics for dashboard
export const GET_USER_DASHBOARD_STATS = gql`
  query GetUserDashboardStats($userId: ID!) {
    user(where: { id: $userId }) {
      id
      name
      email
      orders(where: { status: { not: { equals: cancelled } } }) {
        id
        total
        status
        createdAt
      }
      licenses {
        id
        status
        expiresAt
      }
    }
  }
`

// Query to find user by email for order linking
export const GET_USER_BY_EMAIL = gql`
  query GetUserByEmail($email: String!) {
    users(where: { email: { equals: $email } }, take: 1) {
      id
      email
      name
    }
  }
`
