
import { Page } from '@playwright/test';
import { testUsers } from './test-data';

export class AuthHelper {
  constructor(private page: Page) {}

  async signIn(userType: 'consumer' | 'merchant' | 'driver' = 'consumer') {
    const user = testUsers[userType];
    
    await this.page.goto('/signin');
    await this.page.fill('input[name="email"]', user.email);
    await this.page.fill('input[name="password"]', user.password);
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect after successful login
    await this.page.waitForURL(/\/dashboard|\/consumer|\/merchant|\/driver/);
  }

  async signUp(userType: 'consumer' | 'merchant' | 'driver' = 'consumer') {
    const user = testUsers[userType];
    
    await this.page.goto('/signup');
    await this.page.fill('input[name="firstName"]', user.firstName);
    await this.page.fill('input[name="lastName"]', user.lastName);
    await this.page.fill('input[name="email"]', user.email);
    await this.page.fill('input[name="phone"]', user.phone);
    await this.page.fill('input[name="password"]', user.password);
    await this.page.fill('input[name="confirmPassword"]', user.password);
    
    if (userType === 'merchant') {
      await this.page.fill('input[name="businessName"]', user.businessName);
    }
    
    if (userType === 'driver') {
      await this.page.selectOption('select[name="vehicleType"]', user.vehicleType);
      await this.page.fill('input[name="licenseNumber"]', user.licenseNumber);
    }
    
    await this.page.click('button[type="submit"]');
  }

  async signOut() {
    await this.page.click('[aria-label="User menu"]');
    await this.page.click('text=Sign Out');
    await this.page.waitForURL('/');
  }
}
