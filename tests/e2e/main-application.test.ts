
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('Main Application E2E Tests', () => {
  let browser: Browser;
  let page: Page;
  const APP_URL = 'http://0.0.0.0:3000';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667 }); // Mobile viewport
  });

  describe('Application Loading', () => {
    test('should load splash screen', async () => {
      await page.goto(APP_URL);
      await page.waitForSelector('[data-testid="splash-screen"]', { timeout: 10000 });
      
      const splashScreen = await page.$('[data-testid="splash-screen"]');
      expect(splashScreen).toBeTruthy();
      
      // Wait for navigation
      await page.waitForNavigation({ timeout: 5000 }).catch(() => {
        console.log('Navigation timeout - expected for splash screen');
      });
    });

    test('should navigate to role selection', async () => {
      await page.goto(`${APP_URL}/role-selection`);
      await page.waitForSelector('[data-testid="role-card"]', { timeout: 10000 });
      
      const roleCards = await page.$$('[data-testid="role-card"]');
      expect(roleCards.length).toBe(3); // CONSUMER, MERCHANT, DRIVER
    });
  });

  describe('Authentication Flow', () => {
    test('should display signin page', async () => {
      await page.goto(`${APP_URL}/signin`);
      await page.waitForSelector('form', { timeout: 10000 });
      
      const emailInput = await page.$('input[type="email"]');
      const passwordInput = await page.$('input[type="password"]');
      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
    });

    test('should handle signin attempt', async () => {
      await page.goto(`${APP_URL}/signin`);
      await page.waitForSelector('input[type="email"]');
      
      await page.type('input[type="email"]', 'test@example.com');
      await page.type('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Wait for either success or error
      await Promise.race([
        page.waitForNavigation({ timeout: 5000 }),
        page.waitForSelector('.error', { timeout: 5000 })
      ]).catch(() => {
        console.log('Login attempt completed');
      });
    });

    test('should display signup page', async () => {
      await page.goto(`${APP_URL}/signup`);
      await page.waitForSelector('form', { timeout: 10000 });
      
      const form = await page.$('form');
      expect(form).toBeTruthy();
      
      const requiredInputs = await page.$$('input[required]');
      expect(requiredInputs.length).toBeGreaterThan(0);
    });
  });

  describe('Consumer Dashboard', () => {
    test('should display consumer home', async () => {
      await page.goto(`${APP_URL}/consumer-home`);
      await page.waitForSelector('[data-testid="consumer-dashboard"]', { timeout: 10000 });
      
      const dashboard = await page.$('[data-testid="consumer-dashboard"]');
      expect(dashboard).toBeTruthy();
    });

    test('should display service cards', async () => {
      await page.goto(`${APP_URL}/consumer-home`);
      await page.waitForSelector('[data-testid="service-card"]', { timeout: 5000 });
      
      const serviceCards = await page.$$('[data-testid="service-card"]');
      expect(serviceCards.length).toBeGreaterThan(0);
    });
  });

  describe('Merchant Dashboard', () => {
    test('should display merchant dashboard', async () => {
      await page.goto(`${APP_URL}/merchant-dashboard`);
      await page.waitForSelector('[data-testid="merchant-dashboard"]', { timeout: 10000 });
      
      const dashboard = await page.$('[data-testid="merchant-dashboard"]');
      expect(dashboard).toBeTruthy();
    });
  });

  describe('Driver Dashboard', () => {
    test('should display driver dashboard', async () => {
      await page.goto(`${APP_URL}/driver-dashboard`);
      await page.waitForSelector('[data-testid="driver-dashboard"]', { timeout: 10000 });
      
      const dashboard = await page.$('[data-testid="driver-dashboard"]');
      expect(dashboard).toBeTruthy();
    });
  });

  describe('Chat System', () => {
    test('should display chat interface', async () => {
      await page.goto(`${APP_URL}/chat`);
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
      
      const chatInterface = await page.$('[data-testid="chat-interface"]');
      expect(chatInterface).toBeTruthy();
    });

    test('should display conversations list', async () => {
      await page.goto(`${APP_URL}/chat`);
      await page.waitForSelector('[data-testid="conversations-list"]', { timeout: 5000 });
      
      const conversationsList = await page.$('[data-testid="conversations-list"]');
      expect(conversationsList).toBeTruthy();
    });
  });

  describe('Vendor Feed', () => {
    test('should display vendor feed', async () => {
      await page.goto(`${APP_URL}/vendor-feed`);
      await page.waitForSelector('[data-testid="vendor-feed"]', { timeout: 10000 });
      
      const vendorFeed = await page.$('[data-testid="vendor-feed"]');
      expect(vendorFeed).toBeTruthy();
    });
  });

  describe('Payment System', () => {
    test('should display payment methods', async () => {
      await page.goto(`${APP_URL}/payment-methods`);
      await page.waitForSelector('[data-testid="payment-methods"]', { timeout: 10000 });
      
      const paymentMethods = await page.$('[data-testid="payment-methods"]');
      expect(paymentMethods).toBeTruthy();
    });
  });

  describe('QR Scanner', () => {
    test('should display QR scanner interface', async () => {
      await page.goto(`${APP_URL}/qr-scanner`);
      await page.waitForSelector('[data-testid="qr-scanner"]', { timeout: 10000 });
      
      const qrScanner = await page.$('[data-testid="qr-scanner"]');
      expect(qrScanner).toBeTruthy();
    });
  });
});
