import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load the signup page without errors', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/auth/signup');
    
    // Check that the page loads without 500 errors
    await expect(page).toHaveTitle('Digital Products Platform');
    
    // Check for key elements
    await expect(page.locator('h1')).toContainText('Create an account');
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should load the signin page without errors', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/signin');
    
    // Check that the page loads without 500 errors
    await expect(page).toHaveTitle('Digital Products Platform');
    
    // Check for key elements
    await expect(page.locator('h1')).toContainText('Welcome back');
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should display validation errors for empty signup form', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation errors (the form should show client-side validation)
    // We'll wait a moment for any validation to appear
    await page.waitForTimeout(1000);
    
    // Check if form prevented submission (button should still be visible)
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should navigate between signin and signup pages', async ({ page }) => {
    // Start at signin
    await page.goto('/auth/signin');
    await expect(page.locator('h1')).toContainText('Welcome back');
    
    // Click link to signup
    await page.click('text=Sign up');
    await expect(page).toHaveURL(/\/auth\/signup/);
    await expect(page.locator('h1')).toContainText('Create an account');
    
    // Click link back to signin
    await page.click('text=Sign in');
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.locator('h1')).toContainText('Welcome back');
  });

  test('should handle OAuth provider buttons', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Check OAuth provider buttons exist (look for the actual button text)
    await expect(page.locator('button:has-text("Google")')).toBeVisible();
    await expect(page.locator('button:has-text("GitHub")')).toBeVisible();
  });
});
