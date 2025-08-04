// Example page showing how to integrate the ContentViewer component
// This would typically be used in a product details page or user dashboard

import { ContentViewer } from '../../components/content/content-viewer'

// Mock data - in real app this would come from your database via GraphQL
const mockContentFiles = [
  {
    id: 'file-1',
    name: 'Complete Course Guide.pdf',
    contentType: 'pdf' as const,
    description: 'Comprehensive guide with all course materials',
    googleDriveShareableLink: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
    requiresLicense: true,
    product: {
      id: 'product-1',
      name: 'Advanced Web Development Course'
    }
  },
  {
    id: 'file-2',
    name: 'Setup Instructions.docx',
    contentType: 'docx' as const,
    description: 'Step-by-step setup guide',
    googleDriveShareableLink: 'https://drive.google.com/file/d/1mGcoa26X2jVcouvBdHXs_ml6xNJmhVgM/view',
    requiresLicense: true,
    product: {
      id: 'product-1',
      name: 'Advanced Web Development Course'
    }
  },
  {
    id: 'file-3',
    name: 'Introduction Video',
    contentType: 'video' as const,
    description: 'Welcome and course overview',
    youtubeUnlistedLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    requiresLicense: true,
    product: {
      id: 'product-1',
      name: 'Advanced Web Development Course'
    }
  },
  {
    id: 'file-4',
    name: 'Advanced Techniques Tutorial',
    contentType: 'video' as const,
    description: 'Deep dive into advanced concepts',
    youtubeUnlistedLink: 'https://youtu.be/jNQXAC9IVRw',
    requiresLicense: true,
    product: {
      id: 'product-1',
      name: 'Advanced Web Development Course'
    }
  }
]

export default function ContentExamplePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Ultra-Simple Content Delivery</h1>
          <p className="text-muted-foreground mb-6">
            This example shows how the ContentViewer component works with Google Drive shareable links 
            and YouTube unlisted videos - no complex APIs needed!
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">How it works:</h2>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Google Drive:</strong> Uses shareable links with direct download URLs</li>
              <li>• <strong>YouTube:</strong> Uses unlisted video links with embed support</li>
              <li>• <strong>Security:</strong> Time-limited signed URLs protect access</li>
              <li>• <strong>Licensing:</strong> Validates user purchases before granting access</li>
            </ul>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Content Files - With Access</h2>
            <p className="text-muted-foreground mb-4">
              This shows how the component looks when a user has purchased the content:
            </p>
            <ContentViewer 
              files={mockContentFiles} 
              userHasAccess={true}
            />
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Content Files - Without Access</h2>
            <p className="text-muted-foreground mb-4">
              This shows how the component looks when a user hasn&apos;t purchased the content:
            </p>
            <ContentViewer 
              files={mockContentFiles} 
              userHasAccess={false}
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold mb-3">Implementation Notes:</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>
                <strong>No APIs Required:</strong> Just paste shareable Google Drive links and unlisted YouTube URLs
              </li>
              <li>
                <strong>Secure Access:</strong> Uses HMAC signatures to prevent unauthorized access
              </li>
              <li>
                <strong>Time-Limited:</strong> Access links expire automatically (1hr for docs, 2hrs for videos)
              </li>
              <li>
                <strong>License Validation:</strong> Checks user purchases before allowing content access
              </li>
              <li>
                <strong>Simple Setup:</strong> Just add CONTENT_SIGNING_SECRET to your environment
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
