import { Metadata } from 'next'
import ProductsList from '@/components/products/products-list'

export const metadata: Metadata = {
  title: 'Products - Digital Products Platform',
  description: 'Browse our collection of digital products',
}

export default function ProductsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Products</h1>
      <ProductsList />
    </div>
  )
}
