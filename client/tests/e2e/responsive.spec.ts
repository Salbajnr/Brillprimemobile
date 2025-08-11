
import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`should display correctly on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      
      // Check that key elements are visible
      await expect(page.locator('text=Brillprime')).toBeVisible();
      
      // Take screenshot for visual comparison
      await page.screenshot({ 
        path: `tests/e2e/screenshots/${name}-homepage.png`,
        fullPage: true 
      });
    });

    test(`navigation menu works on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      
      if (width < 768) {
        // Mobile: check for hamburger menu
        const menuButton = page.locator('[aria-label="Menu"]');
        if (await menuButton.isVisible()) {
          await menuButton.click();
        }
      }
      
      // Check navigation items are accessible
      await expect(page.locator('text=Sign In')).toBeVisible();
    });
  });
});
