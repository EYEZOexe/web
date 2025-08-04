'use client'

import { useQuery } from '@apollo/client'
import { GET_PRODUCTS } from '@/lib/graphql/queries'
import { Card } from '@repo/ui'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  status: string
  createdAt: string
  category?: {
    id: string
    name: string
  }
}

interface ProductsData {
  products: Product[]
}

export default function ProductsList() {
  const { loading, error, data } = useQuery<ProductsData>(GET_PRODUCTS, {
    variables: { take: 10, skip: 0 },
  })

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error loading products</h3>
        <p className="text-red-600">{error.message}</p>
        <details className="mt-4">
          <summary className="text-sm text-red-500 cursor-pointer">Technical details</summary>
          <pre className="text-xs mt-2 bg-red-100 p-2 rounded overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        </details>
      </Card>
    )
  }

  if (!data?.products || data.products.length === 0) {
    return (
      <Card className="p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">No products found</h3>
        <p className="text-gray-600">There are no products available at the moment.</p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.products.map((product) => (
        <Card key={product.id} className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
          {product.description && (
            <p className="text-gray-600 mb-4 line-clamp-3">{product.description}</p>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-green-600">
              ${(product.price / 100).toFixed(2)}
            </span>
            {product.category && (
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {product.category.name}
              </span>
            )}
          </div>
          <div className="mt-4 flex justify-between items-center">
            <span className={`text-xs px-2 py-1 rounded ${
              product.status === 'PUBLISHED' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {product.status}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(product.createdAt).toLocaleDateString()}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}
