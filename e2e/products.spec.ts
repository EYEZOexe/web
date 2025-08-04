import { test, expect } from '@playwright/test'
import { 
  TEST_USERS, 
  setupAuthenticatedUser, 
  cleanupTestUser,
  createTestUser 
} from './auth-utils'

test.describe('Products Page', () => {
  
  test.afterEach(async ({ page }) => {
    // Clean up test users
    await cleanupTestUser(page, TEST_USERS.customer.email)
  })

  test.describe('Unauthenticated Access', () => {
    test('should redirect to signin when not authenticated', async ({ page }) => {
      await page.goto('/products')
      
      // Should redirect to signin page with callback URL
      await expect(page).toHaveURL(/.*\/auth\/signin/)
      
      const url = page.url()
      expect(url).toContain('callbackUrl=%2Fproducts')
      
      // Should show signin page elements
      await expect(page.getByRole('heading', { name: /welcome back|sign in/i })).toBeVisible()
    })
  })

  test.describe('Authenticated Access', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
    })

    test('should load products page when authenticated', async ({ page }) => {
      await page.goto('/products')
      
      // Should successfully load products page
      await expect(page).toHaveURL('/products')
      await expect(page).toHaveTitle('Digital Products Platform')
      
      // Should show products-related content
      // Wait for Apollo Client to load and render products
      await page.waitForLoadState('networkidle')
      
      // Look for product-related elements (loading state or actual products)
      const hasLoadingOrProducts = await Promise.race([
        page.locator('[data-testid="products-loading"]').isVisible(),
        page.locator('[data-testid="products-list"]').isVisible(),
        page.locator('text=No products found').isVisible(),
        page.locator('.product-item').first().isVisible(),
      ])
      
      expect(hasLoadingOrProducts).toBe(true)
    })

    test('should display products from GraphQL API', async ({ page }) => {
      // First, ensure we have some test products in the database
      await createTestProducts(page)
      
      await page.goto('/products')
      await page.waitForLoadState('networkidle')
      
      // Check for product elements
      // The exact selectors depend on your ProductsList component implementation
      const productElements = page.locator('[data-testid="product-item"]')
      
      // Should have at least one product
      await expect(productElements.first()).toBeVisible({ timeout: 10000 })
      
      // Check for product details
      await expect(page.locator('text=/Course|File|License/')).toBeVisible()
      await expect(page.locator('text=/\$\d+/')).toBeVisible() // Price
    })

    test('should handle product categories', async ({ page }) => {
      await createTestProducts(page)
      await page.goto('/products')
      await page.waitForLoadState('networkidle')
      
      // Look for category filters or displays
      const categoryElements = page.locator('[data-testid="product-category"]')
      
      if (await categoryElements.first().isVisible()) {
        // Should show category information
        await expect(categoryElements.first()).toContainText(/Development|Design|Business/)
      }
    })

    test('should allow product interaction', async ({ page }) => {
      await createTestProducts(page)
      await page.goto('/products')
      await page.waitForLoadState('networkidle')
      
      const firstProduct = page.locator('[data-testid="product-item"]').first()
      await expect(firstProduct).toBeVisible({ timeout: 10000 })
      
      // Should have purchase button or view details
      const purchaseButton = firstProduct.locator('button:has-text("Purchase"), button:has-text("Buy Now"), a:has-text("View Details")')
      await expect(purchaseButton.first()).toBeVisible()
    })
  })

  test.describe('Apollo Client Integration', () => {
    test('should load Apollo Client without errors', async ({ page }) => {
      // Monitor console for Apollo/GraphQL errors
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Filter out known errors and focus on Apollo/GraphQL
      const apolloErrors = errors.filter(error => 
        error.includes('Apollo') || 
        error.includes('GraphQL') ||
        error.includes('Network error') ||
        (error.includes('fetch') && error.includes('4000'))
      )
      
      expect(apolloErrors).toHaveLength(0)
    })

    test('should verify GraphQL endpoint accessibility', async ({ page }) => {
      const response = await page.request.post('http://localhost:4000/api/graphql', {
        data: {
          query: `
            query {
              __typename
            }
          `
        }
      })
      
      expect(response.status()).toBe(200)
      const data = await response.json()
      expect(data.data.__typename).toBe('Query')
    })

    test('should handle GraphQL query for products', async ({ page }) => {
      const response = await page.request.post('http://localhost:4000/api/graphql', {
        data: {
          query: `
            query GetProducts {
              products {
                id
                name
                description
                type
                price
                currency
                category {
                  id
                  name
                }
              }
            }
          `
        }
      })
      
      expect(response.status()).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveProperty('products')
      expect(Array.isArray(data.data.products)).toBe(true)
    })
  })

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
      
      // Intercept GraphQL requests and simulate error
      await page.route('**/api/graphql', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ message: 'Internal server error' }]
          })
        })
      })
      
      await page.goto('/products')
      await page.waitForLoadState('networkidle')
      
      // Should show error state
      await expect(page.locator('text=/error|failed|something went wrong/i')).toBeVisible({ timeout: 10000 })
    })

    test('should handle network timeout', async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
      
      // Simulate slow/timeout network
      await page.route('**/api/graphql', route => {
        // Never fulfill to simulate timeout
        // The component should handle this gracefully
      })
      
      await page.goto('/products')
      
      // Should show loading state initially
      await expect(page.locator('text=/loading|fetching/i')).toBeVisible({ timeout: 5000 })
    })
  })
})

/**
 * Helper function to create test products in the database
 */
async function createTestProducts(page: any): Promise<void> {
  const testProducts = [
    {
      name: 'Test Course 1',
      description: 'A comprehensive test course',
      type: 'course',
      price: '2999',
      currency: 'USD',
      isActive: true,
      category: 'Development'
    },
    {
      name: 'Test Digital File',
      description: 'A useful digital file',
      type: 'file', 
      price: '1999',
      currency: 'USD',
      isActive: true,
      category: 'Design'
    }
  ]

  for (const product of testProducts) {
    try {
      // First create category if it doesn't exist
      await page.request.post('http://localhost:4000/api/graphql', {
        data: {
          query: `
            mutation CreateCategory($data: CategoryCreateInput!) {
              createCategory(data: $data) {
                id
                name
              }
            }
          `,
          variables: {
            data: {
              name: product.category,
              description: `${product.category} category`,
              isActive: true
            }
          }
        }
      })

      // Then create the product
      await page.request.post('http://localhost:4000/api/graphql', {
        data: {
          query: `
            mutation CreateProduct($data: ProductCreateInput!) {
              createProduct(data: $data) {
                id
                name
              }
            }
          `,
          variables: {
            data: {
              name: product.name,
              description: product.description,
              type: product.type,
              price: product.price,
              currency: product.currency,
              isActive: product.isActive,
              category: {
                connect: {
                  name: product.category
                }
              }
            }
          }
        }
      })
    } catch (error) {
      // Products might already exist, which is fine for testing
      console.warn('Could not create test product:', error)
    }
  }
}
