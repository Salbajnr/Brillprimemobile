
import { test, expect } from '@playwright/test';

test.describe('Complete Authentication Flow', () => {
  // Test data for different roles
  const testUsers = [
    {
      role: 'CONSUMER',
      email: 'consumer.test@example.com',
      fullName: 'Test Consumer',
      expectedDashboard: '/dashboard',
      expectedTitle: 'Consumer Dashboard'
    },
    {
      role: 'MERCHANT',
      email: 'merchant.test@example.com',
      fullName: 'Test Merchant',
      expectedDashboard: '/merchant-dashboard',
      expectedTitle: 'Merchant Dashboard'
    },
    {
      role: 'DRIVER',
      email: 'driver.test@example.com',
      fullName: 'Test Driver',
      expectedDashboard: '/driver-dashboard',
      expectedTitle: 'Driver Dashboard'
    }
  ];

  // Clear storage before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('complete onboarding flow from splash to role selection', async ({ page }) => {
    // Start from splash page
    await page.goto('/');
    
    // Should redirect to onboarding for new users
    await page.waitForURL(/\/onboarding/);
    await expect(page.locator('h1')).toContainText('Fast & Secure');
    
    // Navigate through onboarding steps
    await page.click('button:has-text("Next")');
    await expect(page.locator('h1')).toContainText('All-in-One');
    
    await page.click('button:has-text("Next")');
    await expect(page.locator('h1')).toContainText('Advanced Security');
    
    await page.click('button:has-text("Get Started")');
    
    // Should reach role selection
    await page.waitForURL('/role-selection');
    await expect(page.locator('h1')).toContainText('Choose Your Role');
  });

  // Test each role's complete flow
  for (const userData of testUsers) {
    test(`complete ${userData.role.toLowerCase()} authentication flow`, async ({ page }) => {
      // Start from role selection
      await page.goto('/role-selection');
      
      // Select role
      await page.click(`button:has-text("${userData.role.charAt(0) + userData.role.slice(1).toLowerCase()}")`);
      await page.click('button:has-text("Continue")');
      
      // Should redirect to signup
      await page.waitForURL('/signup');
      await expect(page.locator('h1')).toContainText('Create Account');
      
      // Fill signup form
      await page.fill('input[name="fullName"]', userData.fullName);
      await page.fill('input[name="email"]', userData.email);
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
      
      // Submit signup
      await page.click('button[type="submit"]');
      
      // Should redirect to appropriate dashboard after signup
      await page.waitForURL(userData.expectedDashboard, { timeout: 10000 });
      
      // Verify we're on the correct dashboard
      await expect(page.locator('h1, h2')).toContainText(userData.expectedTitle);
      
      // Verify user data is stored correctly
      const storedUser = await page.evaluate(() => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
      });
      
      expect(storedUser).toBeTruthy();
      expect(storedUser.email).toBe(userData.email);
      expect(storedUser.role).toBe(userData.role);
      expect(storedUser.fullName).toBe(userData.fullName);
    });
  }

  test('signin flow with existing users redirects to correct dashboards', async ({ page }) => {
    // Test signin for each role type
    for (const userData of testUsers) {
      // Clear storage between tests
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Go to signin page
      await page.goto('/signin');
      await expect(page.locator('h1')).toContainText('Sign In');
      
      // Fill signin form (assuming users already exist from previous tests)
      await page.fill('input[name="email"]', userData.email);
      await page.fill('input[name="password"]', 'TestPassword123!');
      
      // Submit signin
      await page.click('button[type="submit"]');
      
      // Should redirect to appropriate dashboard
      await page.waitForURL(userData.expectedDashboard, { timeout: 10000 });
      
      // Verify we're on the correct dashboard
      await expect(page.locator('h1, h2')).toContainText(userData.expectedTitle);
      
      // Verify role-specific content is visible
      if (userData.role === 'CONSUMER') {
        await expect(page.locator('text=Order Fuel')).toBeVisible();
        await expect(page.locator('text=Pay Toll')).toBeVisible();
      } else if (userData.role === 'MERCHANT') {
        await expect(page.locator('text=Manage Products')).toBeVisible();
        await expect(page.locator('text=View Orders')).toBeVisible();
      } else if (userData.role === 'DRIVER') {
        await expect(page.locator('text=Available Orders')).toBeVisible();
        await expect(page.locator('text=Earnings')).toBeVisible();
      }
    }
  });

  test('authenticated user is redirected from splash to dashboard', async ({ page }) => {
    // Simulate authenticated user by setting localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'CONSUMER'
      }));
      localStorage.setItem('hasSeenOnboarding', 'true');
    });
    
    // Go to splash page
    await page.goto('/');
    
    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 5000 });
    await expect(page.locator('h1, h2')).toContainText('Consumer Dashboard');
  });

  test('logout flow clears session and redirects to signin', async ({ page }) => {
    // Set up authenticated user
    await page.goto('/dashboard');
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'CONSUMER'
      }));
    });
    
    await page.reload();
    
    // Find and click logout button
    await page.click('button:has-text("Logout"), button:has-text("Sign Out")');
    
    // Should redirect to signin
    await page.waitForURL('/signin');
    
    // Verify localStorage is cleared
    const storedUser = await page.evaluate(() => localStorage.getItem('user'));
    expect(storedUser).toBeNull();
  });

  test('password validation on signup', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill form with invalid password
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123'); // Too short
    await page.fill('input[name="confirmPassword"]', '456'); // Different
    
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Password must be at least')).toBeVisible();
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('navigation between auth pages works correctly', async ({ page }) => {
    // Start at signin
    await page.goto('/signin');
    
    // Go to signup
    await page.click('text=Sign up');
    await page.waitForURL('/signup');
    await expect(page.locator('h1')).toContainText('Create Account');
    
    // Go back to signin
    await page.click('text=Sign in');
    await page.waitForURL('/signin');
    await expect(page.locator('h1')).toContainText('Sign In');
    
    // Go to forgot password
    await page.click('text=Forgot Password?, text=Reset password');
    await page.waitForURL('/forgot-password');
    await expect(page.locator('h1')).toContainText('Reset Password');
  });

  test('role persistence through localStorage', async ({ page }) => {
    // Go through role selection
    await page.goto('/role-selection');
    await page.click('button:has-text("Merchant")');
    
    // Check that role is stored
    const selectedRole = await page.evaluate(() => localStorage.getItem('selectedRole'));
    expect(selectedRole).toBe('MERCHANT');
    
    await page.click('button:has-text("Continue")');
    await page.waitForURL('/signup');
    
    // Role should still be available in signup
    const roleOnSignup = await page.evaluate(() => localStorage.getItem('selectedRole'));
    expect(roleOnSignup).toBe('MERCHANT');
  });
});
