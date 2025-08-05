import { test, expect } from '@playwright/test'

test.describe('Debug Validation', () => {
  test('should debug password validation form', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/auth/signup')
    
    // Fill the form with mismatched passwords
    await page.fill('#name', 'Test User')
    await page.fill('#email', 'test@example.com')
    await page.fill('#password', 'password123')
    await page.fill('#confirmPassword', 'different123')
    
    console.log('Form filled, submitting...')
    
    // Take screenshot before submit
    await page.screenshot({ path: 'debug-before-submit.png' })
    
    // Submit the form
    await page.click('button[type="submit"]')
    
    // Wait a bit for any processing
    await page.waitForTimeout(2000)
    
    // Take screenshot after submit
    await page.screenshot({ path: 'debug-after-submit.png' })
    
    // Check what elements are on the page
    const alerts = await page.locator('[role="alert"]').all()
    console.log(`Found ${alerts.length} alert elements`)
    
    for (let i = 0; i < alerts.length; i++) {
      const text = await alerts[i].textContent()
      const isVisible = await alerts[i].isVisible()
      console.log(`Alert ${i}: "${text}" (visible: ${isVisible})`)
    }
    
    // Check for any error text
    const bodyText = await page.locator('body').textContent()
    if (bodyText?.includes('Passwords do not match')) {
      console.log('Found password mismatch text in body')
    }
    
    if (bodyText?.includes('password')) {
      console.log('Found password-related text in body')
    }
    
    // Check current URL
    console.log('Current URL:', page.url())
  })
})
