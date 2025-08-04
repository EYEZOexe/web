"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@apollo/client"
import { GET_USER_ORDERS } from "@/lib/queries"
import { formatCurrency, formatCurrencyFromString, formatDate, getRelativeTime } from "@/lib/utils"
import { Button, Card } from "@repo/ui"
import Link from "next/link"

interface OrderItem {
  id: string
  productName: string
  variantName?: string
  unitPrice: number
  quantity: number
  totalPrice: number
  downloadLimit?: number
  accessDuration?: number
  product: {
    id: string
    name: string
    slug: string
    type: string
    featuredImage?: {
      url: string
    }
  }
  license?: {
    id: string
    licenseKey: string
    status: string
    downloadCount: number
    downloadLimit?: number
    expiresAt?: string
    lastAccessedAt?: string
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  subtotal: number
  tax: number
  total: number
  currency: string
  customerEmail: string
  stripePaymentIntentId?: string
  orderItems: OrderItem[]
  createdAt: string
  updatedAt: string
}

function OrderStatusBadge({ status }: { status: string }) {
  let className = "px-2 py-1 text-xs rounded-full "
  
  switch (status) {
    case 'completed':
      className += "bg-green-100 text-green-800"
      break
    case 'processing':
      className += "bg-yellow-100 text-yellow-800"
      break
    case 'pending':
      className += "bg-blue-100 text-blue-800"
      break
    case 'cancelled':
      className += "bg-red-100 text-red-800"
      break
    case 'refunded':
      className += "bg-purple-100 text-purple-800"
      break
    default:
      className += "bg-gray-100 text-gray-800"
  }
  
  return <span className={className}>{status}</span>
}

function PaymentStatusBadge({ status }: { status: string }) {
  let className = "px-2 py-1 text-xs rounded-full "
  
  switch (status) {
    case 'paid':
      className += "bg-green-100 text-green-800"
      break
    case 'pending':
      className += "bg-yellow-100 text-yellow-800"
      break
    case 'failed':
      className += "bg-red-100 text-red-800"
      break
    case 'refunded':
      className += "bg-purple-100 text-purple-800"
      break
    default:
      className += "bg-gray-100 text-gray-800"
  }
  
  return <span className={className}>{status}</span>
}

function ProductTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'course': return '🎓'
    case 'file': return '📄'
    case 'license': return '🔑'
    case 'subscription': return '📅'
    default: return '📦'
  }
}

export default function OrdersPage() {
  const { data: session } = useSession()
  
  const { data, loading, error } = useQuery(GET_USER_ORDERS, {
    variables: { userId: session?.user?.id },
    skip: !session?.user?.id,
    errorPolicy: 'all', // Show partial data even with errors
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    console.error("Orders query error:", error)
    // Still show the orders page, will show empty state
  }

  const orders: Order[] = data?.orders || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-600 mt-2">
            Track your purchases and order status
          </p>
        </div>
        <Link href="/products">
          <Button>Browse Products</Button>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
            <p className="text-sm text-gray-600">Total Orders</p>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.status === 'completed').length}
            </p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {orders.filter(o => o.status === 'processing').length}
            </p>
            <p className="text-sm text-gray-600">Processing</p>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(orders.reduce((sum, order) => 
                order.status !== 'cancelled' ? sum + (typeof order.total === 'string' ? parseFloat(order.total) : order.total) : sum, 0))}
            </p>
            <p className="text-sm text-gray-600">Total Spent</p>
          </div>
        </Card>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🛍️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No orders yet
          </h3>
          <p className="text-gray-600 mb-6">
            Start shopping to see your order history here
          </p>
          <Link href="/products">
            <Button size="lg">Browse Products</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="p-6">
              {/* Order Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order #{order.orderNumber}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Placed on {formatDate(order.createdAt)} • {getRelativeTime(order.createdAt)}
                  </p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={order.paymentStatus} />
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrencyFromString(order.total, order.currency)}
                    </p>
                    {(typeof order.tax === 'string' ? parseFloat(order.tax) : order.tax) > 0 && (
                      <p className="text-sm text-gray-600">
                        (Tax: {formatCurrencyFromString(order.tax, order.currency)})
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-3">
                {order.orderItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
                      <ProductTypeIcon type={item.product.type} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 truncate">
                            {item.productName}
                          </h4>
                          {item.variantName && (
                            <p className="text-sm text-gray-600">{item.variantName}</p>
                          )}
                          <p className="text-sm text-gray-600">
                            Qty: {item.quantity} × {formatCurrencyFromString(item.unitPrice, order.currency)}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatCurrencyFromString(item.totalPrice, order.currency)}
                          </p>
                          
                          {/* License Status */}
                          {item.license && (
                            <div className="mt-1">
                              <p className="text-xs text-gray-600">
                                License: {item.license.status}
                              </p>
                              {item.license.status === 'active' && (
                                <Link href={`/dashboard/library/${item.license.id}`}>
                                  <Button size="sm" variant="outline" className="mt-1">
                                    Access
                                  </Button>
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Actions */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {order.stripePaymentIntentId && (
                    <p>Payment ID: {order.stripePaymentIntentId}</p>
                  )}
                  <p>Last updated: {getRelativeTime(order.updatedAt)}</p>
                </div>
                
                <div className="flex space-x-2">
                  {order.status === 'completed' && (
                    <Link href={`/dashboard/library`}>
                      <Button size="sm" variant="outline">
                        View in Library
                      </Button>
                    </Link>
                  )}
                  
                  <Button size="sm" variant="outline">
                    Download Invoice
                  </Button>
                  
                  {order.paymentStatus === 'paid' && order.status === 'completed' && (
                    <Button size="sm" variant="outline">
                      Request Refund
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
