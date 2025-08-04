import { test, expect } from '@playwright/test';

test.describe('Debug Signup Page', () => {
  test('should check if signup page loads without 500 error', async ({ page }) => {
    // Navigate to signup page and capture any console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const response = await page.goto('/auth/signup');
    
    // Check the response status
    expect(response?.status()).not.toBe(500);
    
    // Log any console errors
    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-signup.png' });
    
    // Check if page loaded at all
    await expect(page.locator('body')).toBeVisible();
  });
});
