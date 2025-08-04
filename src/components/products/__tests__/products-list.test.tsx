import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import ProductsList from '../products-list'
import { GET_PRODUCTS } from '@/lib/graphql/queries'

const mockProducts = [
  {
    id: '1',
    name: 'Course 1',
    slug: 'course-1',
    description: 'Test course',
    type: 'course',
    status: 'ACTIVE',
    price: '2999',
    compareAtPrice: null,
    currency: 'USD',
    tags: [],
    downloadLimit: null,
    accessDuration: null,
    metaTitle: 'Course 1',
    metaDescription: 'Test course description',
    category: { 
      id: '1', 
      name: 'Development',
      slug: 'development',
      description: 'Development courses'
    },
    variants: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Digital File',
    slug: 'digital-file',
    description: 'Test file',
    type: 'file',
    status: 'ACTIVE',
    price: '1999',
    compareAtPrice: null,
    currency: 'USD',
    tags: [],
    downloadLimit: null,
    accessDuration: null,
    metaTitle: 'Digital File',
    metaDescription: 'Test file description',
    category: { 
      id: '2', 
      name: 'Design',
      slug: 'design',
      description: 'Design files'
    },
    variants: [
      {
        id: 'v1',
        name: 'Basic',
        price: '1999',
        compareAtPrice: null,
        downloadLimit: null,
        accessDuration: null,
        isActive: true,
        currency: 'USD'
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

const mocks = [
  {
    request: {
      query: GET_PRODUCTS,
      variables: { take: 10, skip: 0 }
    },
    result: {
      data: {
        products: mockProducts
      }
    }
  }
]

const errorMocks = [
  {
    request: {
      query: GET_PRODUCTS,
      variables: { take: 10, skip: 0 }
    },
    error: new Error('GraphQL error')
  }
]

describe('ProductsList Component', () => {
  it('renders loading state initially', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <ProductsList />
      </MockedProvider>
    )

    // Check for loading skeleton structure
    expect(document.querySelector('.animate-pulse')).toBeDefined()
    // Check for skeleton grid
    expect(document.querySelector('.grid')).toBeDefined()
  })

  it('renders products after loading', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProductsList />
      </MockedProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Course 1')).toBeDefined()
      expect(screen.getByText('Digital File')).toBeDefined()
    })
  })

  it('displays product details correctly', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProductsList />
      </MockedProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Course 1')).toBeDefined()
      expect(screen.getByText('Test course')).toBeDefined()
      expect(screen.getByText('Development')).toBeDefined()
    })
  })

  it('shows purchase buttons for products', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProductsList />
      </MockedProvider>
    )

    await waitFor(() => {
      const purchaseButtons = screen.getAllByText(/Purchase for|Buy/)
      expect(purchaseButtons.length).toBeGreaterThan(0)
    })
  })

  it('handles GraphQL errors gracefully', async () => {
    render(
      <MockedProvider mocks={errorMocks} addTypename={false}>
        <ProductsList />
      </MockedProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Error loading products/)).toBeDefined()
    })
  })

  it('displays product variants when available', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ProductsList />
      </MockedProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/1 variant available/)).toBeDefined()
    })
  })

  it('shows empty state when no products', async () => {
    const emptyMocks = [
      {
        request: {
          query: GET_PRODUCTS,
          variables: { take: 10, skip: 0 }
        },
        result: {
          data: {
            products: []
          }
        }
      }
    ]

    render(
      <MockedProvider mocks={emptyMocks} addTypename={false}>
        <ProductsList />
      </MockedProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/No Products Available/)).toBeDefined()
    })
  })
})
