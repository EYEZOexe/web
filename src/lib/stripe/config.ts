/**
 * Stripe Configuration
 * Handles Stripe client and server-side setup
 */

import { loadStripe, Stripe } from '@stripe/stripe-js'
import StripeServer from 'stripe'

// Client-side Stripe instance (browser)
let stripePromise: Promise<Stripe | null>

export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    
    if (!publishableKey) {
      throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable')
    }
    
    stripePromise = loadStripe(publishableKey)
  }
  
  return stripePromise
}

// Server-side Stripe instance (API routes)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

// Only warn in development and when not during build process
if (!stripeSecretKey && typeof window === 'undefined' && 
    process.env.NODE_ENV === 'development' && 
    !process.env.VERCEL && !process.env.CI) {
  console.warn('STRIPE_SECRET_KEY not found - Stripe functionality will be limited')
}

export const stripe = new StripeServer(
  stripeSecretKey || 'sk_test_placeholder',
  {
    apiVersion: '2025-07-30.basil',
    typescript: true,
  }
)

// Stripe configuration constants
export const STRIPE_CONFIG = {
  currency: 'usd',
  payment_method_types: ['card'] as const,
  mode: 'payment' as const,
  success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/cancel`,
  billing_address_collection: 'required' as const,
  shipping_address_collection: {
    allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH'],
  },
} as const

// Helper function to format price for Stripe (cents)
export const formatPriceForStripe = (price: number): number => {
  return Math.round(price * 100)
}

// Helper function to format price for display
export const formatPriceForDisplay = (priceInCents: number): string => {
  return (priceInCents / 100).toFixed(2)
}

// Webhook configuration
export const STRIPE_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
] as const

export type StripeWebhookEvent = typeof STRIPE_WEBHOOK_EVENTS[number]
