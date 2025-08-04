// Ultra-Simple YouTube Video Access API
// Just verify signature and redirect to YouTube - no API needed!

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    const title = searchParams.get('title')
    const expires = searchParams.get('expires')
    const signature = searchParams.get('signature')

    // Validate required parameters
    if (!videoId || !title || !expires || !signature) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Validate expiration
    const expirationTime = parseInt(expires, 10)
    const currentTime = Math.floor(Date.now() / 1000)
    
    if (currentTime > expirationTime) {
      return NextResponse.json(
        { error: 'Access link has expired' },
        { status: 410 }
      )
    }

    // Validate signature
    const signingSecret = process.env.CONTENT_SIGNING_SECRET
    if (!signingSecret) {
      console.error('CONTENT_SIGNING_SECRET environment variable is not set')
      return NextResponse.json(
        { error: 'Content signing not configured' },
        { status: 500 }
      )
    }

    const expectedSignature = crypto
      .createHmac('sha256', signingSecret)
      .update(`${videoId}:${title}:${expires}`)
      .digest('hex')

    if (signature !== expectedSignature) {
      return NextResponse.json(
        { error: 'Invalid access signature' },
        { status: 403 }
      )
    }

    // Generate YouTube watch URL for unlisted videos
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`

    // Redirect to YouTube
    return NextResponse.redirect(watchUrl, 302)

  } catch (error) {
    console.error('Error in YouTube video access API:', error)
    return NextResponse.json(
      { error: 'Failed to process video access' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
