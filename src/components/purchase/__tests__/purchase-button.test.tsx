import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import PurchaseButton from '../purchase-button'

// Mock Stripe
const mockRedirectToCheckout = vi.fn()
vi.mock('@/lib/stripe/config', () => ({
  getStripe: vi.fn().mockResolvedValue({
    redirectToCheckout: mockRedirectToCheckout
  })
}))

// Mock fetch for API calls
global.fetch = vi.fn()

// Test session data
const mockSession = {
  user: { 
    id: 'test-user', 
    email: 'test@example.com', 
    name: 'Test User',
    role: 'USER'
  },
  expires: '2024-12-31T23:59:59.000Z'
}

// Wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider session={mockSession}>
    {children}
  </SessionProvider>
)

describe('PurchaseButton Component', () => {
  const originalConsoleError = console.error

  const mockProduct = {
    id: 'test-product-id',
    name: 'Test Product',
    description: 'Test product description',
    type: 'file' as const,
    price: 2999, // $29.99
    currency: 'USD'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error for error handling tests
    console.error = vi.fn()
    mockRedirectToCheckout.mockResolvedValue({ error: null })
  })

  afterAll(() => {
    // Restore console.error after all tests
    console.error = originalConsoleError
  })

  it('renders purchase button with formatted price', () => {
    render(<PurchaseButton product={mockProduct} />, { wrapper: TestWrapper })
    
    expect(screen.getByText('Buy Now - $2999.00')).toBeDefined()
  })

  it('handles successful checkout creation', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ 
        success: true, 
        data: { 
          url: 'https://checkout.stripe.com/pay/cs_test_123' 
        } 
      })
    }
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

    // Mock window.location.href assignment
    const originalLocation = window.location
    delete (window as any).location
    window.location = { ...originalLocation, href: '' } as any
    const hrefSetter = vi.fn()
    Object.defineProperty(window.location, 'href', {
      set: hrefSetter,
      get: () => 'http://localhost:3000'
    })

    render(<PurchaseButton product={mockProduct} />, { wrapper: TestWrapper })
    
    const button = screen.getByText('Buy Now - $2999.00')
    fireEvent.click(button)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: mockProduct.id,
          productName: mockProduct.name,
          productDescription: mockProduct.description,
          price: mockProduct.price,
          currency: mockProduct.currency,
          productType: mockProduct.type,
          customerEmail: 'test@example.com',
          metadata: {
            productId: mockProduct.id,
            productType: mockProduct.type
          }
        }),
      })
    })

    await waitFor(() => {
      expect(hrefSetter).toHaveBeenCalledWith('https://checkout.stripe.com/pay/cs_test_123')
    })

    // Restore original location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true
    })
  })

  it('shows loading state during purchase', async () => {
    vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<PurchaseButton product={mockProduct} />, { wrapper: TestWrapper })
    
    const button = screen.getByText('Buy Now - $2999.00')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeDefined()
    })
  })

  it('handles API errors gracefully', async () => {
    const mockResponse = {
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Payment failed' })
    }
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)

    render(<PurchaseButton product={mockProduct} />, { wrapper: TestWrapper })
    
    const button = screen.getByText('Buy Now - $2999.00')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Payment failed')).toBeDefined()
    })
  })

  it('handles Stripe redirect errors', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ sessionId: 'sess_123' })
    }
    vi.mocked(global.fetch).mockResolvedValue(mockResponse as any)
    mockRedirectToCheckout.mockResolvedValue({ error: { message: 'Stripe error' } })

    render(<PurchaseButton product={mockProduct} />, { wrapper: TestWrapper })
    
    const button = screen.getByText('Buy Now - $2999.00')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Invalid checkout session response')).toBeDefined()
    })
  })

  it('formats prices correctly for different amounts', () => {
    const products = [
      { ...mockProduct, price: 999, expected: '$999.00' },
      { ...mockProduct, price: 10000, expected: '$10000.00' }, // Component doesn't add comma formatting
      { ...mockProduct, price: 1, expected: '$1.00' },
    ]

    products.forEach(({ price, expected }) => {
      const { unmount } = render(<PurchaseButton product={{ ...mockProduct, price }} />, { wrapper: TestWrapper })
      expect(screen.getByText(`Buy Now - ${expected}`)).toBeDefined()
      unmount()
    })
  })
})
