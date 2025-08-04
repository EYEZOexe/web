/**
 * Stripe Service
 * Handles common Stripe operations for product purchases
 */

import { stripe, formatPriceForStripe, STRIPE_CONFIG } from './config'
import { apolloClient } from '@/lib/apollo-client'
import { gql } from '@apollo/client'
import { CREATE_ORDER, CREATE_ORDER_ITEM, CREATE_LICENSE } from '@/lib/mutations'
import { GET_PRODUCT, GET_USER_BY_EMAIL } from '@/lib/queries'
import type Stripe from 'stripe'

// Types for our product data
export interface ProductForCheckout {
  id: string
  name: string
  description: string
  price: number
  currency: string
  type: 'course' | 'file' | 'license'
  metadata?: Record<string, string>
}

export interface CheckoutSessionData {
  sessionId: string
  url: string
  productId: string
  customerId?: string
}

/**
 * Create a Stripe Checkout session for a product purchase
 */
export async function createCheckoutSession(
  product: ProductForCheckout,
  customerEmail?: string,
  metadata?: Record<string, string>
): Promise<CheckoutSessionData> {
  try {
    // Create line items for the checkout session
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: product.currency.toLowerCase(),
          product_data: {
            name: product.name,
            description: product.description,
            metadata: {
              productId: product.id,
              productType: product.type,
              ...product.metadata,
            },
          },
          unit_amount: formatPriceForStripe(product.price),
        },
        quantity: 1,
      },
    ]

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      mode: STRIPE_CONFIG.mode,
      payment_method_types: [...STRIPE_CONFIG.payment_method_types],
      line_items: lineItems,
      success_url: STRIPE_CONFIG.success_url,
      cancel_url: STRIPE_CONFIG.cancel_url,
      billing_address_collection: STRIPE_CONFIG.billing_address_collection,
      customer_email: customerEmail,
      metadata: {
        productId: product.id,
        productType: product.type,
        ...metadata,
      },
      // Enable automatic tax calculation if needed
      automatic_tax: {
        enabled: false, // Set to true if you want automatic tax calculation
      },
      // Customer creation mode
      customer_creation: 'always',
    })

    if (!session.url) {
      throw new Error('Failed to create checkout session URL')
    }

    return {
      sessionId: session.id,
      url: session.url,
      productId: product.id,
      customerId: session.customer as string,
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw new Error('Failed to create checkout session')
  }
}

/**
 * Retrieve a checkout session by ID
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer'],
    })
    return session
  } catch (error) {
    console.error('Error retrieving checkout session:', error)
    throw new Error('Failed to retrieve checkout session')
  }
}

/**
 * Create or retrieve a Stripe customer
 */
export async function createOrGetCustomer(
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  try {
    // First, try to find existing customer
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0]
    }

    // Create new customer if none exists
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    })

    return customer
  } catch (error) {
    console.error('Error creating/getting customer:', error)
    throw new Error('Failed to create or retrieve customer')
  }
}

/**
 * Handle successful payment - called from webhook
 */
