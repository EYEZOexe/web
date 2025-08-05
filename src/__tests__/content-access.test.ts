import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the route handler - we'll import it inside the tests
let POST: any

// Mock the auth function
const mockAuth = vi.fn()
vi.mock('../auth', () => ({
  auth: mockAuth
}))

// Mock Apollo Client
const mockQuery = vi.fn()
vi.mock('@apollo/client', () => ({
  ApolloClient: vi.fn(() => ({
    query: mockQuery
  })),
  InMemoryCache: vi.fn(),
  gql: vi.fn((template: TemplateStringsArray) => template[0])
}))

describe('/api/content/access', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Set up environment variables
    process.env.CONTENT_SIGNING_SECRET = 'test-secret-32-characters-long-123456'
    process.env.FRONTEND_URL = 'http://localhost:3000'
    
    // Import the route handler
    const routeModule = await import('../app/api/content/access/route')
    POST = routeModule.POST
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'test-file-id' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 401 when user session has no user ID', async () => {
      mockAuth.mockResolvedValue({ user: {} })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'test-file-id' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('Request Validation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } })
    })

    it('should return 400 when productFileId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Product file ID is required')
    })

    it('should return 400 when productFileId is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: '' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Product file ID is required')
    })
  })

  describe('Content Access', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } })
    })

    it('should return 404 when product file not found', async () => {
      mockQuery.mockResolvedValueOnce({ data: { productFile: null } })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'nonexistent-file' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Content not found')
    })

    it('should return 403 when user lacks valid license for protected content', async () => {
      // Mock product file requiring license
      mockQuery
        .mockResolvedValueOnce({
          data: {
            productFile: {
              id: 'file-123',
              name: 'Test File',
              contentType: 'pdf',
              requiresLicense: true,
              googleDriveShareableLink: 'https://drive.google.com/file/d/test-id/view',
              product: { id: 'product-123' }
            }
          }
        })
        // Mock no valid licenses
        .mockResolvedValueOnce({
          data: { licenses: [] }
        })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'file-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied. Please purchase this content.')
    })

    it('should grant access when user has valid license', async () => {
      // Mock product file requiring license
      mockQuery
        .mockResolvedValueOnce({
          data: {
            productFile: {
              id: 'file-123',
              name: 'Test Document.pdf',
              contentType: 'pdf',
              requiresLicense: true,
              googleDriveShareableLink: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
              product: { id: 'product-123' }
            }
          }
        })
        // Mock valid license
        .mockResolvedValueOnce({
          data: {
            licenses: [{
              id: 'license-123',
              status: 'active',
              expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
              orderItem: { product: { id: 'product-123' } }
            }]
          }
        })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'file-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.contentType).toBe('document')
      expect(data.fileName).toBe('Test Document.pdf')
      expect(data.accessUrl).toContain('/api/content/download/drive')
      expect(data.expiresAt).toBeDefined()
    })

    it('should grant access for public content without license check', async () => {
      // Mock public product file
      mockQuery.mockResolvedValueOnce({
        data: {
          productFile: {
            id: 'file-123',
            name: 'Public Document.pdf',
            contentType: 'pdf',
            requiresLicense: false,
            googleDriveShareableLink: 'https://drive.google.com/file/d/test-id/view',
            product: { id: 'product-123' }
          }
        }
      })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'file-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.contentType).toBe('document')
      expect(data.fileName).toBe('Public Document.pdf')
      expect(data.accessUrl).toContain('/api/content/download/drive')
      // Should not have queried for licenses since file doesn't require them
      expect(mockQuery).toHaveBeenCalledTimes(1)
    })
  })

  describe('Content Type Handling', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } })
    })

    it('should handle YouTube video content', async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          productFile: {
            id: 'video-123',
            name: 'Tutorial Video',
            contentType: 'video',
            requiresLicense: false,
            youtubeUnlistedLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            product: { id: 'product-123' }
          }
        }
      })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'video-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.contentType).toBe('video')
      expect(data.videoId).toBe('dQw4w9WgXcQ')
      expect(data.embedUrl).toContain('youtube.com/embed/dQw4w9WgXcQ')
      expect(data.accessUrl).toContain('/api/content/video/youtube')
    })

    it('should return error for unsupported content type', async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          productFile: {
            id: 'file-123',
            name: 'Unknown File',
            contentType: 'unknown',
            requiresLicense: false,
            product: { id: 'product-123' }
          }
        }
      })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'file-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate content access')
    })

    it('should return error for missing Google Drive link', async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          productFile: {
            id: 'file-123',
            name: 'Document without link',
            contentType: 'pdf',
            requiresLicense: false,
            googleDriveShareableLink: null,
            product: { id: 'product-123' }
          }
        }
      })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'file-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Document not configured')
    })

    it('should return error for missing YouTube link', async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          productFile: {
            id: 'video-123',
            name: 'Video without link',
            contentType: 'video',
            requiresLicense: false,
            youtubeUnlistedLink: null,
            product: { id: 'product-123' }
          }
        }
      })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'video-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Video not configured')
    })
  })

  describe('License Validation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } })
    })

    it('should reject expired license', async () => {
      mockQuery
        .mockResolvedValueOnce({
          data: {
            productFile: {
              id: 'file-123',
              name: 'Test File',
              contentType: 'pdf',
              requiresLicense: true,
              googleDriveShareableLink: 'https://drive.google.com/file/d/test-id/view',
              product: { id: 'product-123' }
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            licenses: [{
              id: 'license-123',
              status: 'active',
              expiresAt: new Date(Date.now() - 86400000).toISOString(), // 24 hours ago
              orderItem: { product: { id: 'product-123' } }
            }]
          }
        })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'file-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied. Please purchase this content.')
    })

    it('should reject inactive license', async () => {
      mockQuery
        .mockResolvedValueOnce({
          data: {
            productFile: {
              id: 'file-123',
              name: 'Test File',
              contentType: 'pdf',
              requiresLicense: true,
              googleDriveShareableLink: 'https://drive.google.com/file/d/test-id/view',
              product: { id: 'product-123' }
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            licenses: [{
              id: 'license-123',
              status: 'cancelled',
              expiresAt: null,
              orderItem: { product: { id: 'product-123' } }
            }]
          }
        })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'file-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied. Please purchase this content.')
    })

    it('should accept license without expiration date (lifetime access)', async () => {
      mockQuery
        .mockResolvedValueOnce({
          data: {
            productFile: {
              id: 'file-123',
              name: 'Test File',
              contentType: 'pdf',
              requiresLicense: true,
              googleDriveShareableLink: 'https://drive.google.com/file/d/test-id/view',
              product: { id: 'product-123' }
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            licenses: [{
              id: 'license-123',
              status: 'active',
              expiresAt: null, // Lifetime access
              orderItem: { product: { id: 'product-123' } }
            }]
          }
        })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'file-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('URL Generation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } })
    })

    it('should generate valid signed URLs for documents', async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          productFile: {
            id: 'file-123',
            name: 'Test Document.pdf',
            contentType: 'pdf',
            requiresLicense: false,
            googleDriveShareableLink: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
            product: { id: 'product-123' }
          }
        }
      })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'file-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.accessUrl).toMatch(/^http:\/\/localhost:3000\/api\/content\/download\/drive\?/)
      expect(data.accessUrl).toContain('fileId=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')
      expect(data.accessUrl).toContain('fileName=Test%20Document.pdf')
      expect(data.accessUrl).toContain('expires=')
      expect(data.accessUrl).toContain('signature=')
    })

    it('should generate valid signed URLs for videos', async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          productFile: {
            id: 'video-123',
            name: 'Tutorial Video',
            contentType: 'video',
            requiresLicense: false,
            youtubeUnlistedLink: 'https://youtu.be/jNQXAC9IVRw',
            product: { id: 'product-123' }
          }
        }
      })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'video-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.accessUrl).toMatch(/^http:\/\/localhost:3000\/api\/content\/video\/youtube\?/)
      expect(data.accessUrl).toContain('videoId=jNQXAC9IVRw')
      expect(data.accessUrl).toContain('title=Tutorial%20Video')
      expect(data.accessUrl).toContain('expires=')
      expect(data.accessUrl).toContain('signature=')
      expect(data.embedUrl).toBe('https://www.youtube.com/embed/jNQXAC9IVRw?controls=1&modestbranding=1&showinfo=0&rel=0')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } })
    })

    it('should handle GraphQL query errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'file-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate content access')
    })

    it('should handle missing environment variables', async () => {
      delete process.env.CONTENT_SIGNING_SECRET

      mockQuery.mockResolvedValueOnce({
        data: {
          productFile: {
            id: 'file-123',
            name: 'Test File',
            contentType: 'pdf',
            requiresLicense: false,
            googleDriveShareableLink: 'https://drive.google.com/file/d/test-id/view',
            product: { id: 'product-123' }
          }
        }
      })

      const request = new NextRequest('http://localhost:3000/api/content/access', {
        method: 'POST',
        body: JSON.stringify({ productFileId: 'file-123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate content access')
    })
  })
})
