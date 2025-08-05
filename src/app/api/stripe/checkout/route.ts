/**
 * Stripe Checkout API Route
 * Creates a checkout session for product purchases
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { createCheckoutSession } from '@/lib/stripe/service'
import type { ProductForCheckout } from '@/lib/stripe/service'

// Validation schema for checkout request
const CheckoutRequestSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  productName: z.string().min(1, 'Product name is required'),
  productDescription: z.string().min(1, 'Product description is required'),
  price: z.number().positive('Price must be positive'),
  currency: z.string().default('USD'),
  productType: z.enum(['course', 'file', 'license']),
  customerEmail: z.string().email('Valid email is required').optional(),
  metadata: z.record(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Get user session to auto-populate email
    const session = await auth()
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = CheckoutRequestSchema.parse(body)

    // Use session email as default if user is logged in and no email provided
    const customerEmail = validatedData.customerEmail || session?.user?.email || undefined

    // Prepare product data for Stripe
    const productForCheckout: ProductForCheckout = {
      id: validatedData.productId,
      name: validatedData.productName,
      description: validatedData.productDescription,
      price: validatedData.price,
      currency: validatedData.currency,
      type: validatedData.productType,
      metadata: validatedData.metadata,
    }

    // Create checkout session
    const checkoutData = await createCheckoutSession(
      productForCheckout,
      customerEmail,
      validatedData.metadata
    )

    return NextResponse.json({
      success: true,
      data: checkoutData,
    })
  } catch (error) {
    console.error('Checkout API error:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
