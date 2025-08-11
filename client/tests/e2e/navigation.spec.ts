
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Brillprime/);
    await expect(page.locator('text=Brillprime')).toBeVisible();
  });

  test('should navigate to role selection', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Get Started');
    await expect(page).toHaveURL('/role-selection');
    await expect(page.locator('h1')).toContainText('Choose Your Role');
  });

  test('should handle 404 page', async ({ page }) => {
    await page.goto('/non-existent-page');
    await expect(page.locator('text=Page Not Found')).toBeVisible();
    await expect(page.locator('text=404')).toBeVisible();
  });

  test('should navigate between consumer features', async ({ page }) => {
    await page.goto('/role-selection');
    await page.click('text=Consumer');
    
    // Should show consumer features or redirect to sign up
    await expect(page).toHaveURL(/\/consumer|\/signup/);
  });

  test('should navigate between merchant features', async ({ page }) => {
    await page.goto('/role-selection');
    await page.click('text=Merchant');
    
    // Should show merchant features or redirect to sign up
    await expect(page).toHaveURL(/\/merchant|\/signup/);
  });

  test('should navigate between driver features', async ({ page }) => {
    await page.goto('/role-selection');
    await page.click('text=Driver');
    
    // Should show driver features or redirect to sign up
    await expect(page).toHaveURL(/\/driver|\/signup/);
  });
});
