
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should navigate to sign in page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/signin');
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/signin');
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should navigate to sign up page', async ({ page }) => {
    await page.goto('/signin');
    await page.click('text=Sign up');
    await expect(page).toHaveURL('/signup');
    await expect(page.locator('h1')).toContainText('Create Account');
  });

  test('should handle sign up form validation', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill form with invalid data
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', '123');
    await page.fill('input[name="confirmPassword"]', '456');
    await page.click('button[type="submit"]');
    
    // Check validation errors
    await expect(page.locator('text=Invalid email format')).toBeVisible();
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should navigate to forgot password', async ({ page }) => {
    await page.goto('/signin');
    await page.click('text=Forgot Password?');
    await expect(page).toHaveURL('/forgot-password');
    await expect(page.locator('h1')).toContainText('Reset Password');
  });
});
