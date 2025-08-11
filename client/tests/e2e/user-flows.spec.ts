
import { test, expect } from '@playwright/test';

test.describe('User Flows', () => {
  test('complete onboarding flow', async ({ page }) => {
    await page.goto('/');
    
    // Start onboarding
    await page.click('text=Get Started');
    await expect(page).toHaveURL('/role-selection');
    
    // Select consumer role
    await page.click('text=Consumer');
    
    // Should redirect to sign up or onboarding
    await expect(page).toHaveURL(/\/signup|\/onboarding/);
    
    if (page.url().includes('/onboarding')) {
      // Complete onboarding steps
      await page.click('text=Next');
      await page.click('text=Next');
      await page.click('text=Get Started');
    }
  });

  test('commodity browsing flow', async ({ page }) => {
    await page.goto('/commodities');
    
    // Should show commodities or redirect to auth
    if (page.url().includes('/signin')) {
      // Skip test if auth required
      return;
    }
    
    await expect(page.locator('text=Commodities')).toBeVisible();
    
    // Test search functionality
    await page.fill('input[placeholder*="Search"]', 'rice');
    await page.press('input[placeholder*="Search"]', 'Enter');
    
    // Should show search results
    await expect(page.locator('text=Search Results')).toBeVisible();
  });

  test('cart functionality', async ({ page }) => {
    await page.goto('/cart');
    
    // Should show cart or redirect to auth
    if (page.url().includes('/signin')) {
      return;
    }
    
    await expect(page.locator('text=Shopping Cart')).toBeVisible();
  });

  test('wallet access', async ({ page }) => {
    await page.goto('/wallet-balance');
    
    // Should show wallet or redirect to auth
    if (page.url().includes('/signin')) {
      return;
    }
    
    await expect(page.locator('text=Wallet')).toBeVisible();
  });
});
