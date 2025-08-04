/**
 * Stripe Webhook Handler
 * Processes Stripe webhook events for payment processing
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verifyWebhookSignature, handleSuccessfulPayment } from '@/lib/stripe/service'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // Get the request body and signature
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = verifyWebhookSignature(body, signature, webhookSecret)
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Log the event for debugging
    console.log(`Received Stripe webhook: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Checkout session completed:', session.id)

        // Handle successful payment
        const result = await handleSuccessfulPayment(session)
        if (!result.success) {
          console.error('Failed to process successful payment:', result.error)
          // Don't return error to Stripe - we got the event successfully
          // Log the error for manual review
        } else {
          console.log('Successfully processed payment for order:', result.orderId)
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment intent succeeded:', paymentIntent.id)
        // Additional payment processing logic can go here
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment intent failed:', paymentIntent.id)
        // Handle failed payment logic
        break
      }

      case 'payment_intent.created': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment intent created:', paymentIntent.id)
        // Log payment intent creation for tracking
        break
      }

      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge
        console.log('Charge succeeded:', charge.id)
        // Additional charge processing logic can go here
        break
      }

      case 'charge.updated': {
        const charge = event.data.object as Stripe.Charge
        console.log('Charge updated:', charge.id)
        // Handle charge updates (e.g., dispute status changes)
        break
      }

      case 'customer.created': {
        const customer = event.data.object as Stripe.Customer
        console.log('Customer created:', customer.id)
        // Sync customer creation with our database if needed
        break
      }

      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer
        console.log('Customer updated:', customer.id)
        // Sync customer updates with our database if needed
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`Subscription ${event.type}:`, subscription.id)
        // Handle subscription events for future subscription features
        break
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`Invoice ${event.type}:`, invoice.id)
        // Handle invoice events for future subscription features
        break
      }

      default: {
        console.log(`Unhandled event type: ${event.type}`)
        // For unhandled events, still return success to acknowledge receipt
        break
      }
    }

    // Always return success to acknowledge receipt of the webhook
    return NextResponse.json({
      success: true,
      received: true,
      eventType: event.type,
    })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// Disable body parsing for webhooks (we need the raw body)
export const dynamic = 'force-dynamic'

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. This endpoint only accepts POST requests from Stripe webhooks.' },
    { status: 405 }
  )
}
