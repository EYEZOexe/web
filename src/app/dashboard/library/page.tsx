"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@apollo/client"
import { GET_USER_LICENSES } from "@/lib/queries"
import { formatDate, getRelativeTime, formatFileSize } from "@/lib/utils"
import { Button, Card } from "@repo/ui"
import Link from "next/link"
import Image from "next/image"

interface License {
  id: string
  licenseKey: string
  status: string
  downloadCount: number
  downloadLimit?: number
  expiresAt?: string
  lastAccessedAt?: string
  orderItem: {
    id: string
    productName: string
    variantName?: string
    product: {
      id: string
      name: string
      slug: string
      type: string
      description?: string
      featuredImage?: {
        url: string
      }
      files: Array<{
        id: string
        name: string
        description?: string
        fileSize?: number
        mimeType: string
        isPublic: boolean
      }>
    }
  }
  downloads: Array<{
    id: string
    fileName: string
    fileSize?: number
    status: string
    createdAt: string
  }>
  createdAt: string
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

function LicenseStatusBadge({ status, expiresAt }: { status: string, expiresAt?: string }) {
  let className = "px-2 py-1 text-xs rounded-full "
  let text = status
  
  if (status === 'active') {
    if (expiresAt && new Date(expiresAt) < new Date()) {
      className += "bg-orange-100 text-orange-800"
      text = "Expired"
    } else {
      className += "bg-green-100 text-green-800"
      text = "Active"
    }
  } else if (status === 'expired') {
    className += "bg-red-100 text-red-800"
    text = "Expired"
  } else if (status === 'suspended') {
    className += "bg-yellow-100 text-yellow-800"
    text = "Suspended"
  } else {
    className += "bg-gray-100 text-gray-800"
  }
  
  return <span className={className}>{text}</span>
}

export default function LibraryPage() {
  const { data: session } = useSession()
  
  const { data, loading, error } = useQuery(GET_USER_LICENSES, {
    variables: { userId: session?.user?.id },
    skip: !session?.user?.id,
    errorPolicy: 'all', // Show partial data even with errors
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    console.error("Library query error:", error)
    // Still show the library page, will show empty state
  }

  const licenses: License[] = data?.licenses || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Library</h1>
          <p className="text-gray-600 mt-2">
            Access your purchased digital products and content
          </p>
        </div>
        <Link href="/products">
          <Button>Browse Products</Button>
        </Link>
      </div>

      {/* Filter/Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search your library..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          <option value="">All Types</option>
          <option value="course">Courses</option>
          <option value="file">Files</option>
          <option value="license">Licenses</option>
          <option value="subscription">Subscriptions</option>
        </select>
      </div>

      {/* Content */}
      {licenses.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Your library is empty
          </h3>
          <p className="text-gray-600 mb-6">
            Purchase some digital products to build your collection
          </p>
          <Link href="/products">
            <Button size="lg">Browse Products</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {licenses.map((license) => (
            <Card key={license.id} className="p-6">
              <div className="flex items-start space-x-4">
                {/* Product Image */}
                <div className="flex-shrink-0">
                  {license.orderItem.product.featuredImage?.url ? (
                    <Image
                      src={license.orderItem.product.featuredImage.url}
                      alt={license.orderItem.product.name}
                      width={80}
                      height={80}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                      <ProductTypeIcon type={license.orderItem.product.type} />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 truncate">
                        {license.orderItem.product.name}
                      </h3>
                      {license.orderItem.variantName && (
                        <p className="text-sm text-gray-600">
                          {license.orderItem.variantName}
                        </p>
                      )}
                    </div>
                    <LicenseStatusBadge 
                      status={license.status} 
                      expiresAt={license.expiresAt} 
                    />
                  </div>

                  {/* License Details */}
                  <div className="mt-3 text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Downloads:</span>
                      <span>
                        {license.downloadCount}
                        {license.downloadLimit ? ` / ${license.downloadLimit}` : ' / Unlimited'}
                      </span>
                    </div>
                    
                    {license.expiresAt && (
                      <div className="flex justify-between">
                        <span>Expires:</span>
                        <span>{formatDate(license.expiresAt)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span>Purchased:</span>
                      <span>{formatDate(license.createdAt)}</span>
                    </div>
                    
                    {license.lastAccessedAt && (
                      <div className="flex justify-between">
                        <span>Last accessed:</span>
                        <span>{getRelativeTime(license.lastAccessedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Files */}
                  {license.orderItem.product.files.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Available Files ({license.orderItem.product.files.length})
                      </h4>
                      <div className="space-y-1">
                        {license.orderItem.product.files.slice(0, 3).map((file) => (
                          <div 
                            key={file.id} 
                            className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-xs">📄</span>
                              <span className="truncate">{file.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {file.fileSize && (
                                <span className="text-xs text-gray-500">
                                  {formatFileSize(file.fileSize)}
                                </span>
                              )}
                              <Button size="sm" variant="outline">
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                        
                        {license.orderItem.product.files.length > 3 && (
                          <p className="text-xs text-gray-500 text-center py-1">
                            +{license.orderItem.product.files.length - 3} more files
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex space-x-2">
                    <Link href={`/dashboard/library/${license.id}`}>
                      <Button size="sm">View Details</Button>
                    </Link>
                    
                    {license.orderItem.product.type === 'course' && (
                      <Link href={`/products/${license.orderItem.product.slug}`}>
                        <Button size="sm" variant="outline">
                          Access Course
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
