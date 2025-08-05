import '@testing-library/jest-dom'

// Mock CSS imports
import { vi } from 'vitest'

// Mock CSS modules
vi.mock('*.css', () => ({}))
vi.mock('*.scss', () => ({}))
vi.mock('*.sass', () => ({}))

// Mock Next.js
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    query: {},
    pathname: '/',
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    query: {},
    pathname: '/',
  }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER'
      },
      expires: '2024-12-31T23:59:59.000Z'
    },
    status: 'authenticated'
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock next/server
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server')
  return {
    ...actual,
    NextRequest: class MockNextRequest {
      url: string
      method: string
      body: ReadableStream<Uint8Array>
      headers: Headers

      constructor(url: string, init?: RequestInit) {
        this.url = url
        this.method = init?.method || 'GET'
        this.headers = new Headers(init?.headers)
        
        if (init?.body) {
          if (typeof init.body === 'string') {
            const encoder = new TextEncoder()
            this.body = new ReadableStream({
              start(controller) {
                controller.enqueue(encoder.encode(init.body as string))
                controller.close()
              }
            })
          } else {
            this.body = init.body as ReadableStream<Uint8Array>
          }
        } else {
          this.body = new ReadableStream({
            start(controller) {
              controller.close()
            }
          })
        }
      }

      async json() {
        const reader = this.body.getReader()
        const decoder = new TextDecoder()
        let result = ''
        
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            result += decoder.decode(value, { stream: true })
          }
          return JSON.parse(result)
        } finally {
          reader.releaseLock()
        }
      }
    }
  }
})
