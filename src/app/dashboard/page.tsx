"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@apollo/client"
import { GET_USER_DASHBOARD_STATS } from "@/lib/queries"
import { formatCurrency, formatCurrencyFromString, getRelativeTime } from "@/lib/utils"
import { Button, Card } from "@repo/ui"
import Link from "next/link"
import UserDebugComponent from "@/components/dashboard/user-debug"
import ApolloTestComponent from "@/components/debug/apollo-test"

interface DashboardStats {
  totalSpent: number
  totalOrders: number
  activeLicenses: number
  recentOrders: Array<{
    id: string
    total: string // GraphQL returns decimal as string
    status: string
    createdAt: string
  }>
}

export default function DashboardPage() {
  const { data: session } = useSession()
  
  const { data, loading, error } = useQuery(GET_USER_DASHBOARD_STATS, {
    variables: { userId: session?.user?.id },
    skip: !session?.user?.id,
    errorPolicy: 'all', // Show partial data even with errors
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    console.error("Dashboard query error:", error)
    // Still show the dashboard with default/fallback data
  }

  // Calculate stats from the data with fallbacks
  const userData = data?.user || {}
  const stats: DashboardStats = {
    totalSpent: userData.orders?.reduce((sum: number, order: any) => 
      sum + (order.status !== 'cancelled' ? parseFloat(order.total || '0') : 0), 0) || 0,
    totalOrders: userData.orders?.filter((order: any) => 
      order.status !== 'cancelled').length || 0,
    activeLicenses: userData.licenses?.filter((license: any) => 
      license.status === 'active' && 
      (!license.expiresAt || new Date(license.expiresAt) > new Date())).length || 0,
    recentOrders: userData.orders?.slice(0, 5) || [],
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {session?.user?.name || session?.user?.email}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalSpent)}
              </p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
            <div className="text-3xl">🛍️</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Licenses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeLicenses}</p>
            </div>
            <div className="text-3xl">🔑</div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/library">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="text-2xl mb-2">📚</div>
              <h3 className="font-semibold text-gray-900">My Library</h3>
              <p className="text-sm text-gray-600">Access your content</p>
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/orders">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="text-2xl mb-2">📋</div>
              <h3 className="font-semibold text-gray-900">Order History</h3>
              <p className="text-sm text-gray-600">View past purchases</p>
            </div>
          </Card>
        </Link>

        <Link href="/dashboard/downloads">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="text-2xl mb-2">⬇️</div>
              <h3 className="font-semibold text-gray-900">Downloads</h3>
              <p className="text-sm text-gray-600">Download history</p>
            </div>
          </Card>
        </Link>

        <Link href="/products">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="text-2xl mb-2">🛒</div>
              <h3 className="font-semibold text-gray-900">Browse Products</h3>
              <p className="text-sm text-gray-600">Discover new content</p>
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
            <Link href="/dashboard/orders">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
          
          {stats.recentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🛍️</div>
              <p>No orders yet</p>
              <Link href="/products">
                <Button className="mt-2" size="sm">Browse Products</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatCurrencyFromString(order.total)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {getRelativeTime(order.createdAt)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    order.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : order.status === 'processing'
                      ? 'bg-yellow-100 text-yellow-800'
                      : order.status === 'pending'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Links */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
          <div className="space-y-3">
            <Link 
              href="/dashboard/account" 
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-lg mr-3">⚙️</span>
              <div>
                <p className="font-medium text-gray-900">Account Settings</p>
                <p className="text-sm text-gray-600">Manage your profile</p>
              </div>
            </Link>
            
            <Link 
              href="/products" 
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-lg mr-3">🔍</span>
              <div>
                <p className="font-medium text-gray-900">Browse Products</p>
                <p className="text-sm text-gray-600">Find new digital products</p>
              </div>
            </Link>
            
            <a 
              href="mailto:support@yoursite.com" 
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-lg mr-3">📧</span>
              <div>
                <p className="font-medium text-gray-900">Contact Support</p>
                <p className="text-sm text-gray-600">Get help with your account</p>
              </div>
            </a>
          </div>
        </Card>
      </div>

      {/* Debug Component (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="space-y-4">
          <UserDebugComponent />
          <ApolloTestComponent />
        </div>
      )}
    </div>
  )
}