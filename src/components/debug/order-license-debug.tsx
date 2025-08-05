'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import { Card, Button } from '@repo/ui'
import { apolloClient } from '@/lib/apollo-client'
import { linkUnlinkedLicenses } from '@/lib/fix-unlinked-licenses'
import { useState } from 'react'

// Debug queries to check orders and licenses
const GET_ALL_ORDERS = gql`
  query GetAllOrders {
    orders(orderBy: { createdAt: desc }, take: 10) {
      id
      orderNumber
      status
      paymentStatus
      customerEmail
      total
      customer {
        id
        email
        name
      }
      orderItems {
        id
        productName
        license {
          id
          licenseKey
          status
          user {
            id
            email
          }
        }
      }
      createdAt
    }
  }
`

const GET_ALL_LICENSES = gql`
  query GetAllLicenses {
    licenses(orderBy: { createdAt: desc }, take: 10) {
      id
      licenseKey
      status
      user {
        id
        email
        name
      }
      orderItem {
        id
        productName
        order {
          id
          orderNumber
          customerEmail
        }
      }
      createdAt
    }
  }
`

export default function OrderLicenseDebug() {
  const { data: session } = useSession()
  const [fixingLicenses, setFixingLicenses] = useState(false)
  const [fixResult, setFixResult] = useState<string>('')
  
  const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } = useQuery(GET_ALL_ORDERS, {
    errorPolicy: 'all'
  })
  
  const { data: licensesData, loading: licensesLoading, refetch: refetchLicenses } = useQuery(GET_ALL_LICENSES, {
    errorPolicy: 'all'
  })

  const handleFixUnlinkedLicenses = async () => {
    setFixingLicenses(true)
    setFixResult('')
    
    try {
      const result = await linkUnlinkedLicenses(apolloClient)
      
      if (result.success) {
        setFixResult(`✅ Successfully linked ${result.linkedCount} licenses!`)
        // Refresh the data
        await refetchOrders()
        await refetchLicenses()
      } else {
        setFixResult(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      setFixResult(`❌ Error: ${error}`)
    } finally {
      setFixingLicenses(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Order & License Debug</h2>
        <div className="flex gap-2">
          <Button 
            onClick={handleFixUnlinkedLicenses}
            disabled={fixingLicenses}
            className="bg-green-600 hover:bg-green-700"
          >
            {fixingLicenses ? 'Fixing...' : 'Fix Unlinked Licenses'}
          </Button>
        </div>
      </div>
      
      {fixResult && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="text-sm font-mono">{fixResult}</div>
        </Card>
      )}
      
      {/* Current User Info */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Current User Session</h3>
        <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
          {JSON.stringify(
            session
              ? {
                  id: session.user?.id,
                  email: session.user?.email,
                  name: session.user?.name,
                }
              : 'Not signed in',
            null,
            2
          )}
        </pre>
      </Card>

      {/* Recent Orders */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Recent Orders ({ordersData?.orders?.length || 0})</h3>
        {ordersLoading ? (
          <p>Loading orders...</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {ordersData?.orders?.map((order: any) => (
              <div key={order.id} className="border p-3 rounded text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <strong>Order:</strong> {order.orderNumber}
                    <br />
                    <strong>Email:</strong> {order.customerEmail}
                    <br />
                    <strong>Total:</strong> ${order.total}
                    <br />
                    <strong>Status:</strong> {order.status} / {order.paymentStatus}
                  </div>
                  <div>
                    <strong>User Account:</strong>{' '}
                    {order.customer ? (
                      <>
                        {order.customer.name} ({order.customer.email})
                        <br />
                        <span className="text-green-600">✅ Linked</span>
                      </>
                    ) : (
                      <span className="text-red-600">❌ Not linked</span>
                    )}
                    <br />
                    <strong>Created:</strong> {new Date(order.createdAt).toLocaleString()}
                  </div>
                </div>
                
                {/* Order Items & Licenses */}
                <div className="mt-2 border-t pt-2">
                  <strong>Items & Licenses:</strong>
                  {order.orderItems?.map((item: any) => (
                    <div key={item.id} className="ml-4 text-xs">
                      • {item.productName}
                      {item.license ? (
                        <span className="text-green-600 ml-2">
                          ✅ License: {item.license.licenseKey} 
                          (User: {item.license.user?.email || 'Unlinked'})
                        </span>
                      ) : (
                        <span className="text-red-600 ml-2">❌ No license</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Licenses */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Recent Licenses ({licensesData?.licenses?.length || 0})</h3>
        {licensesLoading ? (
          <p>Loading licenses...</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {licensesData?.licenses?.map((license: any) => (
              <div key={license.id} className="border p-3 rounded text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <strong>License:</strong> {license.licenseKey}
                    <br />
                    <strong>Status:</strong> {license.status}
                    <br />
                    <strong>Product:</strong> {license.orderItem?.productName}
                  </div>
                  <div>
                    <strong>User:</strong>{' '}
                    {license.user ? (
                      <>
                        {license.user.name} ({license.user.email})
                        <br />
                        <span className="text-green-600">✅ User linked</span>
                      </>
                    ) : (
                      <span className="text-red-600">❌ No user linked</span>
                    )}
                    <br />
                    <strong>Order:</strong> {license.orderItem?.order?.orderNumber}
                    <br />
                    <strong>Customer Email:</strong> {license.orderItem?.order?.customerEmail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
