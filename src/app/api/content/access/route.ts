// Main Content Access API
// Ultra-simple content delivery using shareable links only

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'

interface ContentAccessRequest {
  productFileId: string
  licenseId?: string
}

// Initialize Apollo Client for KeystoneJS GraphQL API
const apolloClient = new ApolloClient({
  uri: process.env.GRAPHQL_API_URL || 'http://localhost:3001/api/graphql',
  cache: new InMemoryCache(),
})

const GET_PRODUCT_FILE = gql`
  query GetProductFile($id: ID!) {
    productFile(where: { id: $id }) {
      id
      name
      contentType
      googleDriveShareableLink
      youtubeUnlistedLink
      requiresLicense
      product {
        id
        name
      }
    }
  }
`

const GET_USER_LICENSES = gql`
  query GetUserLicenses($userId: ID!, $productId: ID!) {
    licenses(
      where: {
        user: { id: { equals: $userId } }
        orderItem: { product: { id: { equals: $productId } } }
        status: { equals: "active" }
      }
    ) {
      id
      status
      expiresAt
      orderItem {
        product {
          id
        }
      }
    }
  }
`

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: ContentAccessRequest = await request.json()
    const { productFileId } = body

    if (!productFileId) {
      return NextResponse.json(
        { error: 'Product file ID is required' },
        { status: 400 }
      )
    }

    // Get product file details
    const { data: fileData } = await apolloClient.query({
      query: GET_PRODUCT_FILE,
      variables: { id: productFileId },
    })

    if (!fileData?.productFile) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }

    const productFile = fileData.productFile

    // Validate user access if license is required
    if (productFile.requiresLicense) {
      const { data: licenseData } = await apolloClient.query({
        query: GET_USER_LICENSES,
        variables: { 
          userId: session.user.id, 
          productId: productFile.product.id 
        },
      })

      const licenses = licenseData?.licenses || []
      const hasValidLicense = licenses.some((license: any) => {
        if (license.status !== 'active') return false
        if (license.expiresAt && new Date(license.expiresAt) < new Date()) return false
        return true
      })

      if (!hasValidLicense) {
        return NextResponse.json(
          { error: 'Access denied. Please purchase this content.' },
          { status: 403 }
        )
      }
    }

    // Generate content access based on type
    const response = await generateContentAccess(productFile)
    
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in content access API:', error)
    return NextResponse.json(
      { error: 'Failed to generate content access' },
      { status: 500 }
    )
  }
}

async function generateContentAccess(productFile: any) {
  const signingSecret = process.env.CONTENT_SIGNING_SECRET
  if (!signingSecret) {
    throw new Error('CONTENT_SIGNING_SECRET environment variable is required')
  }

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'

  switch (productFile.contentType) {
    case 'pdf':
    case 'docx':
      return await generateDocumentAccess(productFile, baseUrl, signingSecret)
    
    case 'video':
      return await generateVideoAccess(productFile, baseUrl, signingSecret)
    
    default:
      throw new Error('Unsupported content type')
  }
}

async function generateDocumentAccess(productFile: any, baseUrl: string, signingSecret: string) {
  if (!productFile.googleDriveShareableLink) {
    return { success: false, error: 'Document not configured' }
  }

  // Extract file ID from shareable link
  const fileId = extractGoogleDriveFileId(productFile.googleDriveShareableLink)
  if (!fileId) {
    return { success: false, error: 'Invalid Google Drive link' }
  }

  // Generate time-limited signed access URL
  const expiresInMinutes = 60 // 1 hour
  const expiresAt = Math.floor(Date.now() / 1000) + (expiresInMinutes * 60)
  
  const crypto = require('crypto')
  const signatureData = `${fileId}:${productFile.name}:${expiresAt}`
  const signature = crypto
    .createHmac('sha256', signingSecret)
    .update(signatureData)
    .digest('hex')

  const accessUrl = `${baseUrl}/api/content/download/drive?fileId=${fileId}&fileName=${encodeURIComponent(productFile.name)}&expires=${expiresAt}&signature=${signature}`

  return {
    success: true,
    contentType: 'document',
    accessUrl,
    fileName: productFile.name,
    expiresAt: new Date(expiresAt * 1000).toISOString()
  }
}

async function generateVideoAccess(productFile: any, baseUrl: string, signingSecret: string) {
  if (!productFile.youtubeUnlistedLink) {
    return { success: false, error: 'Video not configured' }
  }

  // Extract video ID from YouTube URL
  const videoId = extractYouTubeVideoId(productFile.youtubeUnlistedLink)
  if (!videoId) {
    return { success: false, error: 'Invalid YouTube link' }
  }

  // Generate time-limited signed access URL
  const expiresInMinutes = 120 // 2 hours
  const expiresAt = Math.floor(Date.now() / 1000) + (expiresInMinutes * 60)
  
  const crypto = require('crypto')
  const signatureData = `${videoId}:${productFile.name}:${expiresAt}`
  const signature = crypto
    .createHmac('sha256', signingSecret)
    .update(signatureData)
    .digest('hex')

  const accessUrl = `${baseUrl}/api/content/video/youtube?videoId=${videoId}&title=${encodeURIComponent(productFile.name)}&expires=${expiresAt}&signature=${signature}`
  const embedUrl = `https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1&showinfo=0&rel=0`

  return {
    success: true,
    contentType: 'video',
    accessUrl,
    embedUrl,
    videoId,
    title: productFile.name,
    expiresAt: new Date(expiresAt * 1000).toISOString()
  }
}

function extractGoogleDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
    /^([a-zA-Z0-9-_]+)$/, // Direct file ID
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
