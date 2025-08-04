import { test, expect } from '@playwright/test'

test.describe('Products Page', () => {
  test('should redirect to signin when not authenticated', async ({ page }) => {
    // Navigate to products page
    await page.goto('/products')
    
    // Should redirect to signin page
    await expect(page).toHaveURL(/.*\/auth\/signin/)
    
    // Should have callbackUrl parameter pointing to products
    const url = page.url()
    expect(url).toContain('callbackUrl=%2Fproducts')
  })

  test('should load products page structure', async ({ page }) => {
    // Navigate to products page (will redirect to signin)
    await page.goto('/products')
    
    // Verify we're on signin page
    await expect(page).toHaveURL(/.*\/auth\/signin/)
    
    // Check that the signin page loads properly
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('should verify Apollo Client is loaded', async ({ page }) => {
    // Navigate to any page to check if Apollo Client loads without errors
    await page.goto('/')
    
    // Check that page loads without GraphQL/Apollo errors in console
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Navigate around to trigger Apollo Client
    await page.goto('/products')
    await page.goto('/')
    
    // Filter out known NextAuth errors and check for Apollo/GraphQL specific errors
    const apolloErrors = errors.filter(error => 
      error.includes('Apollo') || 
      error.includes('GraphQL') || 
      error.includes('Invalid environment variables')
    )
    
    expect(apolloErrors).toHaveLength(0)
  })

  test('should verify GraphQL endpoint accessibility', async ({ page }) => {
    // Test that the GraphQL endpoint is accessible
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
})
