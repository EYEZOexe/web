// Content Access Hook
// Manages secure content delivery for Google Drive documents and YouTube videos

'use client'

import { useState, useCallback } from 'react'

interface ContentAccessResponse {
  success: boolean
  video?: {
    id: string
    title: string
    description?: string
    duration: number
    durationFormatted: string
    thumbnailUrl: string
    embedUrl: string
    embedHtml: string
  }
  error?: string
  expiresAt?: string
}

export function useContentAccess() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accessGoogleDriveFile = useCallback(async (
    fileId: string,
    fileName: string,
    expiresInMinutes: number = 60
  ): Promise<string | null> => {
    setLoading(true)
    setError(null)

    try {
      // Generate signed download URL
      const response = await fetch('/api/content/download/drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          fileName,
          expiresInMinutes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate download link')
      }

      const data = await response.json()
      return data.downloadUrl
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error accessing Google Drive file:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const accessYouTubeVideo = useCallback(async (
    videoId: string,
    title: string,
    expiresInMinutes: number = 120
  ): Promise<ContentAccessResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      // Generate signed video access URL
      const response = await fetch('/api/content/video/youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          title,
          expiresInMinutes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate video access')
      }

      const data = await response.json()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error accessing YouTube video:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const generateSignedDownloadUrl = useCallback(async (
    fileId: string,
    fileName: string
  ): Promise<string | null> => {
    // This generates the signed URL client-side using the same logic as server-side
    // In production, you'd want this to be server-side only
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
      
      const params = new URLSearchParams({
        fileId,
        fileName,
        expires: expiresAt.toString(),
        // Note: signature would be generated server-side for security
        signature: 'client-generated', // This would be replaced with actual server signature
      })

      return `/api/content/download/drive?${params.toString()}`
    } catch (err) {
      console.error('Error generating signed URL:', err)
      return null
    }
  }, [])

  const generateSignedVideoUrl = useCallback(async (
    videoId: string,
    title: string
  ): Promise<string | null> => {
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 hours
      
      const params = new URLSearchParams({
        videoId,
        title,
        expires: expiresAt.toString(),
        // Note: signature would be generated server-side for security
        signature: 'client-generated', // This would be replaced with actual server signature
      })

      return `/api/content/video/youtube?${params.toString()}`
    } catch (err) {
      console.error('Error generating signed video URL:', err)
      return null
    }
  }, [])

  const downloadFile = useCallback(async (
    downloadUrl: string,
    fileName: string
  ): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        throw new Error('Download failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed'
      setError(errorMessage)
      console.error('Error downloading file:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const validateUserAccess = useCallback(async (
    userId: string,
    contentId: string,
    contentType: 'document' | 'video'
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/content/validate-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          contentId,
          contentType,
        }),
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      return data.hasAccess === true
    } catch (err) {
      console.error('Error validating user access:', err)
      return false
    }
  }, [])

  return {
    loading,
    error,
    accessGoogleDriveFile,
    accessYouTubeVideo,
    generateSignedDownloadUrl,
    generateSignedVideoUrl,
    downloadFile,
    validateUserAccess,
  }
}
