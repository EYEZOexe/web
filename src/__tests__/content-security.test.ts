import { describe, it, expect, beforeEach } from 'vitest'
import { ContentSecurityManager, getProductionSecurityConfig } from '../lib/content-security'

// Unit tests for the content security manager
describe('ContentSecurityManager', () => {
  let securityManager: ContentSecurityManager

  beforeEach(() => {
    const config = {
      signingSecret: 'test-secret-32-characters-long-123456',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedContentTypes: ['pdf', 'docx', 'video'],
      maxDownloadsPerHour: 10,
      signatureExpirationMinutes: {
        documents: 60,
        videos: 120,
      }
    }
    securityManager = new ContentSecurityManager(config)
  })

  describe('Configuration Validation', () => {
    it('should throw error for short signing secret', () => {
      expect(() => {
        new ContentSecurityManager({
          signingSecret: 'short',
          maxFileSize: 1024,
          allowedContentTypes: ['pdf'],
          maxDownloadsPerHour: 10,
          signatureExpirationMinutes: { documents: 60, videos: 120 }
        })
      }).toThrow('Content signing secret must be at least 32 characters long')
    })

    it('should throw error for negative file size', () => {
      expect(() => {
        new ContentSecurityManager({
          signingSecret: 'test-secret-32-characters-long-123456',
          maxFileSize: -1,
          allowedContentTypes: ['pdf'],
          maxDownloadsPerHour: 10,
          signatureExpirationMinutes: { documents: 60, videos: 120 }
        })
      }).toThrow('Max file size must be positive')
    })

    it('should throw error for empty content types', () => {
      expect(() => {
        new ContentSecurityManager({
          signingSecret: 'test-secret-32-characters-long-123456',
          maxFileSize: 1024,
          allowedContentTypes: [],
          maxDownloadsPerHour: 10,
          signatureExpirationMinutes: { documents: 60, videos: 120 }
        })
      }).toThrow('At least one content type must be allowed')
    })
  })

  describe('Signature Generation and Validation', () => {
    it('should generate and validate correct signatures', () => {
      const params = {
        fileId: 'test-file-123',
        fileName: 'test-document.pdf',
        contentType: 'pdf',
        userId: 'user-456',
        expiresAt: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      }

      const signature = securityManager.generateSignature(params)
      expect(signature).toBeDefined()
      expect(signature).toHaveLength(64) // SHA-256 hex string

      const validation = securityManager.validateSignature(
        signature,
        params.fileId,
        params.fileName,
        params.contentType,
        params.userId,
        params.expiresAt
      )

      expect(validation.isValid).toBe(true)
      expect(validation.fileId).toBe(params.fileId)
      expect(validation.userId).toBe(params.userId)
    })

    it('should reject expired signatures', () => {
      const params = {
        fileId: 'test-file-123',
        fileName: 'test-document.pdf',
        contentType: 'pdf',
        userId: 'user-456',
        expiresAt: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      }

      const signature = securityManager.generateSignature(params)
      const validation = securityManager.validateSignature(
        signature,
        params.fileId,
        params.fileName,
        params.contentType,
        params.userId,
        params.expiresAt
      )

      expect(validation.isValid).toBe(false)
      expect(validation.error).toBe('Access link has expired')
    })

    it('should reject tampered signatures', () => {
      const params = {
        fileId: 'test-file-123',
        fileName: 'test-document.pdf',
        contentType: 'pdf',
        userId: 'user-456',
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      }

      const signature = securityManager.generateSignature(params)
      
      // Try with tampered file ID
      const validation = securityManager.validateSignature(
        signature,
        'tampered-file-id',
        params.fileName,
        params.contentType,
        params.userId,
        params.expiresAt
      )

      expect(validation.isValid).toBe(false)
      expect(validation.error).toBe('Invalid access signature')
    })
  })

  describe('URL Generation', () => {
    it('should generate secure access URLs', () => {
      const params = {
        fileId: 'test-file-123',
        fileName: 'test document.pdf',
        contentType: 'pdf',
        userId: 'user-456',
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      }

      const url = securityManager.generateSecureAccessUrl(
        'https://example.com',
        '/api/content/access',
        params
      )

      expect(url).toContain('https://example.com/api/content/access')
      expect(url).toContain('fileId=test-file-123')
      expect(url).toContain('fileName=test+document.pdf') // URL encoding uses + for spaces
      expect(url).toContain('userId=user-456')
      expect(url).toContain('expires=')
      expect(url).toContain('signature=')
    })
  })

  describe('Content Type Validation', () => {
    it('should allow configured content types', () => {
      expect(securityManager.isContentTypeAllowed('pdf')).toBe(true)
      expect(securityManager.isContentTypeAllowed('docx')).toBe(true)
      expect(securityManager.isContentTypeAllowed('video')).toBe(true)
    })

    it('should reject non-configured content types', () => {
      expect(securityManager.isContentTypeAllowed('exe')).toBe(false)
      expect(securityManager.isContentTypeAllowed('script')).toBe(false)
      expect(securityManager.isContentTypeAllowed('')).toBe(false)
    })
  })

  describe('File Size Validation', () => {
    it('should allow files within size limit', () => {
      expect(securityManager.isFileSizeAllowed(1024)).toBe(true)
      expect(securityManager.isFileSizeAllowed(5 * 1024 * 1024)).toBe(true)
    })

    it('should reject files exceeding size limit', () => {
      expect(securityManager.isFileSizeAllowed(20 * 1024 * 1024)).toBe(false)
    })
  })

  describe('Google Drive URL Validation', () => {
    it('should validate correct Google Drive URLs', () => {
      const validUrls = [
        'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
        'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing',
        'https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
      ]

      validUrls.forEach(url => {
        const result = securityManager.validateGoogleDriveLink(url)
        expect(result.isValid).toBe(true)
        expect(result.fileId).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')
      })
    })

    it('should reject invalid Google Drive URLs', () => {
      const invalidUrls = [
        '',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'invalid-file-id',
        'https://drive.google.com/file/d/short/view'
      ]

      invalidUrls.forEach(url => {
        const result = securityManager.validateGoogleDriveLink(url)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('YouTube URL Validation', () => {
    it('should validate correct YouTube URLs', () => {
      const validUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'dQw4w9WgXcQ'
      ]

      validUrls.forEach(url => {
        const result = securityManager.validateYouTubeLink(url)
        expect(result.isValid).toBe(true)
        expect(result.videoId).toBe('dQw4w9WgXcQ')
      })
    })

    it('should reject invalid YouTube URLs', () => {
      const invalidUrls = [
        '',
        'https://drive.google.com/file/d/123/view',
        'invalid-video-id',
        'https://youtube.com/watch?v=short'
      ]

      invalidUrls.forEach(url => {
        const result = securityManager.validateYouTubeLink(url)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('File Name Sanitization', () => {
    it('should sanitize unsafe filenames', () => {
      const testCases = [
        { input: 'normal-file.pdf', expected: 'normal-file.pdf' },
        { input: 'file with spaces.docx', expected: 'file_with_spaces.docx' },
        { input: 'file<script>alert("xss")</script>.pdf', expected: 'file_script_alert_xss_script_.pdf' },
        { input: 'file/with\\slashes.txt', expected: 'file_with_slashes.txt' },
        { input: 'very___long___filename.pdf', expected: 'very_long_filename.pdf' }
      ]

      testCases.forEach(({ input, expected }) => {
        const result = securityManager.sanitizeFileName(input)
        expect(result).toBe(expected)
      })
    })

    it('should limit filename length', () => {
      const longFilename = 'a'.repeat(150) + '.pdf'
      const sanitized = securityManager.sanitizeFileName(longFilename)
      expect(sanitized.length).toBeLessThanOrEqual(100)
    })
  })

  describe('Rate Limiting', () => {
    it('should allow requests within limit', () => {
      for (let i = 0; i < 5; i++) {
        const result = securityManager.checkRateLimit('test-user')
        expect(result.allowed).toBe(true)
        expect(result.remainingRequests).toBe(10 - i - 1)
      }
    })

    it('should block requests exceeding limit', () => {
      // Use up the rate limit
      for (let i = 0; i < 10; i++) {
        securityManager.checkRateLimit('test-user-2')
      }

      // Next request should be blocked
      const result = securityManager.checkRateLimit('test-user-2')
      expect(result.allowed).toBe(false)
      expect(result.remainingRequests).toBeUndefined()
    })

    it('should reset rate limit after time window', () => {
      // Create a manager with low limits for testing
      const manager = new ContentSecurityManager({
        signingSecret: 'test-secret-32-characters-long-123456',
        maxFileSize: 1024,
        allowedContentTypes: ['pdf'],
        maxDownloadsPerHour: 2,
        signatureExpirationMinutes: { documents: 60, videos: 120 }
      })

      // Use up limit
      manager.checkRateLimit('test-user-3')
      manager.checkRateLimit('test-user-3')
      
      const blockedResult = manager.checkRateLimit('test-user-3')
      expect(blockedResult.allowed).toBe(false)

      // Manually clear the rate limit records to simulate time passing
      ContentSecurityManager['downloadCounts'].clear()
      
      // Should allow new requests after reset
      const newResult = manager.checkRateLimit('test-user-3')
      expect(newResult.allowed).toBe(true)
    })
  })

  describe('Security Headers', () => {
    it('should generate proper security headers', () => {
      const headers = securityManager.getSecurityHeaders()
      
      expect(headers).toEqual({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      })
    })
  })

  describe('Expiration Time Calculation', () => {
    it('should return correct expiration times for different content types', () => {
      const now = Math.floor(Date.now() / 1000)
      
      const pdfExpiry = securityManager.getExpirationTime('pdf')
      const videoExpiry = securityManager.getExpirationTime('video')
      const unknownExpiry = securityManager.getExpirationTime('unknown')

      expect(pdfExpiry).toBeGreaterThan(now)
      expect(pdfExpiry).toBeLessThanOrEqual(now + (60 * 60)) // 1 hour
      
      expect(videoExpiry).toBeGreaterThan(now)
      expect(videoExpiry).toBeLessThanOrEqual(now + (120 * 60)) // 2 hours
      
      expect(unknownExpiry).toBeLessThanOrEqual(now + (60 * 60)) // defaults to document timing
    })
  })

  describe('Production Config', () => {
    it('should create valid production configuration', () => {
      // Mock environment variable
      const originalSecret = process.env.CONTENT_SIGNING_SECRET
      process.env.CONTENT_SIGNING_SECRET = 'production-secret-32-chars-long-123'
      
      const config = getProductionSecurityConfig()
      
      expect(config.signingSecret).toBe('production-secret-32-chars-long-123')
      expect(config.maxFileSize).toBe(100 * 1024 * 1024) // 100MB
      expect(config.allowedContentTypes).toEqual(['pdf', 'docx', 'video', 'file'])
      expect(config.maxDownloadsPerHour).toBe(50)
      expect(config.signatureExpirationMinutes.documents).toBe(60)
      expect(config.signatureExpirationMinutes.videos).toBe(120)
      
      // Restore original value
      process.env.CONTENT_SIGNING_SECRET = originalSecret
    })
  })
})
