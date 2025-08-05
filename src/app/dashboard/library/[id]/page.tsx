"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@apollo/client"
import { useParams } from "next/navigation"
import { GET_USER_LICENSE_DETAILS } from "@/lib/queries"
import { formatDate, getRelativeTime, formatFileSize } from "@/lib/utils"
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui"
import { ContentViewer } from "@/components/content/content-viewer"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Download, Calendar, Key, Eye } from "lucide-react"

interface LicenseFile {
  id: string
  name: string
  description?: string
  fileSize?: number
  mimeType: string
  isPublic: boolean
  url?: string
  driveFileId?: string
  youtubeVideoId?: string
}

interface LicenseDetails {
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
      files: LicenseFile[]
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
  user: {
    id: string
    email: string
  }
}

// Helper function to map license files to ContentViewer format
function mapLicenseFilesToContentFiles(files: LicenseFile[], product: { id: string; name: string }) {
  return files.map(file => ({
    id: file.id,
    name: file.name,
    description: file.description,
    contentType: getContentType(file.mimeType, file.youtubeVideoId),
    googleDriveShareableLink: file.driveFileId ? `https://drive.google.com/file/d/${file.driveFileId}/view` : undefined,
    youtubeUnlistedLink: file.youtubeVideoId ? `https://www.youtube.com/watch?v=${file.youtubeVideoId}` : undefined,
    requiresLicense: true,
    product: {
      id: product.id,
      name: product.name
    }
  }))
}

// Helper function to determine content type from MIME type
function getContentType(mimeType: string, youtubeVideoId?: string): 'pdf' | 'docx' | 'video' | 'file' {
  if (youtubeVideoId) return 'video'
  
  switch (mimeType) {
    case 'application/pdf':
      return 'pdf'
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword':
      return 'docx'
    case 'video/mp4':
    case 'video/webm':
    case 'video/ogg':
      return 'video'
    default:
      return 'file'
  }
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
  let className = "px-3 py-1 text-sm rounded-full font-medium "
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



export default function LicenseDetailsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const params = useParams();
  const licenseId = params.id as string;
  // Always call useQuery at the top level to follow React rules of hooks
  const { data, loading, error } = useQuery(GET_USER_LICENSE_DETAILS, {
    variables: {
      licenseId,
      userId: session?.user?.id,
    },
    skip: !session?.user?.id || !licenseId,
    errorPolicy: 'all',
    onCompleted: (data) => {
      console.log('License query completed:', data);
    },
    onError: (error) => {
      console.log('License query error:', error);
    },
  });

  if (sessionStatus === "loading") {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log('License Detail Page Debug:', {
    licenseId,
    userId: session?.user?.id,
    data,
    error,
    loading,
    sessionStatus,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !data?.license) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          License not found
        </h3>
        <p className="text-gray-600 mb-6">
          This license doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-left text-sm text-red-800 max-w-xl mx-auto overflow-x-auto">
            <strong>Apollo Error:</strong>
            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(error, null, 2)}</pre>
          </div>
        )}
        <Link href="/dashboard/library">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </Link>
      </div>
    )
  }

  const license: LicenseDetails = data.license
  
  // Check if the user owns this license
  if (license.user?.id !== session?.user?.id) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Access Denied
        </h3>
        <p className="text-gray-600 mb-6">
          You don&apos;t have permission to access this license.
        </p>
        <Link href="/dashboard/library">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </Link>
      </div>
    )
  }
  const product = license.orderItem.product
  
  // Map license files to ContentViewer format
  const contentFiles = mapLicenseFilesToContentFiles(product.files, product)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/library">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600 mt-1">
              {license.orderItem.variantName || 'Standard License'}
            </p>
          </div>
        </div>
        <LicenseStatusBadge status={license.status} expiresAt={license.expiresAt} />
      </div>

      {/* Product Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {product.featuredImage?.url ? (
                <Image
                  src={product.featuredImage.url}
                  alt={product.name}
                  width={120}
                  height={120}
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="w-30 h-30 bg-gray-100 rounded-lg flex items-center justify-center text-4xl">
                  <ProductTypeIcon type={product.type} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center space-x-2">
                <span>{product.name}</span>
                <ProductTypeIcon type={product.type} />
              </CardTitle>
              {product.description && (
                <CardDescription className="mt-2 text-base">
                  {product.description}
                </CardDescription>
              )}
              
              {/* License Stats */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2 text-sm">
                  <Download className="h-4 w-4 text-gray-500" />
                  <span>
                    {license.downloadCount}
                    {license.downloadLimit ? ` / ${license.downloadLimit}` : ' / Unlimited'}
                  </span>
                </div>
                
                {license.expiresAt && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Expires {formatDate(license.expiresAt)}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2 text-sm">
                  <Key className="h-4 w-4 text-gray-500" />
                  <span className="font-mono text-xs">{license.licenseKey.slice(-8)}</span>
                </div>
                
                {license.lastAccessedAt && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Eye className="h-4 w-4 text-gray-500" />
                    <span>Last: {getRelativeTime(license.lastAccessedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content Access */}
      {contentFiles.length > 0 ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Content Access</h2>
            <p className="text-gray-600">
              Your licensed content is ready to access. Videos will play directly on this page, 
              and documents will open in a preview window.
            </p>
          </div>
          
          <ContentViewer 
            files={contentFiles}
            userHasAccess={license.status === 'active' && (!license.expiresAt || new Date(license.expiresAt) > new Date())}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No content files available
            </h3>
            <p className="text-gray-600">
              This product doesn&apos;t have any downloadable content files yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Download History */}
      {license.downloads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Download History</CardTitle>
            <CardDescription>
              Recent downloads and access activity for this license
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {license.downloads.slice(0, 10).map((download) => (
                <div 
                  key={download.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Download className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium text-sm">{download.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(download.createdAt)} • Status: {download.status}
                      </p>
                    </div>
                  </div>
                  {download.fileSize && (
                    <span className="text-sm text-gray-500">
                      {formatFileSize(download.fileSize)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
