"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@apollo/client"
import { GET_USER_DOWNLOADS } from "@/lib/queries"
import { formatDate, getRelativeTime, formatFileSize } from "@/lib/utils"
import { Button, Card } from "@repo/ui"
import Link from "next/link"

interface Download {
  id: string
  fileName: string
  fileSize?: number
  status: string
  ipAddress?: string
  license: {
    licenseKey: string
    orderItem: {
      productName: string
      product: {
        name: string
        slug: string
      }
    }
  }
  productFile: {
    id: string
    name: string
    description?: string
    mimeType: string
  }
  createdAt: string
}

function DownloadStatusBadge({ status }: { status: string }) {
  let className = "px-2 py-1 text-xs rounded-full "
  
  switch (status) {
    case 'completed':
      className += "bg-green-100 text-green-800"
      break
    case 'started':
      className += "bg-yellow-100 text-yellow-800"
      break
    case 'failed':
      className += "bg-red-100 text-red-800"
      break
    default:
      className += "bg-gray-100 text-gray-800"
  }
  
  return <span className={className}>{status}</span>
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎥'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦'
  if (mimeType.includes('text/')) return '📝'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊'
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝'
  return '📄'
}

export default function DownloadsPage() {
  const { data: session } = useSession()
  
  const { data, loading, error } = useQuery(GET_USER_DOWNLOADS, {
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
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    console.error("Downloads query error:", error)
    // Still show the downloads page, will show empty state
  }

  const downloads: Download[] = data?.downloads || []

  // Group downloads by product
  const downloadsByProduct = downloads.reduce((acc, download) => {
    const productName = download.license.orderItem.productName
    if (!acc[productName]) {
      acc[productName] = []
    }
    acc[productName].push(download)
    return acc
  }, {} as Record<string, Download[]>)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Download History</h1>
          <p className="text-gray-600 mt-2">
            Track your file downloads and access history
          </p>
        </div>
        <Link href="/dashboard/library">
          <Button>View Library</Button>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{downloads.length}</p>
            <p className="text-sm text-gray-600">Total Downloads</p>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {downloads.filter(d => d.status === 'completed').length}
            </p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {downloads.filter(d => d.status === 'failed').length}
            </p>
            <p className="text-sm text-gray-600">Failed</p>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {formatFileSize(downloads.reduce((sum, d) => sum + (d.fileSize || 0), 0))}
            </p>
            <p className="text-sm text-gray-600">Total Size</p>
          </div>
        </Card>
      </div>

      {/* Downloads List */}
      {downloads.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">⬇️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No downloads yet
          </h3>
          <p className="text-gray-600 mb-6">
            Access your purchased content to start downloading files
          </p>
          <Link href="/dashboard/library">
            <Button size="lg">View Library</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(downloadsByProduct).map(([productName, productDownloads]) => (
            <Card key={productName} className="p-6">
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{productName}</h3>
                <p className="text-sm text-gray-600">
                  {productDownloads.length} download{productDownloads.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="space-y-3">
                {productDownloads.map((download) => (
                  <div 
                    key={download.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {getFileIcon(download.productFile.mimeType)}
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {download.fileName}
                        </h4>
                        {download.productFile.description && (
                          <p className="text-sm text-gray-600">
                            {download.productFile.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {download.fileSize && (
                            <span>{formatFileSize(download.fileSize)}</span>
                          )}
                          <span>{download.productFile.mimeType}</span>
                          <span>{getRelativeTime(download.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <DownloadStatusBadge status={download.status} />
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {formatDate(download.createdAt)}
                        </p>
                        {download.ipAddress && (
                          <p className="text-xs text-gray-500">
                            IP: {download.ipAddress}
                          </p>
                        )}
                      </div>

                      {download.status === 'completed' && (
                        <Button size="sm" variant="outline">
                          Re-download
                        </Button>
                      )}
                      
                      {download.status === 'failed' && (
                        <Button size="sm" variant="outline">
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Product Actions */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                <Link href={`/products/${productDownloads[0].license.orderItem.product.slug}`}>
                  <Button size="sm" variant="outline">
                    View Product
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Help Section */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">💡</div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Download Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Downloads are tracked for security and license compliance</li>
              <li>• Failed downloads can be retried from your library</li>
              <li>• Some products may have download limits - check your license details</li>
              <li>• Large files may take some time to prepare for download</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
