import { test, expect } from '@playwright/test'
import { 
  TEST_USERS, 
  setupAuthenticatedUser, 
  cleanupTestUser,
  isAuthenticated 
} from './auth-utils'

test.describe('Homepage', () => {
  
  test.afterEach(async ({ page }) => {
    await cleanupTestUser(page, TEST_USERS.customer.email)
  })

  test.describe('Unauthenticated Homepage', () => {
    test('should load the homepage successfully', async ({ page }) => {
      await page.goto('/')
      
      await expect(page).toHaveTitle('Digital Products Platform')
      
      // Should show auth links for unauthenticated users
      await expect(page.locator('a[href="/auth/signin"]').first()).toBeVisible()
      await expect(page.locator('a[href="/auth/signup"]').first()).toBeVisible()
    })

    test('should navigate to auth pages from homepage', async ({ page }) => {
      await page.goto('/')
      
      // Click signin link
      await page.click('a[href="/auth/signin"]:first-child')
      await expect(page).toHaveURL(/\/auth\/signin/)
      
      // Go back to homepage
      await page.goto('/')
      
      // Click signup link
      await page.click('a[href="/auth/signup"]:first-child')
      await expect(page).toHaveURL(/\/auth\/signup/)
    })

    test('should display marketing content for visitors', async ({ page }) => {
      await page.goto('/')
      
      // Should have compelling content for visitors
      await expect(page.locator('h1, h2').first()).toBeVisible()
      
      // Should have call-to-action elements
      const hasCallToAction = await Promise.race([
        page.locator('text=/get started|sign up|join/i').isVisible(),
        page.locator('a[href="/auth/signup"]').isVisible(),
        page.locator('button:has-text("Start"), button:has-text("Join")').isVisible()
      ])
      
      expect(hasCallToAction).toBe(true)
    })

    test('should show product preview or features', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Should show some indication of what the platform offers
      const hasProductInfo = await Promise.race([
        page.locator('text=/courses|digital products|files|licenses/i').isVisible(),
        page.locator('text=/features|benefits|what you get/i').isVisible(),
        page.locator('[data-testid="feature-list"]').isVisible(),
        page.locator('.feature, .benefit, .product-preview').first().isVisible()
      ])
      
      expect(hasProductInfo).toBe(true)
    })
  })

  test.describe('Authenticated Homepage', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
    })

    test('should show personalized content for authenticated users', async ({ page }) => {
      await page.goto('/')
      
      // Should show user-specific content
      const authenticated = await isAuthenticated(page)
      expect(authenticated).toBe(true)
      
      // Should have different navigation for authenticated users
      const hasUserMenu = await Promise.race([
        page.locator('[data-testid="user-menu"]').isVisible(),
        page.locator('button:has-text("Account"), button:has-text("Profile")').isVisible(),
        page.locator('text=/dashboard|my account|settings/i').isVisible()
      ])
      
      expect(hasUserMenu).toBe(true)
    })

    test('should provide quick access to main features', async ({ page }) => {
      await page.goto('/')
      
      // Should have links to main application areas
      const hasQuickAccess = await Promise.race([
        page.locator('a[href="/products"]').isVisible(),
        page.locator('a[href="/dashboard"]').isVisible(),
        page.locator('a[href="/library"]').isVisible(),
        page.locator('text=/browse products|my library|dashboard/i').isVisible()
      ])
      
      expect(hasQuickAccess).toBe(true)
    })

    test('should allow navigation to protected areas', async ({ page }) => {
      await page.goto('/')
      
      // Try to navigate to products (should work when authenticated)
      const productsLink = page.locator('a[href="/products"]').first()
      
      if (await productsLink.isVisible()) {
        await productsLink.click()
        await expect(page).toHaveURL('/products')
      } else {
        // Navigate directly
        await page.goto('/products')
        await expect(page).toHaveURL('/products')
      }
    })
  })

  test.describe('Navigation and Layout', () => {
    test('should have proper navigation structure', async ({ page }) => {
      await page.goto('/')
      
      // Should have main navigation elements
      const hasNavigation = await Promise.race([
        page.locator('nav').isVisible(),
        page.locator('[role="navigation"]').isVisible(),
        page.locator('header nav').isVisible(),
        page.locator('.navbar, .navigation, .header-nav').isVisible()
      ])
      
      expect(hasNavigation).toBe(true)
    })

    test('should have footer with relevant links', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Check for footer
      const hasFooter = await Promise.race([
        page.locator('footer').isVisible(),
        page.locator('[role="contentinfo"]').isVisible(),
        page.locator('.footer').isVisible()
      ])
      
      if (hasFooter) {
        // Footer should have useful links
        const hasFooterLinks = await Promise.race([
          page.locator('footer a').first().isVisible(),
          page.locator('text=/privacy|terms|contact|about/i').isVisible()
        ])
        
        expect(hasFooterLinks).toBe(true)
      }
    })

    test('should be responsive on different screen sizes', async ({ page }) => {
      await page.goto('/')
      
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForLoadState('networkidle')
      
      // Should still be functional on mobile
      await expect(page.locator('h1, h2').first()).toBeVisible()
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.waitForLoadState('networkidle')
      
      await expect(page.locator('h1, h2').first()).toBeVisible()
      
      // Reset to desktop
      await page.setViewportSize({ width: 1280, height: 720 })
    })
  })

  test.describe('Performance and Loading', () => {
    test('should load quickly without errors', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      // Should load within reasonable time (5 seconds for E2E)
      expect(loadTime).toBeLessThan(5000)
    })

    test('should handle slow network gracefully', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', route => {
        // Add delay to all requests
        setTimeout(() => route.continue(), 100)
      })
      
      await page.goto('/')
      
      // Should still load, even if slowly
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
    })

    test('should not have console errors', async ({ page }) => {
      const errors: string[] = []
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })
      
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      
      // Filter out known acceptable errors (like NextAuth warnings)
      const criticalErrors = errors.filter(error => 
        !error.includes('next-auth') &&
        !error.includes('Warning') &&
        !error.includes('404') &&
        !error.includes('favicon')
      )
      
      expect(criticalErrors).toHaveLength(0)
    })
  })
})
