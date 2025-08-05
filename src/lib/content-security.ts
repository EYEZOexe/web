// Content Delivery Security Configuration
// This module provides security utilities for the content delivery system

import crypto from 'crypto'

interface SecurityConfig {
  signingSecret: string
  maxFileSize: number
  allowedContentTypes: string[]
  maxDownloadsPerHour: number
  signatureExpirationMinutes: {
    documents: number
    videos: number
  }
}

interface SignedUrlParams {
  fileId: string
  fileName: string
  contentType: string
  userId: string
  expiresAt: number
}

interface ValidationResult {
  isValid: boolean
  error?: string
  fileId?: string
  userId?: string
  expiresAt?: number
}

export class ContentSecurityManager {
  private config: SecurityConfig

  constructor(config: SecurityConfig) {
    this.config = config
    this.validateConfig()
  }

  private validateConfig(): void {
    if (!this.config.signingSecret || this.config.signingSecret.length < 32) {
      throw new Error('Content signing secret must be at least 32 characters long')
    }
    
    if (this.config.maxFileSize <= 0) {
      throw new Error('Max file size must be positive')
    }
    
    if (this.config.allowedContentTypes.length === 0) {
      throw new Error('At least one content type must be allowed')
    }
  }

  /**
   * Generate a secure, time-limited signature for content access
   */
  generateSignature(params: SignedUrlParams): string {
    const signatureData = [
      params.fileId,
      params.fileName,
      params.contentType,
      params.userId,
      params.expiresAt.toString()
    ].join(':')

    return crypto
      .createHmac('sha256', this.config.signingSecret)
      .update(signatureData)
      .digest('hex')
  }

  /**
   * Validate a signed URL signature
   */
  validateSignature(
    signature: string,
    fileId: string,
    fileName: string,
    contentType: string,
    userId: string,
    expiresAt: number
  ): ValidationResult {
    // Check if expired
    if (Date.now() > expiresAt * 1000) {
      return { isValid: false, error: 'Access link has expired' }
    }

    // Regenerate signature and compare
    const expectedSignature = this.generateSignature({
      fileId,
      fileName,
      contentType,
      userId,
      expiresAt
    })

    // Use constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )) {
      return { isValid: false, error: 'Invalid access signature' }
    }

    return { 
      isValid: true, 
      fileId, 
      userId, 
      expiresAt 
    }
  }

  /**
   * Generate secure access URL with rate limiting considerations
   */
  generateSecureAccessUrl(
    baseUrl: string,
    endpoint: string,
    params: SignedUrlParams
  ): string {
    const signature = this.generateSignature(params)
    
    const url = new URL(`${baseUrl}${endpoint}`)
    url.searchParams.set('fileId', params.fileId)
    url.searchParams.set('fileName', params.fileName)
    url.searchParams.set('userId', params.userId)
    url.searchParams.set('expires', params.expiresAt.toString())
    url.searchParams.set('signature', signature)
    
    return url.toString()
  }

  /**
   * Validate content type is allowed
   */
  isContentTypeAllowed(contentType: string): boolean {
    return this.config.allowedContentTypes.includes(contentType)
  }

  /**
   * Validate file size is within limits
   */
  isFileSizeAllowed(fileSize: number): boolean {
    return fileSize <= this.config.maxFileSize
  }

  /**
   * Get expiration time for content type
   */
  getExpirationTime(contentType: string): number {
    const now = Math.floor(Date.now() / 1000)
    
    switch (contentType) {
      case 'pdf':
      case 'docx':
      case 'file':
        return now + (this.config.signatureExpirationMinutes.documents * 60)
      case 'video':
        return now + (this.config.signatureExpirationMinutes.videos * 60)
      default:
        return now + (this.config.signatureExpirationMinutes.documents * 60)
    }
  }

  /**
   * Extract and validate Google Drive file ID
   */
  validateGoogleDriveLink(url: string): { isValid: boolean; fileId?: string; error?: string } {
    if (!url) {
      return { isValid: false, error: 'Google Drive URL is required' }
    }

    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/,
      /id=([a-zA-Z0-9-_]+)/,
      /^([a-zA-Z0-9-_]+)$/, // Direct file ID
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        const fileId = match[1]
        // Validate file ID format
        if (fileId.length >= 20 && /^[a-zA-Z0-9-_]+$/.test(fileId)) {
          return { isValid: true, fileId }
        }
      }
    }

    return { isValid: false, error: 'Invalid Google Drive URL format' }
  }

  /**
   * Extract and validate YouTube video ID
   */
  validateYouTubeLink(url: string): { isValid: boolean; videoId?: string; error?: string } {
    if (!url) {
      return { isValid: false, error: 'YouTube URL is required' }
    }

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        const videoId = match[1]
        // YouTube video IDs are always 11 characters
        if (videoId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(videoId)) {
          return { isValid: true, videoId }
        }
      }
    }

    return { isValid: false, error: 'Invalid YouTube URL format' }
  }

  /**
   * Sanitize filename for safe URLs
   */
  sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9\-_.]/g, '_') // Replace unsafe characters
      .replace(/_{2,}/g, '_') // Replace multiple underscores
      .substring(0, 100) // Limit length
  }

  /**
   * Rate limiting check (basic implementation)
   * In production, use Redis or similar for distributed rate limiting
   */
  private static downloadCounts: Map<string, { count: number; resetAt: number }> = new Map()

  checkRateLimit(userId: string): { allowed: boolean; remainingRequests?: number } {
    const now = Date.now()
    const hourlyLimit = this.config.maxDownloadsPerHour
    const resetTime = now + (60 * 60 * 1000) // 1 hour from now

    const userRecord = ContentSecurityManager.downloadCounts.get(userId)

    if (!userRecord || now > userRecord.resetAt) {
      // New hour or new user
      ContentSecurityManager.downloadCounts.set(userId, { 
        count: 1, 
        resetAt: resetTime 
      })
      return { allowed: true, remainingRequests: hourlyLimit - 1 }
    }

    if (userRecord.count >= hourlyLimit) {
      return { allowed: false }
    }

    // Increment count
    userRecord.count++
    return { 
      allowed: true, 
      remainingRequests: hourlyLimit - userRecord.count 
    }
  }

  /**
   * Clean up expired rate limit records
   */
  static cleanupRateLimitRecords(): void {
    const now = Date.now()
    ContentSecurityManager.downloadCounts.forEach((record, userId) => {
      if (now > record.resetAt) {
        ContentSecurityManager.downloadCounts.delete(userId)
      }
    })
  }

  /**
   * Generate content security headers
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }
}

// Default production security configuration
export const getProductionSecurityConfig = (): SecurityConfig => ({
  signingSecret: process.env.CONTENT_SIGNING_SECRET || '',
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedContentTypes: ['pdf', 'docx', 'video', 'file'],
  maxDownloadsPerHour: 50, // Per user per hour
  signatureExpirationMinutes: {
    documents: 60, // 1 hour for documents
    videos: 120,   // 2 hours for videos
  }
})

// Create singleton instance for production use
let securityManager: ContentSecurityManager | null = null

export function getSecurityManager(): ContentSecurityManager {
  if (!securityManager) {
    const config = getProductionSecurityConfig()
    securityManager = new ContentSecurityManager(config)
  }
  return securityManager
}

// Clean up rate limit records every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    ContentSecurityManager.cleanupRateLimitRecords()
  }, 30 * 60 * 1000)
}
