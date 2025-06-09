import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8081';
const SELLER_EMAIL = 'test@example.com';
const SELLER_PASSWORD = 'password123';

test.describe('Seller Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto(`${BASE_URL}/seller/login`);
    
    // Fill in the login form
    await page.fill('input[name="email"]', SELLER_EMAIL);
    await page.fill('input[name="password"]', SELLER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL(`${BASE_URL}/seller/dashboard`);
  });

  test('should display all sidebar elements', async ({ page }) => {
    // Check if sidebar is visible
    const sidebar = page.locator('.md\\:flex-col');
    await expect(sidebar).toBeVisible();
    
    // Check sidebar header
    await expect(page.getByText('Byblos Atelier')).toBeVisible();
    
    // Check navigation links
    const navLinks = ['Dashboard', 'Products', 'Add Product', 'Settings'];
    for (const linkText of navLinks) {
      await expect(page.getByRole('link', { name: linkText })).toBeVisible();
    }
    
    // Check user section
    await expect(page.getByText('Seller Account')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('should navigate to Dashboard', async ({ page }) => {
    await page.click('a:has-text("Dashboard")');
    await expect(page).toHaveURL(`${BASE_URL}/seller/dashboard`);
    await expect(page.locator('a:has-text("Dashboard")')).toHaveClass(/bg-gray-100/);
  });

  test('should navigate to Products', async ({ page }) => {
    await page.click('a:has-text("Products")');
    await expect(page).toHaveURL(`${BASE_URL}/seller/dashboard/products`);
    await expect(page.locator('a:has-text("Products")')).toHaveClass(/bg-gray-100/);
  });

  test('should navigate to Add Product', async ({ page }) => {
    await page.click('a:has-text("Add Product")');
    await expect(page).toHaveURL(`${BASE_URL}/seller/dashboard/add-product`);
    await expect(page.locator('a:has-text("Add Product")')).toHaveClass(/bg-gray-100/);
  });

  test('should navigate to Settings', async ({ page }) => {
    await page.click('a:has-text("Settings")');
    await expect(page).toHaveURL(`${BASE_URL}/seller/dashboard/settings`);
    await expect(page.locator('a:has-text("Settings")')).toHaveClass(/bg-gray-100/);
  });

  test('should highlight active navigation item', async ({ page }) => {
    const navItems = [
      { text: 'Dashboard', url: 'dashboard' },
      { text: 'Products', url: 'products' },
      { text: 'Add Product', url: 'add-product' },
      { text: 'Settings', url: 'settings' }
    ];

    for (const item of navItems) {
      await page.goto(`${BASE_URL}/seller/dashboard/${item.url}`);
      const activeLink = page.locator(`a:has-text("${item.text}")`);
      await expect(activeLink).toHaveClass(/bg-gray-100/);
    }
  });

  test('should sign out when clicking Sign out', async ({ page }) => {
    await page.click('button:has-text("Sign out")');
    await expect(page).toHaveURL(`${BASE_URL}/seller/login`);
    
    // Verify user is redirected to login when trying to access dashboard
    await page.goto(`${BASE_URL}/seller/dashboard`);
    await expect(page).toHaveURL(`${BASE_URL}/seller/login`);
  });
});
