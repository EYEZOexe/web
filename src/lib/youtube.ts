// YouTube Content Delivery Service
// Handles unlisted video integration and metadata

import crypto from 'crypto'

interface YouTubeVideoMetadata {
  videoId: string
  title: string
  description?: string
  duration: number // in seconds
  thumbnailUrl: string
}

interface EmbedOptions {
  autoplay?: boolean
  controls?: boolean
  showInfo?: boolean
  modestBranding?: boolean
  width?: number
  height?: number
}

export class YouTubeService {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Get video metadata from YouTube API
   */
  async getVideoMetadata(videoId: string): Promise<YouTubeVideoMetadata | null> {
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${this.apiKey}`
      
      const response = await fetch(url)
      const data = await response.json() as any

      if (!data.items || data.items.length === 0) {
        return null
      }

      const video = data.items[0]
      const duration = this.parseISO8601Duration(video.contentDetails.duration)

      return {
        videoId,
        title: video.snippet.title,
        description: video.snippet.description,
        duration,
        thumbnailUrl: video.snippet.thumbnails.maxres?.url || 
                     video.snippet.thumbnails.high?.url ||
                     video.snippet.thumbnails.medium?.url ||
                     video.snippet.thumbnails.default?.url || '',
      }
    } catch (error) {
      console.error('Error fetching YouTube video metadata:', error)
      return null
    }
  }

  /**
   * Generate a signed video access URL with time-limited access
   */
  generateSignedVideoUrl(
    videoId: string,
    title: string,
    expiresInMinutes: number = 120
  ): string {
    const expiresAt = Math.floor(Date.now() / 1000) + (expiresInMinutes * 60)
    const signingSecret = process.env.CONTENT_SIGNING_SECRET

    if (!signingSecret) {
      throw new Error('CONTENT_SIGNING_SECRET environment variable is required')
    }

    // Create signature data
    const signatureData = `${videoId}:${title}:${expiresAt}`
    const signature = crypto
      .createHmac('sha256', signingSecret)
      .update(signatureData)
      .digest('hex')

    // Construct video access URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/api/content/video/youtube?videoId=${videoId}&title=${encodeURIComponent(title)}&expires=${expiresAt}&signature=${signature}`
  }

  /**
   * Verify a signed video URL
   */
  verifySignedUrl(videoId: string, title: string, expires: number, signature: string): boolean {
    const signingSecret = process.env.CONTENT_SIGNING_SECRET

    if (!signingSecret) {
      return false
    }

    // Check if URL has expired
    if (Date.now() / 1000 > expires) {
      return false
    }

    // Verify signature
    const signatureData = `${videoId}:${title}:${expires}`
    const expectedSignature = crypto
      .createHmac('sha256', signingSecret)
      .update(signatureData)
      .digest('hex')

    return signature === expectedSignature
  }

  /**
   * Generate YouTube embed HTML for unlisted videos
   */
  generateEmbedHtml(videoId: string, options: EmbedOptions = {}): string {
    const {
      autoplay = false,
      controls = true,
      showInfo = false,
      modestBranding = true,
      width = 560,
      height = 315,
    } = options

    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      controls: controls ? '1' : '0',
      showinfo: showInfo ? '1' : '0',
      modestbranding: modestBranding ? '1' : '0',
      rel: '0', // Don't show related videos
      iv_load_policy: '3', // Hide video annotations
    })

    return `<iframe 
      width="${width}" 
      height="${height}" 
      src="https://www.youtube.com/embed/${videoId}?${params.toString()}" 
      title="YouTube video player" 
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
      allowfullscreen>
    </iframe>`
  }

  /**
   * Generate YouTube embed URL for unlisted videos
   */
  generateEmbedUrl(videoId: string, options: EmbedOptions = {}): string {
    const {
      autoplay = false,
      controls = true,
      showInfo = false,
      modestBranding = true,
    } = options

    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      controls: controls ? '1' : '0',
      showinfo: showInfo ? '1' : '0',
      modestbranding: modestBranding ? '1' : '0',
      rel: '0',
      iv_load_policy: '3',
    })

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
  }

  /**
   * Extract video ID from various YouTube URL formats
   */
  extractVideoId(url: string): string | null {
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

  /**
   * Validate that a YouTube video exists and is accessible
   */
  async validateVideo(videoId: string): Promise<boolean> {
    try {
      const metadata = await this.getVideoMetadata(videoId)
      return metadata !== null
    } catch (error) {
      console.error('Error validating YouTube video:', error)
      return false
    }
  }

  /**
   * Get video thumbnail URL
   */
  getThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string {
    return `https://img.youtube.com/vi/${videoId}/${quality === 'maxres' ? 'maxresdefault' : quality === 'high' ? 'hqdefault' : quality === 'medium' ? 'mqdefault' : 'default'}.jpg`
  }

  /**
   * Parse ISO 8601 duration format (PT4M13S) to seconds
   */
  private parseISO8601Duration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0

    const hours = parseInt(match[1] || '0', 10)
    const minutes = parseInt(match[2] || '0', 10)
    const seconds = parseInt(match[3] || '0', 10)

    return hours * 3600 + minutes * 60 + seconds
  }

  /**
   * Format duration in seconds to human-readable format
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}

// Create a singleton instance
let youtubeService: YouTubeService | null = null

export function getYouTubeService(): YouTubeService {
  if (!youtubeService) {
    const apiKey = process.env.YOUTUBE_API_KEY

    if (!apiKey) {
      throw new Error(
        'YouTube API configuration is incomplete. Please set YOUTUBE_API_KEY environment variable.'
      )
    }

    youtubeService = new YouTubeService(apiKey)
  }

  return youtubeService
}
