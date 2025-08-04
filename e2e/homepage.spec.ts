import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads without errors
    await expect(page).toHaveTitle('Digital Products Platform');
    
    // Check for navigation links (use first() to handle multiple links with same href)
    await expect(page.locator('a[href="/auth/signin"]').first()).toBeVisible();
    await expect(page.locator('a[href="/auth/signup"]').first()).toBeVisible();
  });

  test('should navigate to auth pages from homepage', async ({ page }) => {
    await page.goto('/');
    
    // Click signin link (use first one)
    await page.click('a[href="/auth/signin"]:first-child');
    await expect(page).toHaveURL(/\/auth\/signin/);
    
    // Go back to homepage
    await page.goto('/');
    
    // Click signup link (use first one)
    await page.click('a[href="/auth/signup"]:first-child');
    await expect(page).toHaveURL(/\/auth\/signup/);
  });
});
