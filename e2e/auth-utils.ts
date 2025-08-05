/**
 * Authentication utilities for E2E tests
 * Provides helper functions for creating test users and logging in
 */

import { Page, expect } from '@playwright/test'

export interface TestUser {
  name: string
  email: string
  password: string
  role?: 'customer' | 'admin'
}

// Test users for E2E testing - using timestamps to ensure uniqueness
export const TEST_USERS = {
  customer: {
    name: 'Test Customer',
    email: `test.customer.${Date.now()}@example.com`,
    password: 'testpass123',
    role: 'customer' as const,
  },
  admin: {
    name: 'Test Admin',
    email: `test.admin.${Date.now()}@example.com`,
    password: 'adminpass123',
    role: 'admin' as const,
  },
  newUser: {
    name: 'New User',
    email: `new.user.${Date.now()}@example.com`,
    password: 'newpass123',
    role: 'customer' as const,
  },
} as const

/**
 * Create a test user in the database via GraphQL API
 */
export async function createTestUser(page: Page, user: TestUser): Promise<void> {
  // First try to delete the user if they already exist
  await deleteTestUser(page, user.email)
  
  const response = await page.request.post('http://localhost:4000/api/graphql', {
    data: {
      query: `
        mutation CreateUser($data: UserCreateInput!) {
          createUser(data: $data) {
            id
            name
            email
            role
            isActive
          }
        }
      `,
      variables: {
        data: {
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role || 'customer',
          isActive: true,
        },
      },
    },
  })

  const result = await response.json()
  
  if (result.errors) {
    // Check if it's a unique constraint error and handle gracefully
    const errorMessage = result.errors[0]?.message || ''
    if (errorMessage.includes('Unique constraint failed') && errorMessage.includes('email')) {
      console.warn(`Test user ${user.email} already exists, continuing...`)
      return
    }
    throw new Error(`Failed to create test user: ${errorMessage}`)
  }
}

/**
 * Delete a test user from the database
 */
export async function deleteTestUser(page: Page, email: string): Promise<void> {
  try {
    // First get the user ID
    const getUserResponse = await page.request.post('http://localhost:4000/api/graphql', {
      data: {
        query: `
          query GetUser($email: String!) {
            users(where: { email: { equals: $email } }) {
              id
            }
          }
        `,
        variables: { email },
      },
    })

    const getUserResult = await getUserResponse.json()
    const userId = getUserResult.data?.users?.[0]?.id

    if (userId) {
      await page.request.post('http://localhost:4000/api/graphql', {
        data: {
          query: `
            mutation DeleteUser($id: ID!) {
              deleteUser(where: { id: $id }) {
                id
              }
            }
          `,
          variables: { id: userId },
        },
      })
    }
  } catch (error) {
    // Silently ignore deletion errors - user might not exist
    console.debug(`Could not delete user ${email}:`, error)
  }
}

/**
 * Sign up a new user through the UI
 */
export async function signUpUser(page: Page, user: TestUser): Promise<void> {
  await page.goto('/auth/signup')
  
  // Fill the signup form
  await page.fill('#name', user.name)
  await page.fill('#email', user.email)
  await page.fill('#password', user.password)
  await page.fill('#confirmPassword', user.password)
  
  // Submit the form
  await page.click('button[type="submit"]')
  
  // Wait for either success redirect or error
  try {
    // If successful, should redirect to home page
    await expect(page).toHaveURL('/', { timeout: 10000 })
  } catch (error) {
    // Check if there's an error message displayed
    const errorElement = page.locator('[role="alert"]')
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent()
      throw new Error(`Signup failed: ${errorText}`)
    }
    throw error
  }
}

/**
 * Sign in a user through the UI using credentials
 */
export async function signInUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/signin')
  
  // Fill the signin form
  await page.fill('#email', email)
  await page.fill('#password', password)
  
  // Submit the form
  await page.click('button[type="submit"]')
  
  // Wait for redirect to home page or dashboard
  try {
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 })
  } catch (error) {
    // Check if there's an error message displayed
    const errorElement = page.locator('[role="alert"]')
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent()
      throw new Error(`Signin failed: ${errorText}`)
    }
    throw error
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser(page: Page): Promise<void> {
  // Look for sign out button (might be in a dropdown or direct button)
  const signOutButton = page.locator('button').filter({ hasText: /sign out|logout/i }).first()
  
  if (await signOutButton.isVisible()) {
    await signOutButton.click()
  } else {
    // Fallback: go to sign out URL directly
    await page.goto('/api/auth/signout')
    const confirmButton = page.locator('button').filter({ hasText: /sign out/i }).first()
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }
  }
  
  // Verify we're signed out (should redirect to signin or home without user session)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('text=Sign in')).toBeVisible({ timeout: 5000 })
}

/**
 * Check if user is currently authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Method 1: Check for NextAuth session via client-side script
    const hasSession = await page.evaluate(() => {
      // Check if there's a session in localStorage or sessionStorage
      const sessionToken = document.cookie.includes('next-auth.session-token') || 
                          document.cookie.includes('__Secure-next-auth.session-token');
      return sessionToken;
    });
    
    if (hasSession) {
      return true;
    }
    
    // Method 2: Try accessing a protected route and see if we get redirected
    const currentUrl = page.url();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const isOnDashboard = page.url().includes('/dashboard');
    const wasRedirectedToSignin = page.url().includes('/auth/signin');
    
    // Restore original URL
    if (currentUrl !== page.url()) {
      await page.goto(currentUrl);
      await page.waitForLoadState('networkidle');
    }
    
    return isOnDashboard && !wasRedirectedToSignin;
  } catch (error) {
    // Fallback: Check for UI elements that indicate authentication
    const userMenu = page.locator('[data-testid="user-menu"]')
    const signOutButton = page.locator('button').filter({ hasText: /sign out|logout/i })
    const dashboard = page.locator('a').filter({ hasText: /dashboard|my account/i })
    const profileLink = page.locator('a').filter({ hasText: /profile|account/i })
    
    return (
      (await userMenu.isVisible()) ||
      (await signOutButton.isVisible()) ||
      (await dashboard.isVisible()) ||
      (await profileLink.isVisible())
    );
  }
}

/**
 * Set up authenticated session for a test
 * Creates user if needed and signs them in
 */
export async function setupAuthenticatedUser(page: Page, user: TestUser): Promise<void> {
  // Ensure user exists in database
  await createTestUser(page, user)
  
  // Sign in the user
  await signInUser(page, user.email, user.password)
  
  // Verify authentication succeeded
  await expect(async () => {
    const authenticated = await isAuthenticated(page)
    expect(authenticated).toBe(true)
  }).toPass({ timeout: 10000 })
}

/**
 * Clean up test user after test
 */
export async function cleanupTestUser(page: Page, email: string): Promise<void> {
  try {
    await deleteTestUser(page, email)
  } catch (error) {
    console.warn(`Failed to cleanup test user ${email}:`, error)
  }
}
