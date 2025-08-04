// Content Access Component
// Displays secure download links and video embeds for purchased content

'use client'

import { useState } from 'react'
import { Download, Play, FileText, Video, AlertCircle, Clock } from 'lucide-react'

interface ContentFile {
  id: string
  name: string
  contentType: 'pdf' | 'docx' | 'video' | 'file'
  googleDriveFileId?: string
  youtubeVideoId?: string
  fileSize?: number
  duration?: number
  description?: string
}

interface ContentAccessProps {
  files: ContentFile[]
  hasAccess: boolean
  licenseExpiration?: string
  onAccessFile: (_fileId: string, _contentType: string) => Promise<string | null>
}

export function ContentAccess({ files, hasAccess, licenseExpiration, onAccessFile }: ContentAccessProps) {
  const [accessingFiles, setAccessingFiles] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleFileAccess = async (file: ContentFile) => {
    if (!hasAccess) {
      setErrors(prev => ({ ...prev, [file.id]: 'Access denied. Please purchase this content.' }))
      return
    }

    setAccessingFiles(prev => new Set(prev).add(file.id))
    setErrors(prev => ({ ...prev, [file.id]: '' }))

    try {
      const accessUrl = await onAccessFile(file.id, file.contentType)
      
      if (accessUrl) {
        if (file.contentType === 'video') {
          // For videos, open in a new tab or modal
          window.open(accessUrl, '_blank')
        } else {
          // For documents, trigger download
          const link = document.createElement('a')
          link.href = accessUrl
          link.download = file.name
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      } else {
        setErrors(prev => ({ ...prev, [file.id]: 'Failed to access content. Please try again.' }))
      }
    } catch (error) {
      console.error('Error accessing file:', error)
      setErrors(prev => ({ ...prev, [file.id]: 'An error occurred while accessing the content.' }))
    } finally {
      setAccessingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(file.id)
        return newSet
      })
    }
  }

  const getFileIcon = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return <Video className="w-5 h-5" />
      case 'pdf':
      case 'docx':
        return <FileText className="w-5 h-5" />
      default:
        return <Download className="w-5 h-5" />
    }
  }

  const getFileTypeLabel = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return 'Video'
      case 'pdf':
        return 'PDF Document'
      case 'docx':
        return 'Word Document'
      default:
        return 'File'
    }
  }

  const isExpired = licenseExpiration && new Date(licenseExpiration) < new Date()

  return (
    <div className="space-y-4">
      {/* License Status */}
      {licenseExpiration && (
        <div className={`p-4 rounded-lg border ${isExpired ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
          <div className="flex items-center gap-2">
            {isExpired ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : (
              <Clock className="w-5 h-5 text-blue-600" />
            )}
            <span className={`font-medium ${isExpired ? 'text-red-800' : 'text-blue-800'}`}>
              {isExpired ? 'Access Expired' : 'Access Expires'}
            </span>
            <span className={`${isExpired ? 'text-red-600' : 'text-blue-600'}`}>
              {new Date(licenseExpiration).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* Content Files */}
      <div className="space-y-3">
        {files.map((file) => (
          <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {getFileIcon(file.contentType)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{file.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {getFileTypeLabel(file.contentType)}
                    {file.fileSize && ` • ${formatBytes(file.fileSize)}`}
                    {file.duration && ` • ${formatDuration(file.duration)}`}
                  </p>
                  {file.description && (
                    <p className="text-sm text-gray-600 mt-2">{file.description}</p>
                  )}
                  {errors[file.id] && (
                    <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors[file.id]}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleFileAccess(file)}
                disabled={!hasAccess || isExpired || accessingFiles.has(file.id)}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ml-4 ${
                  file.contentType === 'video'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100'
                } disabled:cursor-not-allowed`}
              >
                {accessingFiles.has(file.id) ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : file.contentType === 'video' ? (
                  <>
                    <Play className="w-4 h-4 mr-2 inline" />
                    Watch
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2 inline" />
                    Download
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {files.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No content files available for this product.</p>
        </div>
      )}

      {!hasAccess && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">Access Required</span>
          </div>
          <p className="text-yellow-700 mt-1">
            You need to purchase this product to access the content.
          </p>
        </div>
      )}
    </div>
  )
}

// Utility functions for formatting
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
