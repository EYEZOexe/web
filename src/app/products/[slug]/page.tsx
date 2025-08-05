"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@apollo/client"
import { useParams } from "next/navigation"
import { GET_PRODUCT, GET_USER_LICENSES } from "@/lib/queries"
import { formatDate, formatFileSize } from "@/lib/utils"
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui"
import { ContentViewer } from "@/components/content/content-viewer"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ShoppingCart, Key, Eye } from "lucide-react"

interface ProductFile {
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

interface Product {
  id: string
  name: string
  slug: string
  description?: string
  type: string
  price: number
  compareAtPrice?: number
  currency: string
  downloadLimit?: number
  accessDuration?: number
  featuredImage?: {
    url: string
  }
  files: ProductFile[]
  category?: {
    id: string
    name: string
    slug: string
  }
  createdAt: string
}

interface License {
  id: string
  status: string
  expiresAt?: string
  orderItem: {
    product: {
      id: string
      slug: string
    }
  }
}

// Helper function to map product files to ContentViewer format
function mapProductFilesToContentFiles(files: ProductFile[], product: { id: string; name: string }) {
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

export default function ProductDetailsPage() {
  const { data: session } = useSession()
  const params = useParams()
  const slug = params.slug as string

  // Get product details
  const { data: productData, loading: productLoading, error: productError } = useQuery(GET_PRODUCT, {
    variables: { slug },
    skip: !slug
  })

  // Get user licenses to check access
  const { data: licensesData, loading: licensesLoading } = useQuery(GET_USER_LICENSES, {
    variables: { userId: session?.user?.id },
    skip: !session?.user?.id
  })

  if (productLoading || licensesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (productError || !productData?.product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">
            The product you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link href="/products">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const product: Product = productData.product
  const userLicenses: License[] = licensesData?.licenses || []
  
  // Check if user has an active license for this product
  const activeLicense = userLicenses.find(license => 
    license.orderItem.product.slug === product.slug && 
    license.status === 'active' &&
    (!license.expiresAt || new Date(license.expiresAt) > new Date())
  )

  // Map product files to ContentViewer format
  const contentFiles = mapProductFilesToContentFiles(product.files, product)

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/products">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            {product.category && (
              <p className="text-gray-600 mt-1">
                {product.category.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <ProductTypeIcon type={product.type} />
          <span className="text-2xl font-bold text-green-600">
            ${product.price.toFixed(2)} {product.currency}
          </span>
        </div>
      </div>

      {/* Product Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <ProductTypeIcon type={product.type} />
            <span>Product Overview</span>
          </CardTitle>
          <CardDescription>
            {product.description || "Comprehensive digital content package"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {product.featuredImage && (
            <div className="relative w-full h-64 rounded-lg overflow-hidden">
              <Image
                src={product.featuredImage.url}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-900">Type:</span>
              <p className="text-gray-600 capitalize">{product.type}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Files:</span>
              <p className="text-gray-600">{product.files.length} items</p>
            </div>
            {product.downloadLimit && (
              <div>
                <span className="font-medium text-gray-900">Downloads:</span>
                <p className="text-gray-600">{product.downloadLimit} limit</p>
              </div>
            )}
            {product.accessDuration && (
              <div>
                <span className="font-medium text-gray-900">Access:</span>
                <p className="text-gray-600">{product.accessDuration} days</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Access Status */}
      {session ? (
        activeLicense ? (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>You Have Access</span>
              </CardTitle>
              <CardDescription className="text-green-700">
                You have an active license for this product. Access your content below or visit your{" "}
                <Link href={`/dashboard/library/${activeLicense.id}`} className="underline">
                  library page
                </Link>
                {" "}for detailed management.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800 flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Purchase Required</span>
              </CardTitle>
              <CardDescription className="text-blue-700">
                Purchase this product to access the full content library.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Purchase for ${product.price.toFixed(2)}
              </Button>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">Sign In Required</CardTitle>
            <CardDescription className="text-orange-700">
              Please sign in to check your access or purchase this product.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/signin">
              <Button variant="outline" className="border-orange-300 text-orange-700">
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Content Preview/Access */}
      {contentFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>{activeLicense ? 'Access Your Content' : 'Content Preview'}</span>
            </CardTitle>
            <CardDescription>
              {activeLicense 
                ? 'Your licensed content is ready to access. Videos and documents will load directly.'
                : 'Preview the content included in this product. Full access requires purchase.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContentViewer 
              files={contentFiles}
              userHasAccess={!!activeLicense}
            />
          </CardContent>
        </Card>
      )}

      {/* Product Details */}
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">What&apos;s Included</h4>
            <ul className="space-y-2">
              {product.files.map((file) => (
                <li key={file.id} className="flex items-center space-x-3 text-sm">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span className="flex-1">{file.name}</span>
                  {file.fileSize && (
                    <span className="text-gray-500">
                      {formatFileSize(file.fileSize)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500">
              Added {formatDate(product.createdAt)} • 
              {product.downloadLimit && ` ${product.downloadLimit} download limit`}
              {product.accessDuration && ` • ${product.accessDuration} day access`}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
