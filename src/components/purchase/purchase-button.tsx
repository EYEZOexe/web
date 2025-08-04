/**
 * Purchase Button Component
 * Handles Stripe checkout initiation for products
 */

'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  price: number | string  // Can be number or string from GraphQL
  currency: string
  type: 'course' | 'file' | 'license'
}

interface PurchaseButtonProps {
  product: Product
  customerEmail?: string
  className?: string
  children?: React.ReactNode
}

// Helper function to safely format price
const formatPrice = (price: number | string): number => {
  if (typeof price === 'number') {
    return price
  }
  if (typeof price === 'string') {
    const parsed = parseFloat(price)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

export default function PurchaseButton({ 
  product, 
  customerEmail, 
  className = '',
  children 
}: PurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePurchase = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Call our checkout API
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          productDescription: product.description,
          price: formatPrice(product.price),
          currency: product.currency,
          productType: product.type,
          customerEmail,
          metadata: {
            productId: product.id,
            productType: product.type,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (!data.success || !data.data?.url) {
        throw new Error('Invalid checkout session response')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.data.url
    } catch (err) {
      console.error('Purchase error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const defaultClassName = `
    w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
    text-white font-medium py-3 px-4 rounded-lg 
    transition-colors duration-200 
    flex items-center justify-center gap-2
    disabled:cursor-not-allowed
  `.trim()

  return (
    <div className="space-y-2">
      <button
        onClick={handlePurchase}
        disabled={isLoading}
        className={className || defaultClassName}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {children || (
              <>
                <CreditCard className="w-4 h-4" />
                Buy Now - ${formatPrice(product.price).toFixed(2)}
              </>
            )}
          </>
        )}
      </button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="font-medium">Payment Error</p>
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

// Optional: Export a simplified version for quick integration
export function QuickPurchaseButton({ 
  product, 
  size = 'default' 
}: { 
  product: Product
  size?: 'small' | 'default' | 'large' 
}) {
  const sizeClasses = {
    small: 'py-1.5 px-3 text-sm',
    default: 'py-2.5 px-4 text-base',
    large: 'py-3.5 px-6 text-lg',
  }

  return (
    <PurchaseButton
      product={product}
      className={`
        bg-green-600 hover:bg-green-700 disabled:bg-gray-400 
        text-white font-medium rounded-lg 
        transition-colors duration-200 
        flex items-center justify-center gap-2
        disabled:cursor-not-allowed
        ${sizeClasses[size]}
      `.trim()}
    >
      <CreditCard className="w-4 h-4" />
      Buy ${formatPrice(product.price).toFixed(2)} {product.currency.toUpperCase()}
    </PurchaseButton>
  )
}
