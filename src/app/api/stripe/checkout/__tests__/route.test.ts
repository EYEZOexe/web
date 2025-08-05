import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { NextRequest } from 'next/server'

// Mock NextAuth auth function
const mockAuth = vi.fn()
vi.mock('@/auth', () => ({
  auth: mockAuth
}))

// Mock the Stripe service entirely
const mockCreateCheckoutSession = vi.fn()
vi.mock('@/lib/stripe/service', () => ({
  createCheckoutSession: mockCreateCheckoutSession
}))

// Mock environment variables
vi.mock('@/lib/env', () => ({
  env: {
    STRIPE_SECRET_KEY: 'sk_test_fake_key',
    NEXTAUTH_URL: 'http://localhost:3000'
  }
}))

describe('/api/stripe/checkout', () => {
  let POST: any
  const originalConsoleError = console.error

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Suppress console.error for all tests since we're testing error conditions
    console.error = vi.fn()
    
    // Mock successful auth by default
    mockAuth.mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER'
      },
      expires: '2024-12-31T23:59:59.000Z'
    })
    
    // Dynamically import the route after mocks are set up
    const routeModule = await import('../route')
    POST = routeModule.POST
  })

  afterAll(() => {
    // Restore console.error after all tests
    console.error = originalConsoleError
  })

  it('creates checkout session successfully', async () => {
    const mockResult = {
      sessionId: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123',
      productId: 'prod_123'
    }
    mockCreateCheckoutSession.mockResolvedValue(mockResult)

    const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_123',
        productName: 'Test Product',
        productDescription: 'Test product description',
        productType: 'file',
        price: 2999
      })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.data.url).toBe('https://checkout.stripe.com/pay/cs_test_123')
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'prod_123',
        name: 'Test Product',
        description: 'Test product description',
        type: 'file',
        price: 2999,
        currency: 'USD'
      }),
      'test@example.com',
      undefined
    )
  })

  it('handles missing required fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_123'
        // Missing required fields
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('handles Stripe errors', async () => {
    mockCreateCheckoutSession.mockRejectedValue(new Error('Stripe API error'))

    const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_123',
        productName: 'Test Product',
        productDescription: 'Test product description',
        productType: 'file',
        price: 2999
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })

  it('validates price format', async () => {
    const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_123',
        productName: 'Test Product',
        productDescription: 'Test product description',
        productType: 'file',
        price: 'invalid_price'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
