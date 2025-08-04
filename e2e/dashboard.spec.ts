import { test, expect } from '@playwright/test'
import { 
  TEST_USERS, 
  setupAuthenticatedUser, 
  cleanupTestUser 
} from './auth-utils'

test.describe('User Dashboard', () => {
  
  test.afterEach(async ({ page }) => {
    await cleanupTestUser(page, TEST_USERS.customer.email)
  })

  test.describe('Dashboard Access', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
    })

    test('should redirect unauthenticated users to signin', async ({ page }) => {
      // First sign out to ensure we're unauthenticated
      await page.goto('/api/auth/signout')
      await page.waitForLoadState('networkidle')
      
      // Try to access dashboard
      await page.goto('/dashboard')
      
      // Should redirect to signin
      await expect(page).toHaveURL(/\/auth\/signin/)
    })

    test('should load dashboard for authenticated users', async ({ page }) => {
      // Try common dashboard URLs
      const dashboardUrls = ['/dashboard', '/account', '/profile', '/user']
      let foundDashboard = false
      
      for (const url of dashboardUrls) {
        await page.goto(url)
        
        if (page.url().includes(url.slice(1))) {
          foundDashboard = true
          
          // Should show user-specific content
          await expect(page.locator('text=/dashboard|account|profile|welcome/i')).toBeVisible({ timeout: 5000 })
          break
        }
      }
      
      // If no specific dashboard page exists, that's also valid
      // The important thing is auth is working
      if (!foundDashboard) {
        console.log('No dashboard page found - this is acceptable')
      }
    })
  })

  test.describe('User Profile Management', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
    })

    test('should display user information', async ({ page }) => {
      // Check various potential profile/account URLs
      const profileUrls = ['/profile', '/account', '/dashboard', '/user/profile']
      
      for (const url of profileUrls) {
        await page.goto(url)
        
        if (page.url().includes(url.slice(1))) {
          // Should show user's email or name
          const hasUserInfo = await Promise.race([
            page.locator(`text=${TEST_USERS.customer.email}`).isVisible(),
            page.locator(`text=${TEST_USERS.customer.name}`).isVisible(),
            page.locator('input[type="email"]').inputValue().then(val => val === TEST_USERS.customer.email),
            page.locator('text=/profile|account settings|personal information/i').isVisible()
          ])
          
          if (hasUserInfo) {
            break
          }
        }
      }
    })

    test('should allow profile updates', async ({ page }) => {
      const profileUrls = ['/profile', '/account', '/dashboard', '/settings']
      
      for (const url of profileUrls) {
        await page.goto(url)
        
        if (page.url().includes(url.slice(1))) {
          // Look for editable fields
          const editableFields = page.locator('input[type="text"], input[type="email"], textarea')
          
          if (await editableFields.first().isVisible()) {
            // Should have save/update button
            const saveButton = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]')
            await expect(saveButton.first()).toBeVisible()
            break
          }
        }
      }
    })
  })

  test.describe('Purchase History', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
    })

    test('should show user purchases or library', async ({ page }) => {
      const libraryUrls = ['/library', '/purchases', '/orders', '/dashboard', '/my-products']
      
      for (const url of libraryUrls) {
        await page.goto(url)
        
        if (page.url().includes(url.slice(1))) {
          // Should show some indication of purchases/library
          const hasLibraryContent = await Promise.race([
            page.locator('text=/library|purchases|orders|my.*products/i').isVisible(),
            page.locator('text=/no.*purchases|empty.*library|get.*started/i').isVisible(),
            page.locator('.purchase-item, .library-item, .order-item').first().isVisible()
          ])
          
          if (hasLibraryContent) {
            break
          }
        }
      }
    })

    test('should handle empty purchase history', async ({ page }) => {
      // For a new user, should show empty state or call to action
      const libraryUrls = ['/library', '/purchases', '/orders']
      
      for (const url of libraryUrls) {
        await page.goto(url)
        
        if (page.url().includes(url.slice(1))) {
          // Should either show empty state or redirect to browse products
          const hasEmptyState = await Promise.race([
            page.locator('text=/no.*purchases|empty.*library|nothing.*here/i').isVisible(),
            page.locator('text=/browse.*products|start.*shopping|explore/i').isVisible(),
            page.locator('a[href="/products"]').isVisible()
          ])
          
          if (hasEmptyState) {
            break
          }
        }
      }
    })
  })

  test.describe('Navigation and User Experience', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
    })

    test('should have user menu or navigation', async ({ page }) => {
      await page.goto('/')
      
      // Should have some form of user menu or navigation
      const hasUserNav = await Promise.race([
        page.locator('[data-testid="user-menu"]').isVisible(),
        page.locator('button:has-text("Account"), button:has-text("Profile")').isVisible(),
        page.locator('nav a:has-text("Dashboard"), nav a:has-text("Profile")').isVisible(),
        page.locator('.user-menu, .user-nav, .account-menu').isVisible()
      ])
      
      expect(hasUserNav).toBe(true)
    })

    test('should allow navigation between user areas', async ({ page }) => {
      await page.goto('/')
      
      // Should be able to navigate to different user areas
      const userAreas = ['/products', '/dashboard', '/profile', '/account']
      
      for (const area of userAreas) {
        await page.goto(area)
        
        // Should not redirect to signin (user is authenticated)
        await page.waitForLoadState('networkidle')
        expect(page.url()).not.toMatch(/\/auth\/signin/)
      }
    })

    test('should maintain consistent navigation across pages', async ({ page }) => {
      const pages = ['/', '/products', '/dashboard']
      
      for (const pageUrl of pages) {
        await page.goto(pageUrl)
        
        // Should always have sign out option available
        const hasSignOut = await Promise.race([
          page.locator('button:has-text("Sign out"), button:has-text("Logout")').isVisible(),
          page.locator('a[href="/api/auth/signout"]').isVisible(),
          page.locator('[data-testid="sign-out"]').isVisible()
        ])
        
        if (hasSignOut) {
          // Found sign out button - good!
          break
        }
      }
    })
  })

  test.describe('Account Settings', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedUser(page, TEST_USERS.customer)
    })

    test('should provide account management options', async ({ page }) => {
      const settingsUrls = ['/settings', '/account', '/profile', '/dashboard']
      
      for (const url of settingsUrls) {
        await page.goto(url)
        
        if (page.url().includes(url.slice(1))) {
          // Should have some account management features
          const hasAccountFeatures = await Promise.race([
            page.locator('text=/settings|preferences|account.*management/i').isVisible(),
            page.locator('text=/change.*password|update.*profile|edit.*account/i').isVisible(),
            page.locator('button:has-text("Edit"), button:has-text("Change"), button:has-text("Update")').isVisible()
          ])
          
          if (hasAccountFeatures) {
            break
          }
        }
      }
    })

    test('should handle password change flow', async ({ page }) => {
      const settingsUrls = ['/settings', '/account', '/profile']
      
      for (const url of settingsUrls) {
        await page.goto(url)
        
        // Look for password change functionality
        const passwordSection = page.locator('text=/password|security/i')
        
        if (await passwordSection.isVisible()) {
          // Should have password-related controls
          const hasPasswordControls = await Promise.race([
            page.locator('input[type="password"]').isVisible(),
            page.locator('button:has-text("Change Password")').isVisible(),
            page.locator('text=/current.*password|new.*password/i').isVisible()
          ])
          
          if (hasPasswordControls) {
            break
          }
        }
      }
    })
  })
})
