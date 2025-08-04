'use client'

import { useQuery } from '@apollo/client'
import { GET_PRODUCTS } from '@/lib/graphql/queries'
import { Card } from '@repo/ui'

// Type definitions for our enhanced product data
interface ProductVariant {
  id: string
  name: string
  price: number
  compareAtPrice?: number
  downloadLimit?: number
  accessDuration?: number
  isActive: boolean
}

interface ProductCategory {
  id: string
  name: string
  slug: string
  description?: string
}

interface Product {
  id: string
  name: string
  slug: string
  description?: string
  type: 'course' | 'file' | 'license' | 'subscription'
  status: 'draft' | 'active' | 'archived' | 'PUBLISHED'
  price: number
  compareAtPrice?: number
  currency: string
  tags?: string
  downloadLimit?: number
  accessDuration?: number
  metaTitle?: string
  metaDescription?: string
  category?: ProductCategory
  variants: ProductVariant[]
  createdAt: string
  updatedAt: string
}

interface ProductsData {
  products: Product[]
}

export default function ProductsList() {
  const { loading, error, data } = useQuery<ProductsData>(GET_PRODUCTS, {
    variables: { take: 10, skip: 0 },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  })

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price / 100)
  }

  const getProductTypeColor = (type: string) => {
    const colors = {
      course: 'bg-blue-100 text-blue-800',
      file: 'bg-green-100 text-green-800',
      license: 'bg-purple-100 text-purple-800',
      subscription: 'bg-orange-100 text-orange-800',
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getVariantPriceRange = (variants: ProductVariant[]) => {
    if (!variants.length) return null
    
    const prices = variants
      .filter(v => v.isActive)
      .map(v => v.price)
      .sort((a, b) => a - b)
    
    if (prices.length === 0) return null
    if (prices.length === 1) return prices[0]
    
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    console.error('GraphQL Error:', error)
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error loading products</h3>
        <p className="text-red-600">{error.message}</p>
        <details className="mt-4">
          <summary className="text-sm text-red-500 cursor-pointer">Technical details</summary>
          <pre className="text-xs mt-2 bg-red-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(error, null, 2)}
          </pre>
        </details>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </Card>
    )
  }

  if (!data?.products || data.products.length === 0) {
    return (
      <Card className="p-12 text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          No Products Available
        </h3>
        <p className="text-gray-600 mb-4">
          There are no products to display at the moment.
        </p>
        <p className="text-sm text-gray-500">
          Check back later or contact support if this seems wrong.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Products ({data.products.length})
        </h1>
        <div className="flex gap-2">
          <select className="px-3 py-2 border border-gray-300 rounded-md">
            <option>All Types</option>
            <option>Courses</option>
            <option>Files</option>
            <option>Licenses</option>
            <option>Subscriptions</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-md">
            <option>Sort by Price</option>
            <option>Low to High</option>
            <option>High to Low</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.products.map((product) => {
          const variantPriceRange = getVariantPriceRange(product.variants || [])
          const displayPrice = variantPriceRange 
            ? (typeof variantPriceRange === 'number' 
                ? variantPriceRange 
                : variantPriceRange.min)
            : product.price

          return (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProductTypeColor(product.type || 'course')}`}>
                    {(product.type || 'course').charAt(0).toUpperCase() + (product.type || 'course').slice(1)}
                  </span>
                  {(product.status === 'active' || product.status === 'PUBLISHED') && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Available
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {product.name}
                </h3>
                
                {product.category && (
                  <p className="text-sm text-blue-600 mb-2">
                    {product.category.name}
                  </p>
                )}

                {product.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {product.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {formatPrice(displayPrice, product.currency || 'USD')}
                      </span>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="text-sm text-gray-500 line-through">
                          {formatPrice(product.compareAtPrice, product.currency || 'USD')}
                        </span>
                      )}
                    </div>
                    {variantPriceRange && typeof variantPriceRange === 'object' && (
                      <span className="text-sm text-gray-500">
                        - {formatPrice(variantPriceRange.max, product.currency || 'USD')}
                      </span>
                    )}
                  </div>

                  {product.variants && product.variants.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {product.variants.filter(v => v.isActive).length} variant{product.variants.filter(v => v.isActive).length !== 1 ? 's' : ''} available
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {product.accessDuration && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                      {product.accessDuration === 365 ? '1 year access' : `${product.accessDuration} days`}
                    </span>
                  )}
                  {product.downloadLimit && (
                    <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                      {product.downloadLimit} downloads
                    </span>
                  )}
                  {!product.downloadLimit && !product.accessDuration && (
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                      Lifetime access
                    </span>
                  )}
                </div>

                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                  View Details
                </button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
