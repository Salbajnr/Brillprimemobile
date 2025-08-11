
import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('homepage loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Expect page to load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('navigation is fast', async ({ page }) => {
    await page.goto('/');
    
    const startTime = Date.now();
    await page.click('text=Sign In');
    await page.waitForURL('/signin');
    
    const navigationTime = Date.now() - startTime;
    
    // Expect navigation to complete within 2 seconds
    expect(navigationTime).toBeLessThan(2000);
  });

  test('images load properly', async ({ page }) => {
    await page.goto('/');
    
    // Wait for images to load
    await page.waitForLoadState('networkidle');
    
    // Check that logo image loads
    const logo = page.locator('img[alt*="logo" i]');
    if (await logo.isVisible()) {
      const naturalWidth = await logo.evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });
});
