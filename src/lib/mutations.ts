import { gql } from '@apollo/client'

// ======================
// ORDER MUTATIONS
// ======================

export const CREATE_ORDER = gql`
  mutation CreateOrder($data: OrderCreateInput!) {
    createOrder(data: $data) {
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
      stripeChargeId
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
        }
      }
      customer {
        id
        name
        email
      }
      createdAt
      updatedAt
    }
  }
`

export const CREATE_ORDER_ITEM = gql`
  mutation CreateOrderItem($data: OrderItemCreateInput!) {
    createOrderItem(data: $data) {
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
        type
      }
      order {
        id
        orderNumber
      }
      createdAt
    }
  }
`

export const CREATE_LICENSE = gql`
  mutation CreateLicense($data: LicenseCreateInput!) {
    createLicense(data: $data) {
      id
      licenseKey
      status
      downloadCount
      downloadLimit
      expiresAt
      user {
        id
        email
      }
      orderItem {
        id
        productName
        product {
          id
          name
          type
        }
      }
      createdAt
    }
  }
`

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: ID!, $status: String!, $paymentStatus: String) {
    updateOrder(
      where: { id: $id }
      data: { 
        status: $status
        paymentStatus: $paymentStatus
        updatedAt: { kind: "now" }
      }
    ) {
      id
      orderNumber
      status
      paymentStatus
      total
      customerEmail
      updatedAt
    }
  }
`

// ======================
// USER MUTATIONS  
// ======================

export const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile($userId: ID!, $data: UserUpdateInput!) {
    updateUser(where: { id: $userId }, data: $data) {
      id
      name
      email
      bio
      avatar {
        id
        url
      }
      updatedAt
    }
  }
`
