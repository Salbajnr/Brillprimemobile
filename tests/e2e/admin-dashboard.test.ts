
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('Admin Dashboard E2E Tests', () => {
  let browser: Browser;
  let page: Page;
  const ADMIN_URL = 'http://0.0.0.0:5173'; // Admin dashboard URL
  const API_URL = 'http://0.0.0.0:5000';

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
    await page.setViewport({ width: 1366, height: 768 });
  });

  describe('Admin Authentication', () => {
    test('should load admin login page', async () => {
      await page.goto(ADMIN_URL);
      await page.waitForSelector('[data-testid="admin-login"]', { timeout: 10000 });
      
      const title = await page.title();
      expect(title).toContain('Admin');
      
      const loginForm = await page.$('form');
      expect(loginForm).toBeTruthy();
    });

    test('should handle admin login flow', async () => {
      await page.goto(ADMIN_URL);
      await page.waitForSelector('input[type="email"]');
      
      await page.type('input[type="email"]', 'admin@brillprime.com');
      await page.type('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      // Wait for dashboard or error message
      await Promise.race([
        page.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 5000 }),
        page.waitForSelector('.error', { timeout: 5000 })
      ]);
      
      const url = page.url();
      console.log('After login URL:', url);
    });
  });

  describe('User Management', () => {
    test('should display user management interface', async () => {
      await page.goto(`${ADMIN_URL}/users`);
      await page.waitForSelector('[data-testid="user-table"]', { timeout: 10000 });
      
      const userTable = await page.$('[data-testid="user-table"]');
      expect(userTable).toBeTruthy();
      
      // Check for filters
      const searchInput = await page.$('input[placeholder*="Search"]');
      expect(searchInput).toBeTruthy();
    });

    test('should filter users by role', async () => {
      await page.goto(`${ADMIN_URL}/users`);
      await page.waitForSelector('select', { timeout: 5000 });
      
      await page.select('select', 'CONSUMER');
      await page.waitForTimeout(1000);
      
      const rows = await page.$$('tbody tr');
      console.log(`Found ${rows.length} users after filtering`);
    });
  });

  describe('Transaction Management', () => {
    test('should display transaction list', async () => {
      await page.goto(`${ADMIN_URL}/transactions`);
      await page.waitForSelector('[data-testid="transaction-table"]', { timeout: 10000 });
      
      const transactionTable = await page.$('[data-testid="transaction-table"]');
      expect(transactionTable).toBeTruthy();
    });

    test('should open transaction detail modal', async () => {
      await page.goto(`${ADMIN_URL}/transactions`);
      await page.waitForSelector('tbody tr', { timeout: 5000 });
      
      const firstRow = await page.$('tbody tr');
      if (firstRow) {
        await firstRow.click();
        await page.waitForSelector('[data-testid="transaction-modal"]', { timeout: 3000 });
        
        const modal = await page.$('[data-testid="transaction-modal"]');
        expect(modal).toBeTruthy();
      }
    });
  });

  describe('Real-time Monitoring', () => {
    test('should display monitoring dashboard', async () => {
      await page.goto(`${ADMIN_URL}/monitoring`);
      await page.waitForSelector('[data-testid="monitoring-dashboard"]', { timeout: 10000 });
      
      const dashboard = await page.$('[data-testid="monitoring-dashboard"]');
      expect(dashboard).toBeTruthy();
      
      // Check for metrics cards
      const metricsCards = await page.$$('[data-testid="metric-card"]');
      expect(metricsCards.length).toBeGreaterThan(0);
    });

    test('should display driver location map', async () => {
      await page.goto(`${ADMIN_URL}/monitoring`);
      await page.waitForSelector('[data-testid="driver-map"]', { timeout: 10000 });
      
      const map = await page.$('[data-testid="driver-map"]');
      expect(map).toBeTruthy();
    });
  });

  describe('Fraud Detection', () => {
    test('should display fraud alerts', async () => {
      await page.goto(`${ADMIN_URL}/fraud`);
      await page.waitForSelector('[data-testid="fraud-alerts"]', { timeout: 10000 });
      
      const alertsTable = await page.$('[data-testid="fraud-alerts"]');
      expect(alertsTable).toBeTruthy();
    });
  });

  describe('Content Moderation', () => {
    test('should display moderation interface', async () => {
      await page.goto(`${ADMIN_URL}/moderation`);
      await page.waitForSelector('[data-testid="moderation-reports"]', { timeout: 10000 });
      
      const reportsTable = await page.$('[data-testid="moderation-reports"]');
      expect(reportsTable).toBeTruthy();
    });
  });
});
