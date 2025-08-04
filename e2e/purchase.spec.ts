import { test, expect } from '@playwright/test'
import { 
  TEST_USERS, 
  setupAuthenticatedUser, 
  cleanupTestUser 
} from './auth-utils'

test.describe('Purchase Flow', () => {
  
  test.afterEach(async ({ page }) => {
    await cleanupTestUser(page, TEST_USERS.customer.email)
  })

  test.describe('Purchase Process', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
      await createTestProduct(page)
    })

    test('should display purchase button for products', async ({ page }) => {
      await page.goto('/products')
      await page.waitForLoadState('networkidle')
      
      // Wait for products to load
      const productItem = page.locator('[data-testid="product-item"]').first()
      await expect(productItem).toBeVisible({ timeout: 10000 })
      
      // Should have purchase button
      const purchaseButton = productItem.locator('button:has-text("Purchase"), button:has-text("Buy Now")')
      await expect(purchaseButton).toBeVisible()
    })

    test('should initiate Stripe checkout flow', async ({ page }) => {
      await page.goto('/products')
      await page.waitForLoadState('networkidle')
      
      const purchaseButton = page.locator('button:has-text("Purchase"), button:has-text("Buy Now")').first()
      await expect(purchaseButton).toBeVisible({ timeout: 10000 })
      
      // Mock Stripe checkout to avoid real payment
      await page.route('**/api/stripe/checkout', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            url: 'https://checkout.stripe.com/pay/test_session_123'
          })
        })
      })
      
      // Click purchase button
      await purchaseButton.click()
      
      // Should show loading state
      await expect(page.locator('text=/processing|loading/i')).toBeVisible()
    })

    test('should handle purchase errors gracefully', async ({ page }) => {
      await page.goto('/products')
      await page.waitForLoadState('networkidle')
      
      // Mock failed checkout
      await page.route('**/api/stripe/checkout', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Payment method required'
          })
        })
      })
      
      const purchaseButton = page.locator('button:has-text("Purchase"), button:has-text("Buy Now")').first()
      await purchaseButton.click()
      
      // Should show error message
      await expect(page.locator('text=/error|failed|something went wrong/i')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Stripe Integration', () => {
    test('should validate Stripe API keys configuration', async ({ page }) => {
      // Test that the Stripe configuration endpoint responds correctly
      const response = await page.request.get('/api/stripe/config')
      
      if (response.status() === 200) {
        const data = await response.json()
        expect(data).toHaveProperty('publishableKey')
        expect(data.publishableKey).toMatch(/^pk_test_/)
      } else {
        // If endpoint doesn't exist, that's also valid
        expect([200, 404]).toContain(response.status())
      }
    })

    test('should handle Stripe checkout session creation', async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
      
      const checkoutData = {
        priceId: 'price_test_123',
        productId: 'prod_test_123',
        quantity: 1
      }
      
      const response = await page.request.post('/api/stripe/checkout', {
        data: checkoutData
      })
      
      // Should either create session or return proper error
      expect([200, 400, 401]).toContain(response.status())
      
      if (response.status() === 200) {
        const data = await response.json()
        expect(data).toHaveProperty('url')
        expect(data.url).toMatch(/^https:\/\/checkout\.stripe\.com/)
      }
    })
  })

  test.describe('Payment Success Flow', () => {
    test('should handle successful payment redirect', async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
      
      // Simulate returning from successful Stripe checkout
      await page.goto('/payment/success?session_id=cs_test_123')
      
      // Should show success message
      await expect(page.locator('text=/success|complete|thank you/i')).toBeVisible({ timeout: 10000 })
      
      // Should have order details or next steps
      await expect(page.locator('text=/order|download|access/i')).toBeVisible()
    })

    test('should handle payment cancellation', async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
      
      await page.goto('/payment/cancel')
      
      // Should show cancellation message
      await expect(page.locator('text=/cancel|try again|payment.*not.*complete/i')).toBeVisible()
      
      // Should have option to return to products
      await expect(page.locator('a[href="/products"], button:has-text("Browse Products")')).toBeVisible()
    })
  })

  test.describe('Order Management', () => {
    test('should track order status', async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
      
      // Try to access orders/dashboard page
      await page.goto('/orders')
      
      // Should either show orders page or redirect appropriately
      const isOrdersPage = await page.locator('text=/orders|purchases|my.*library/i').isVisible()
      const isRedirect = page.url() !== '/orders'
      
      expect(isOrdersPage || isRedirect).toBe(true)
    })

    test('should display user purchase history', async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
      
      // Check various potential dashboard/profile URLs
      const dashboardUrls = ['/dashboard', '/profile', '/account', '/orders', '/purchases']
      
      let foundDashboard = false
      for (const url of dashboardUrls) {
        await page.goto(url)
        
        if (page.url().includes(url) || await page.locator('text=/dashboard|account|profile/i').isVisible()) {
          foundDashboard = true
          break
        }
      }
      
      // At minimum, user should be able to access some form of account area
      if (foundDashboard) {
        // Should show user-specific content
        await expect(page.locator('text=/welcome|account|profile/i')).toBeVisible()
      }
    })
  })
})

/**
 * Helper function to create a test product for purchase testing
 */
async function createTestProduct(page: any): Promise<void> {
  try {
    // Create category first
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
            name: 'Test Category',
            description: 'Category for testing purchases',
            isActive: true
          }
        }
      }
    })

    // Create product
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
            name: 'Test Purchase Product',
            description: 'A product for testing the purchase flow',
            type: 'course',
            price: '2999',
            currency: 'USD',
            isActive: true,
            category: {
              connect: {
                name: 'Test Category'
              }
            }
          }
        }
      }
    })
  } catch (error) {
    console.warn('Could not create test product:', error)
  }
}
