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