export async function handleSuccessfulPayment(
  session: Stripe.Checkout.Session
): Promise<{
  success: boolean
  orderId?: string
  error?: string
}> {
  try {
    // Extract product information from metadata
    const productId = session.metadata?.productId
    const productType = session.metadata?.productType
    const customerId = session.customer as string

    if (!productId || !productType) {
      throw new Error('Missing product information in session metadata')
    }

    console.log('Processing successful payment:', {
      sessionId: session.id,
      productId,
      productType,
      customerId,
      amountTotal: session.amount_total,
    })

    // Get the detailed session with line items
    const detailedSession = await getCheckoutSession(session.id)
    
    // Create order in the database
    const orderResult = await createOrderFromStripeSession(detailedSession)
    
    if (!orderResult.success) {
      throw new Error(orderResult.error || 'Failed to create order')
    }

    console.log('Successfully created order:', orderResult.orderId)
    
    return {
      success: true,
      orderId: orderResult.orderId,
    }
  } catch (error) {
    console.error('Error handling successful payment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw new Error('Invalid webhook signature')
  }
}

/**
 * Create order from successful Stripe checkout session
 */
async function createOrderFromStripeSession(
  session: Stripe.Checkout.Session
): Promise<{
  success: boolean
  orderId?: string
  error?: string
}> {
  try {
    const productId = session.metadata?.productId
    if (!productId) {
      throw new Error('Missing product ID in session metadata')
    }

    // Get product details from our database
    // First try by slug, then by ID if that fails
    let product: any = null
    try {
      const { data: productData } = await apolloClient.query({
        query: GET_PRODUCT,
        variables: { slug: productId },
      })
      product = productData?.product
    } catch (error) {
      console.warn(`Product not found by slug: ${productId}, trying by ID...`)
    }

    // If not found by slug, try a direct query by ID
    if (!product) {
      try {
        const { data: productData } = await apolloClient.query({
          query: gql`
            query GetProductById($id: ID!) {
              product(where: { id: $id }) {
                id
                name
                slug
                description
                type
                price
                downloadLimit
                accessDuration
              }
            }
          `,
          variables: { id: productId },
        })
        product = productData?.product
      } catch (error) {
        console.error('Product not found by ID either:', error)
      }
    }

    if (!product) {
      throw new Error(`Product not found: ${productId}`)
    }

    // Get customer details from Stripe
    // session.customer can be either a string ID or an expanded customer object
    let customerEmail: string | null = null
    
    if (session.customer) {
      if (typeof session.customer === 'string') {
        // Customer is a string ID, need to fetch the customer
        try {
          const customer = await stripe.customers.retrieve(session.customer)
          customerEmail = typeof customer !== 'string' && !customer.deleted ? customer.email : null
        } catch (error) {
          console.warn('Failed to retrieve customer from Stripe:', error)
        }
      } else {
        // Customer is already an expanded object
        customerEmail = !session.customer.deleted ? session.customer.email : null
      }
    }
    
    // Fallback to customer_details email if customer email not found
    if (!customerEmail) {
      customerEmail = session.customer_details?.email || null
    }

    if (!customerEmail) {
      throw new Error('Customer email not found in session or customer data')
    }

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Calculate amounts (Stripe amounts are in cents)
    const total = (session.amount_total || 0) / 100
    const subtotal = (session.amount_subtotal || session.amount_total || 0) / 100
    const tax = total - subtotal

    // Look up user by email to link the order if they have an account
    let customerData: any = {}
    try {
      const { data: userData } = await apolloClient.query({
        query: GET_USER_BY_EMAIL,
        variables: { email: customerEmail },
      })
      
      if (userData?.users && userData.users.length > 0) {
        const user = userData.users[0]
        customerData.customer = { connect: { id: user.id } }
        console.log(`Linking order to user account: ${user.email}`)
      }
    } catch (error) {
      console.warn('Failed to lookup user by email, creating guest order:', error)
    }

    // Create the order
    const { data: orderData } = await apolloClient.mutate({
      mutation: CREATE_ORDER,
      variables: {
        data: {
          orderNumber,
          status: 'completed', // Since payment was successful
          paymentStatus: 'paid',
          subtotal: subtotal.toString(),
          tax: tax.toString(),
          total: total.toString(),
          currency: session.currency?.toUpperCase() || 'USD',
          customerEmail,
          stripePaymentIntentId: session.payment_intent as string,
          ...customerData, // Include user connection if found
        }
      }
    })

    if (!orderData?.createOrder) {
      throw new Error('Failed to create order')
    }

    const order = orderData.createOrder

    // Create order item
    const { data: orderItemData } = await apolloClient.mutate({
      mutation: CREATE_ORDER_ITEM,
      variables: {
        data: {
          productName: product.name,
          unitPrice: product.price.toString(),
          quantity: 1,
          totalPrice: product.price.toString(),
          downloadLimit: product.downloadLimit,
          accessDuration: product.accessDuration,
          order: { connect: { id: order.id } },
          product: { connect: { id: product.id } },
        }
      }
    })

    if (!orderItemData?.createOrderItem) {
      throw new Error('Failed to create order item')
    }

    const orderItem = orderItemData.createOrderItem

    // Generate license key for digital products
    if (product.type !== 'physical') {
      const licenseKey = generateLicenseKey()
      
      // Calculate expiration date if access duration is set
      let expiresAt: string | null = null
      if (product.accessDuration) {
        const expirationDate = new Date()
        expirationDate.setDate(expirationDate.getDate() + product.accessDuration)
        expiresAt = expirationDate.toISOString()
      }

      // Include user connection for license if we found a user
      const licenseData: any = {
        licenseKey,
        status: 'active',
        downloadCount: 0,
        downloadLimit: product.downloadLimit,
        expiresAt,
        orderItem: { connect: { id: orderItem.id } },
      }

      // Add user connection if available
      if (customerData.customer) {
        licenseData.user = customerData.customer
      }

      await apolloClient.mutate({
        mutation: CREATE_LICENSE,
        variables: { data: licenseData }
      })
    }

    console.log(`Order created successfully: ${order.orderNumber}`)
    
    return {
      success: true,
      orderId: order.id,
    }
  } catch (error) {
    console.error('Error creating order from Stripe session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate a unique license key
 */
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segments = 4
  const segmentLength = 4
  
  const key = Array(segments)
    .fill(0)
    .map(() => 
      Array(segmentLength)
        .fill(0)
        .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
        .join('')
    )
    .join('-')
    
  return key
}
