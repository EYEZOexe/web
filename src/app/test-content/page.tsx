'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { ContentViewer } from '../../components/content/content-viewer'

// Test page to verify content access integration
export default function TestContentPage() {
  const { data: session, status } = useSession()
  const [testResults, setTestResults] = useState<string>('')

  // Mock content files for testing
  const mockContentFiles = [
    {
      id: 'test-file-1',
      name: 'Sample PDF Document.pdf',
      contentType: 'pdf' as const,
      description: 'Test PDF document for download',
      googleDriveShareableLink: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing',
      requiresLicense: true,
      product: {
        id: 'test-product-1',
        name: 'Test Product'
      }
    },
    {
      id: 'test-file-2', 
      name: 'Sample Video Course',
      contentType: 'video' as const,
      description: 'Test video content',
      youtubeUnlistedLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      requiresLicense: true,
      product: {
        id: 'test-product-2',
        name: 'Test Video Product'
      }
    }
  ]

  const testContentAccess = async (fileId: string) => {
    try {
      setTestResults(`Testing content access for file ${fileId}...`)
      
      const response = await fetch('/api/content/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productFileId: fileId,
        }),
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        setTestResults(`✅ Content access successful! URL: ${result.accessUrl}`)
      } else {
        setTestResults(`❌ Content access failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      setTestResults(`❌ Error testing content access: ${error}`)
    }
  }

  if (status === 'loading') {
    return <div className="p-8">Loading session...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Content Access Test</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Session Status</h2>
        {session ? (
          <div className="bg-green-100 border border-green-300 rounded p-4">
            <p>✅ Authenticated as: {session.user?.email}</p>
            <p>User ID: {session.user?.id}</p>
          </div>
        ) : (
          <div className="bg-red-100 border border-red-300 rounded p-4">
            <p>❌ Not authenticated</p>
            <p>Please sign in to test content access</p>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Content Access API Test</h2>
        <div className="space-y-4">
          <button
            onClick={() => testContentAccess('test-file-1')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test PDF Access
          </button>
          <button
            onClick={() => testContentAccess('test-file-2')}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ml-4"
          >
            Test Video Access  
          </button>
        </div>
        {testResults && (
          <div className="mt-4 p-4 border rounded bg-gray-50">
            <pre className="whitespace-pre-wrap">{testResults}</pre>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Content Viewer Component Test</h2>
        <ContentViewer 
          files={mockContentFiles}
          userHasAccess={!!session}
          className="max-w-2xl"
        />
      </div>
    </div>
  )
}
