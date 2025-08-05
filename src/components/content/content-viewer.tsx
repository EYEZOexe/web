'use client'

import { useState } from 'react'
import { Button } from '@repo/ui'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@repo/ui'
import { FileText, Video, ExternalLink, Clock } from 'lucide-react'

interface ContentFile {
  id: string
  name: string
  contentType: 'pdf' | 'docx' | 'video' | 'file'
  description?: string
  googleDriveShareableLink?: string
  youtubeUnlistedLink?: string
  requiresLicense: boolean
  product: {
    id: string
    name: string
  }
}

interface ContentViewerProps {
  files: ContentFile[]
  userHasAccess?: boolean
  className?: string
}

interface ContentAccess {
  success: boolean
  contentType: 'document' | 'video'
  accessUrl?: string
  embedUrl?: string
  videoId?: string
  fileName?: string
  title?: string
  expiresAt?: string
  error?: string
}

export function ContentViewer({ files, userHasAccess = false, className }: ContentViewerProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [accessResults, setAccessResults] = useState<Record<string, ContentAccess>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleAccessContent = async (fileId: string) => {
    if (!userHasAccess) {
      setErrors(prev => ({ ...prev, [fileId]: 'Please purchase this content to access it.' }))
      return
    }

    setLoadingStates(prev => ({ ...prev, [fileId]: true }))
    setErrors(prev => ({ ...prev, [fileId]: '' }))

    try {
      const response = await fetch('/api/content/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productFileId: fileId,
        }),
      })

      const result: ContentAccess = await response.json()

      if (result.success && result.accessUrl) {
        setAccessResults(prev => ({ ...prev, [fileId]: result }))
        
        // Store the access result but don't automatically open
        // Let the user choose when to open via the buttons
      } else {
        setErrors(prev => ({ ...prev, [fileId]: result.error || 'Failed to access content' }))
      }
    } catch (error) {
      console.error('Error accessing content:', error)
      setErrors(prev => ({ ...prev, [fileId]: 'Failed to access content. Please try again.' }))
    } finally {
      setLoadingStates(prev => ({ ...prev, [fileId]: false }))
    }
  }

  const formatExpiryTime = (expiresAt: string) => {
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diffMinutes = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60))
    
    if (diffMinutes > 60) {
      const hours = Math.floor(diffMinutes / 60)
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    } else {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
    }
  }

  const getFileIcon = (contentType: string) => {
    switch (contentType) {
      case 'pdf':
      case 'docx':
      case 'file':
        return <FileText className="h-5 w-5" />
      case 'video':
        return <Video className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getFileTypeLabel = (contentType: string) => {
    switch (contentType) {
      case 'pdf':
        return 'PDF Document'
      case 'docx':
        return 'Word Document'
      case 'video':
        return 'Video'
      case 'file':
        return 'File Download'
      default:
        return 'File'
    }
  }

  if (files.length === 0) {
    return (
      <div className={`text-center py-8 ${className || ''}`}>
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No content files available.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {files.map((file) => {
        const isLoading = loadingStates[file.id]
        const error = errors[file.id]
        const accessResult = accessResults[file.id]

        return (
          <Card key={file.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getFileIcon(file.contentType)}
                {file.name}
              </CardTitle>
              <CardDescription>
                {getFileTypeLabel(file.contentType)}
                {file.description && ` • ${file.description}`}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4">
                  {error}
                </div>
              )}

              {accessResult && accessResult.success && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <Clock className="h-4 w-4" />
                    Access expires in {formatExpiryTime(accessResult.expiresAt!)}
                  </div>
                  
                  {accessResult.contentType === 'video' && accessResult.embedUrl && (
                    <div className="mt-3">
                      <div className="aspect-video">
                        <iframe
                          src={accessResult.embedUrl}
                          className="w-full h-full rounded"
                          allowFullScreen
                          title={accessResult.title || file.name}
                        />
                      </div>
                    </div>
                  )}

                  {accessResult.contentType === 'document' && accessResult.embedUrl && (
                    <div className="mt-3">
                      <div className="h-96 border rounded">
                        <iframe
                          src={accessResult.embedUrl}
                          className="w-full h-full rounded"
                          title={accessResult.title || file.name}
                        />
                      </div>
                      <div className="mt-2 text-xs text-green-600">
                        Document is embedded above. If it doesn&apos;t load, use the &quot;Open Direct&quot; button below.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter>
              <div className="flex gap-2 w-full">
                <Button
                  onClick={() => handleAccessContent(file.id)}
                  disabled={isLoading || !userHasAccess}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Loading...
                    </>
                  ) : (
                    <>
                      {file.contentType === 'video' ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      {file.contentType === 'video' ? 'Watch Video' : 'View Document'}
                    </>
                  )}
                </Button>

                {accessResult && accessResult.success && accessResult.accessUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(accessResult.accessUrl, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Direct
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        )
      })}

      {!userHasAccess && (
        <div className="text-center py-6 bg-muted/50 rounded-lg border-2 border-dashed">
          <p className="text-muted-foreground">
            Purchase this product to access the content files.
          </p>
        </div>
      )}
    </div>
  )
}
