import { test, expect } from '@playwright/test';
import { 
  TEST_USERS, 
  TestUser,
  createTestUser, 
  deleteTestUser, 
  signUpUser, 
  signInUser, 
  signOutUser, 
  isAuthenticated,
  setupAuthenticatedUser,
  cleanupTestUser
} from './auth-utils';

test.describe('Authentication Flow', () => {
  
  test.afterEach(async ({ page }) => {
    // Clean up any test users created during tests
    await cleanupTestUser(page, TEST_USERS.newUser.email);
  });

  test.describe('Page Loading', () => {
    test('should load the signup page without errors', async ({ page }) => {
      await page.goto('/auth/signup');
      
      await expect(page).toHaveTitle('Digital Products Platform');
      await expect(page.locator('h1')).toContainText('Create an account');
      await expect(page.locator('input[id="email"]')).toBeVisible();
      await expect(page.locator('input[id="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should load the signin page without errors', async ({ page }) => {
      await page.goto('/auth/signin');
      
      await expect(page).toHaveTitle('Digital Products Platform');
      await expect(page.locator('h1')).toContainText('Welcome back');
      await expect(page.locator('input[id="email"]')).toBeVisible();
      await expect(page.locator('input[id="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should navigate between signin and signup pages', async ({ page }) => {
      await page.goto('/auth/signin');
      await expect(page.locator('h1')).toContainText('Welcome back');
      
      await page.click('text=Sign up');
      await expect(page).toHaveURL(/\/auth\/signup/);
      await expect(page.locator('h1')).toContainText('Create an account');
      
      await page.click('text=Sign in');
      await expect(page).toHaveURL(/\/auth\/signin/);
      await expect(page.locator('h1')).toContainText('Welcome back');
    });

    test('should display OAuth provider buttons', async ({ page }) => {
      await page.goto('/auth/signin');
      
      await expect(page.locator('button:has-text("Google")')).toBeVisible();
      await expect(page.locator('button:has-text("GitHub")')).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    test('should display validation errors for empty signup form', async ({ page }) => {
      await page.goto('/auth/signup');
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Browser HTML5 validation should prevent submission
      // Check that we're still on the signup page
      await expect(page).toHaveURL(/\/auth\/signup/);
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should validate password confirmation mismatch', async ({ page }) => {
      await page.goto('/auth/signup');
      
      const uniqueEmail = `test.validation.${Date.now()}@example.com`;
      
      await page.fill('#name', 'Test User');
      await page.fill('#email', uniqueEmail);
      await page.fill('#password', 'password123');
      await page.fill('#confirmPassword', 'different123');
      
      await page.click('button[type="submit"]');
      
      // Wait for and check error message - look for any alert with password mismatch content
      const alertLocator = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
      await expect(alertLocator).toBeVisible({ timeout: 10000 });
      
      const alertText = await alertLocator.textContent();
      expect(alertText?.toLowerCase()).toContain('password');
      expect(alertText?.toLowerCase()).toMatch(/match|mismatch/);
    });

    test('should validate minimum password length', async ({ page }) => {
      await page.goto('/auth/signup');
      
      const uniqueEmail = `test.validation.min.${Date.now()}@example.com`;
      
      await page.fill('#name', 'Test User');
      await page.fill('#email', uniqueEmail);
      await page.fill('#password', '123');
      await page.fill('#confirmPassword', '123');
      
      await page.click('button[type="submit"]');
      
      // Wait for and check error message - look for any alert with password length content
      const alertLocator = page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
      await expect(alertLocator).toBeVisible({ timeout: 10000 });
      
      const alertText = await alertLocator.textContent();
      expect(alertText?.toLowerCase()).toContain('password');
      expect(alertText?.toLowerCase()).toMatch(/6|character|length/);
    });

    test('should handle invalid credentials signin', async ({ page }) => {
      await page.goto('/auth/signin');
      
      await page.fill('#email', 'nonexistent@example.com');
      await page.fill('#password', 'wrongpassword');
      
      await page.click('button[type="submit"]');
      
      // Should remain on signin page without redirect
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  });

  test.describe('User Registration', () => {
    test('should successfully sign up a new user', async ({ page }) => {
      const newUser = {
        ...TEST_USERS.newUser,
        email: `new.user.${Date.now()}@example.com`,
      };
      
      await signUpUser(page, newUser);
      
      // Should be redirected to home page and authenticated
      await expect(page).toHaveURL('/');
      
      const authenticated = await isAuthenticated(page);
      expect(authenticated).toBe(true);
      
      // Clean up
      await cleanupTestUser(page, newUser.email);
    });

    test('should prevent duplicate email registration', async ({ page }) => {
      // First, ensure a user exists
      await createTestUser(page, TEST_USERS.customer);
      
      // Try to sign up with the same email
      await page.goto('/auth/signup');
      await page.fill('#name', 'Another User');
      await page.fill('#email', TEST_USERS.customer.email);
      await page.fill('#password', 'password123');
      await page.fill('#confirmPassword', 'password123');
      
      await page.click('button[type="submit"]');
      
      // Should show error about existing email
      await expect(page.locator('[role="alert"]')).toBeVisible();
      await expect(page).toHaveURL(/\/auth\/signup/);
    });
  });

  test.describe('User Authentication', () => {
    let testUser: TestUser;

    test.beforeEach(async ({ page }) => {
      // Create a unique test user for each test
      testUser = {
        name: 'Test Customer',
        email: `test.customer.${Date.now()}.${Math.random().toString(36).substring(7)}@example.com`,
        password: 'testpass123',
        role: 'customer' as const,
      };
      await createTestUser(page, testUser);
    });

    test.afterEach(async ({ page }) => {
      // Clean up the test user
      await cleanupTestUser(page, testUser.email);
    });

    test('should successfully sign in with valid credentials', async ({ page }) => {
      await signInUser(page, testUser.email, testUser.password);
      
      // Should be authenticated and redirected
      await expect(page).toHaveURL('/');
      
      const authenticated = await isAuthenticated(page);
      expect(authenticated).toBe(true);
    });

    test('should handle sign out', async ({ page }) => {
      // First sign in
      await signInUser(page, testUser.email, testUser.password);
      
      // Then sign out
      await signOutUser(page);
      
      // Should no longer be authenticated
      const authenticated = await isAuthenticated(page);
      expect(authenticated).toBe(false);
    });

    test('should redirect to callback URL after signin', async ({ page }) => {
      // Try to access protected route
      await page.goto('/products');
      
      // Should redirect to signin with callback
      await expect(page).toHaveURL(/\/auth\/signin.*callbackUrl/);
      
      // Sign in with our test user
      await page.fill('#email', testUser.email);
      await page.fill('#password', testUser.password);
      await page.click('button[type="submit"]');
      
      // Should redirect back to products
      await expect(page).toHaveURL('/products');
    });
  });

  test.describe('Session Management', () => {
    let testUser: TestUser;

    test.beforeEach(async ({ page }) => {
      // Create a unique test user for each test
      testUser = {
        name: 'Test Session User',
        email: `test.session.${Date.now()}.${Math.random().toString(36).substring(7)}@example.com`,
        password: 'testpass123',
        role: 'customer' as const,
      };
      await setupAuthenticatedUser(page, testUser);
    });

    test.afterEach(async ({ page }) => {
      // Clean up the test user
      await cleanupTestUser(page, testUser.email);
    });

    test('should maintain session across page refreshes', async ({ page }) => {
      // Refresh the page
      await page.reload();
      
      // Should still be authenticated
      const authenticated = await isAuthenticated(page);
      expect(authenticated).toBe(true);
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      // Clear cookies to simulate session expiration
      await page.context().clearCookies();
      
      // Try to access protected route
      await page.goto('/products');
      
      // Should redirect to signin
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  });
});
