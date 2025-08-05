import { auth } from '../../auth'
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { ContentViewer } from '../../components/content/content-viewer'
import { Button } from '@repo/ui'
import Link from 'next/link'

// Initialize Apollo Client for KeystoneJS GraphQL API
const apolloClient = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_API_URL 
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/graphql` 
    : 'http://localhost:4000/api/graphql',
  cache: new InMemoryCache(),
})

const GET_PRODUCT_FILES = gql`
  query GetProductFilesForContentTest {
    productFiles {
      id
      name
      description
      contentType
      googleDriveShareableLink
      youtubeUnlistedLink
      requiresLicense
      isPublic
      fileSize
      mimeType
      sortOrder
      product {
        id
        name
        slug
        type
      }
    }
  }
`

const GET_USER_LICENSES = gql`
  query GetUserLicensesForContentTest($userId: ID!) {
    licenses(
      where: {
        user: { id: { equals: $userId } }
        status: { equals: active }
      }
    ) {
      id
      status
      expiresAt
      orderItem {
        product {
          id
          name
          slug
        }
      }
    }
  }
`

interface ContentFile {
  id: string
  name: string
  contentType: 'pdf' | 'docx' | 'video' | 'file'
  description?: string
  googleDriveShareableLink?: string
  youtubeUnlistedLink?: string
  requiresLicense: boolean
  isPublic?: boolean
  fileSize?: number
  mimeType?: string
  sortOrder?: number
  product: {
    id: string
    name: string
    slug: string
    type?: string
  }
}

interface License {
  id: string
  status: string
  expiresAt?: string
  orderItem: {
    product: {
      id: string
      name: string
      slug: string
    }
  }
}

async function getContentData(userId?: string) {
  try {
    // Get all product files
    const { data: filesData } = await apolloClient.query({
      query: GET_PRODUCT_FILES,
      fetchPolicy: 'no-cache',
    })

    const productFiles: ContentFile[] = filesData?.productFiles || []

    // Get user licenses if authenticated
    let userLicenses: License[] = []
    if (userId) {
      const { data: licensesData } = await apolloClient.query({
        query: GET_USER_LICENSES,
        variables: { userId },
        fetchPolicy: 'no-cache',
      })
      userLicenses = licensesData?.licenses || []
    }

    return { productFiles, userLicenses }
  } catch (error) {
    console.error('Error fetching content data:', error)
    return { productFiles: [], userLicenses: [] }
  }
}

function checkUserAccess(file: ContentFile, userLicenses: License[]): boolean {
  // If file is public, allow access
  if (file.isPublic) return true
  
  // If file doesn't require license, allow access
  if (!file.requiresLicense) return true
  
  // Check if user has valid license for this product
  return userLicenses.some(license => {
    if (license.status !== 'active') return false
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) return false
    return license.orderItem?.product?.id === file.product?.id
  })
}

export default async function ContentDeliveryTestPage() {
  const session = await auth()
  const { productFiles, userLicenses } = await getContentData(session?.user?.id)

  // Group files by product
  const filesByProduct = productFiles.reduce((acc, file) => {
    const productName = file.product?.name || 'Unknown Product'
    if (!acc[productName]) {
      acc[productName] = {
        product: file.product,
        files: [],
        userHasAccess: false
      }
    }
    acc[productName].files.push(file)
    
    // Check if user has access to any file in this product
    if (checkUserAccess(file, userLicenses)) {
      acc[productName].userHasAccess = true
    }
    
    return acc
  }, {} as Record<string, { product: any, files: ContentFile[], userHasAccess: boolean }>)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Content Delivery System Test</h1>
            <div className="flex gap-2">
              <Link href="/content-demo">
                <Button variant="outline">Demo Page</Button>
              </Link>
              <Link href="/products">
                <Button variant="outline">Products</Button>
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-1">Authentication Status</h3>
              <p className="text-sm text-blue-800">
                {session?.user ? `✅ Signed in as ${session.user.email}` : '❌ Not signed in'}
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-1">Content Files</h3>
              <p className="text-sm text-green-800">
                📁 {productFiles.length} files across {Object.keys(filesByProduct).length} products
              </p>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-1">Active Licenses</h3>
              <p className="text-sm text-purple-800">
                🔑 {userLicenses.length} active licenses
              </p>
            </div>
          </div>

          {!session?.user && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 mb-2">
                <strong>💡 Testing Tip:</strong> Sign in to test the full content delivery flow with license validation.
              </p>
              <Link href="/auth/signin">
                <Button className="mr-2">Sign In</Button>
              </Link>
              <Link href="/products">
                <Button variant="outline">View Products</Button>
              </Link>
            </div>
          )}
        </div>

        {/* User Licenses Summary */}
        {session?.user && userLicenses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Active Licenses</h2>
            <div className="grid gap-3">
              {userLicenses.map((license) => (
                <div key={license.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-900">{license.orderItem?.product?.name || 'Unknown Product'}</p>
                      <p className="text-sm text-green-700">Status: {license.status}</p>
                    </div>
                    <div className="text-right">
                      {license.expiresAt ? (
                        <p className="text-sm text-green-700">
                          Expires: {new Date(license.expiresAt).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-sm text-green-700">Lifetime Access</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content by Product */}
        {Object.keys(filesByProduct).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(filesByProduct).map(([productName, { product, files, userHasAccess }]) => (
              <div key={product.id} className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-semibold">{productName}</h2>
                    <p className="text-muted-foreground capitalize">
                      {product.type} • {files.length} file{files.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      userHasAccess 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {userHasAccess ? '✅ Access Granted' : '🔒 Access Denied'}
                    </div>
                    {!userHasAccess && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Purchase required
                      </p>
                    )}
                  </div>
                </div>
                
                <ContentViewer 
                  files={files} 
                  userHasAccess={userHasAccess}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">No Content Files Found</h2>
            <p className="text-muted-foreground mb-6">
              To test the content delivery system, you need to add ProductFiles to your database.
            </p>
            <div className="bg-gray-50 rounded-lg p-6 max-w-2xl mx-auto">
              <h3 className="font-semibold mb-3">Setup Instructions:</h3>
              <ol className="text-left text-sm space-y-2">
                <li>1. Start the development servers: <code className="bg-gray-200 px-1 rounded">pnpm dev</code></li>
                <li>2. Open Keystone Admin: <a href="http://localhost:4000/admin" target="_blank" className="text-blue-600 underline">http://localhost:4000/admin</a></li>
                <li>3. Go to GraphQL playground: <a href="http://localhost:4000/api/graphql" target="_blank" className="text-blue-600 underline">http://localhost:4000/api/graphql</a></li>
                <li>4. Run the mutations from <code className="bg-gray-200 px-1 rounded">apps/api/seed-data.ts</code> in order</li>
                <li>5. Refresh this page to see the content delivery system in action</li>
              </ol>
            </div>
          </div>
        )}

        {/* Technical Details */}
        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Content Delivery Technical Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Security Features:</h4>
              <ul className="space-y-1 text-gray-700">
                <li>• Time-limited signed URLs (HMAC SHA-256)</li>
                <li>• License validation before access</li>
                <li>• Session-based authentication</li>
                <li>• Secure content proxy endpoints</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Supported Content Types:</h4>
              <ul className="space-y-1 text-gray-700">
                <li>• 📄 PDF documents via Google Drive</li>
                <li>• 📝 Word documents via Google Drive</li>
                <li>• 🎥 Videos via YouTube unlisted</li>
                <li>• 📁 Other files via local storage</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
