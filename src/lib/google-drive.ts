// Google Drive Content Delivery Service
// Handles secure document delivery from Google Drive

import crypto from 'crypto'

interface GoogleDriveConfig {
  serviceAccountEmail: string
  privateKey: string
  folderId?: string
}

interface ContentMetadata {
  fileId: string
  fileName: string
  mimeType: string
  size: number
}

export class GoogleDriveService {
  private config: GoogleDriveConfig

  constructor(config: GoogleDriveConfig) {
    this.config = config
  }

  /**
   * Get file metadata from Google Drive using fetch
   */
  async getFileMetadata(fileId: string): Promise<ContentMetadata | null> {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,parents`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        console.error('Failed to get file metadata:', response.statusText)
        return null
      }

      const file = await response.json() as any
      return {
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        size: parseInt(file.size || '0', 10),
      }
    } catch (error) {
      console.error('Error getting file metadata:', error)
      return null
    }
  }

  /**
   * Generate a time-limited, signed download URL for a Google Drive file
   */
  generateSignedDownloadUrl(
    fileId: string,
    fileName: string,
    expiresInMinutes: number = 60
  ): string {
    const expiresAt = Math.floor(Date.now() / 1000) + (expiresInMinutes * 60)
    const signingSecret = process.env.CONTENT_SIGNING_SECRET

    if (!signingSecret) {
      throw new Error('CONTENT_SIGNING_SECRET environment variable is required')
    }

    // Create signature data
    const signatureData = `${fileId}:${fileName}:${expiresAt}`
    const signature = crypto
      .createHmac('sha256', signingSecret)
      .update(signatureData)
      .digest('hex')

    // Construct download URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/api/content/download/drive?fileId=${fileId}&fileName=${encodeURIComponent(fileName)}&expires=${expiresAt}&signature=${signature}`
  }

  /**
   * Verify a signed download URL
   */
  verifySignedUrl(fileId: string, fileName: string, expires: number, signature: string): boolean {
    const signingSecret = process.env.CONTENT_SIGNING_SECRET

    if (!signingSecret) {
      return false
    }

    // Check if URL has expired
    if (Date.now() / 1000 > expires) {
      return false
    }

    // Verify signature
    const signatureData = `${fileId}:${fileName}:${expires}`
    const expectedSignature = crypto
      .createHmac('sha256', signingSecret)
      .update(signatureData)
      .digest('hex')

    return signature === expectedSignature
  }

  /**
   * Get access token for Google Drive API
   */
  private async getAccessToken(): Promise<string> {
    try {
      const jwtHeader = Buffer.from(JSON.stringify({
        alg: 'RS256',
        typ: 'JWT'
      })).toString('base64url')

      const now = Math.floor(Date.now() / 1000)
      const jwtPayload = Buffer.from(JSON.stringify({
        iss: this.config.serviceAccountEmail,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      })).toString('base64url')

      const jwtUnsigned = `${jwtHeader}.${jwtPayload}`
      
      // Simple JWT signing (for production, consider using a proper JWT library)
      const signature = crypto
        .createSign('RSA-SHA256')
        .update(jwtUnsigned)
        .sign(this.config.privateKey.replace(/\\n/g, '\n'), 'base64url')

      const jwt = `${jwtUnsigned}.${signature}`

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      })

      const tokenData = await tokenResponse.json() as any
      
      if (!tokenData.access_token) {
        throw new Error('Failed to get access token')
      }

      return tokenData.access_token
    } catch (error) {
      console.error('Error getting access token:', error)
      throw new Error('Failed to authenticate with Google Drive')
    }
  }

  /**
   * Stream file content from Google Drive
   */
  async getFileStream(fileId: string): Promise<Response> {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`)
      }

      return response
    } catch (error) {
      console.error('Error streaming file:', error)
      throw new Error('Failed to stream file from Google Drive')
    }
  }

  /**
   * Validate that a file is accessible and in the correct format
   */
  async validateFile(fileId: string, expectedMimeTypes: string[]): Promise<boolean> {
    try {
      const metadata = await this.getFileMetadata(fileId)
      
      if (!metadata) {
        return false
      }

      return expectedMimeTypes.includes(metadata.mimeType)
    } catch (error) {
      console.error('Error validating file:', error)
      return false
    }
  }
}

// Create a singleton instance
let googleDriveService: GoogleDriveService | null = null

export function getGoogleDriveService(): GoogleDriveService {
  if (!googleDriveService) {
    const config = {
      serviceAccountEmail: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL!,
      privateKey: process.env.GOOGLE_DRIVE_PRIVATE_KEY!,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    }

    if (!config.serviceAccountEmail || !config.privateKey) {
      throw new Error(
        'Google Drive configuration is incomplete. Please set GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY environment variables.'
      )
    }

    googleDriveService = new GoogleDriveService(config)
  }

  return googleDriveService
}

// MIME type constants for document validation
export const SUPPORTED_DOCUMENT_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword',
} as const

export const DOCUMENT_MIME_TYPES = Object.values(SUPPORTED_DOCUMENT_TYPES)
