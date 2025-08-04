#!/usr/bin/env ts-node
/**
 * Test script to verify Stripe integration works end-to-end
 * This will help us validate that purchases actually create orders in the database
 */

import { stripe } from './lib/stripe/config'
import { apolloClient } from './lib/apollo-client'
import { gql } from '@apollo/client'

// Test customer data
const TEST_CUSTOMER_EMAIL = 'test@example.com'
const TEST_PRODUCT_SLUG = 'premium-course' // Update this to match an actual product in your DB

const GET_ORDERS = gql`
  query GetOrders($email: String!) {
    orders(where: { customerEmail: { equals: $email } }) {
      id
      orderNumber
      status
      total
      customerEmail
      createdAt
      items {
        id
        productName
        unitPrice
        quantity
        totalPrice
      }
      licenses {
        id
        licenseKey
        status
        downloadCount
        downloadLimit
        expiresAt
      }
    }
  }
`

async function testStripeIntegration() {
  console.log('🧪 Testing Stripe Integration...\n')
  
  try {
    console.log('1. Checking existing orders for test customer...')
    const { data: beforeData } = await apolloClient.query({
      query: GET_ORDERS,
      variables: { email: TEST_CUSTOMER_EMAIL },
      fetchPolicy: 'network-only'
    })
    
    console.log(`   Found ${beforeData.orders.length} existing orders`)
    
    console.log('\n2. Creating a test Stripe payment session...')
    
    // This would normally be done by your frontend
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 2999, // $29.99
      currency: 'usd',
      metadata: {
        productId: TEST_PRODUCT_SLUG,
        customerEmail: TEST_CUSTOMER_EMAIL,
      },
    })
    
    console.log(`   Created payment intent: ${paymentIntent.id}`)
    
    // Simulate successful payment by confirming with test card
    const confirmedPayment = await stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: 'pm_card_visa', // Test card
      return_url: 'https://example.com/return',
    })
    
    console.log(`   Payment status: ${confirmedPayment.status}`)
    
    if (confirmedPayment.status === 'succeeded') {
      console.log('\n3. Simulating webhook processing...')
      
      // Note: In a real scenario, Stripe would send a webhook to your endpoint
      // For testing, we'd need to manually trigger our webhook handler
      // or create the order directly using our service function
      
      console.log('   ⚠️  To complete this test, you would need to:')
      console.log('   - Make a real test purchase through your Stripe checkout')
      console.log('   - Or trigger the webhook endpoint manually')
      console.log('   - Then check if orders appear in the database')
      
      console.log('\n4. Checking for new orders...')
      // Wait a moment for any async processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const { data: afterData } = await apolloClient.query({
        query: GET_ORDERS,
        variables: { email: TEST_CUSTOMER_EMAIL },
        fetchPolicy: 'network-only'
      })
      
      console.log(`   Now found ${afterData.orders.length} orders`)
      
      if (afterData.orders.length > beforeData.orders.length) {
        console.log('   ✅ New order detected!')
        const newOrder = afterData.orders[afterData.orders.length - 1]
        console.log(`   Order Number: ${newOrder.orderNumber}`)
        console.log(`   Status: ${newOrder.status}`)
        console.log(`   Total: $${(parseInt(newOrder.total) / 100).toFixed(2)}`)
        console.log(`   Items: ${newOrder.items.length}`)
        console.log(`   Licenses: ${newOrder.licenses.length}`)
      } else {
        console.log('   ⚠️  No new orders found - webhook might not be processing')
      }
    }
    
    console.log('\n✅ Test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Instructions for manual testing
console.log(`
🔧 MANUAL TESTING INSTRUCTIONS:

1. Start your development server:
   npm run dev

2. Create a test product in your database with slug: "${TEST_PRODUCT_SLUG}"

3. Go to your Stripe checkout page and make a test purchase using:
   - Card: 4242 4242 4242 4242
   - Exp: Any future date
   - CVC: Any 3 digits
   - Email: ${TEST_CUSTOMER_EMAIL}

4. Check your webhook logs to see if the order was created

5. Run this query in your GraphQL playground to verify:
   query {
     orders(where: { customerEmail: { equals: "${TEST_CUSTOMER_EMAIL}" } }) {
       id
       orderNumber
       status
       total
       items { productName }
       licenses { licenseKey }
     }
   }

🚀 If you see orders and licenses created, the integration is working!
`)

// Run the test if this file is executed directly
if (require.main === module) {
  testStripeIntegration()
}

export { testStripeIntegration }
