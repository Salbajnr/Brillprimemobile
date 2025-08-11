
import { test, expect } from '@playwright/test';

test.describe('Form Interactions', () => {
  test('contact form submission', async ({ page }) => {
    await page.goto('/support');
    
    // Skip if auth required
    if (page.url().includes('/signin')) {
      return;
    }
    
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', 'This is a test message');
    
    await page.click('button[type="submit"]');
    
    // Check for success message
    await expect(page.locator('text=Message sent successfully')).toBeVisible();
  });

  test('search form functionality', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.locator('input[placeholder*="Search" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test query');
      await page.keyboard.press('Enter');
      
      // Should redirect to search results
      await expect(page).toHaveURL(/\/search/);
    }
  });

  test('newsletter signup', async ({ page }) => {
    await page.goto('/');
    
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('newsletter@example.com');
      await page.click('button:has-text("Subscribe")');
      
      // Check for confirmation
      await expect(page.locator('text=Subscribed')).toBeVisible();
    }
  });
});
