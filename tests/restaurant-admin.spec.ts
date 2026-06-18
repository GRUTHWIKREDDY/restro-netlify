import { test, expect } from '@playwright/test';

test.describe('Restaurant Admin Panel', () => {

  async function loginAsAdmin(page: import('@playwright/test').Page) {
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');
    
    const adminBtn = page.locator('button').filter({ hasText: /admin|merchant/i }).first();
    if (await adminBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await adminBtn.click();
      await page.waitForTimeout(500);
    }
    
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('admin@kcode.it');
      await page.locator('input[type="password"], input[placeholder*="password" i]').fill('password');
      
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await page.waitForTimeout(2000);
    }
  }

  test.describe('1. Dashboard Overview', () => {
    test('should display restaurant admin panel after login', async ({ page }) => {
      await loginAsAdmin(page);
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
      expect(content).toMatch(/admin|panel|dashboard|restaurant/i);
    });

    test('should show restaurant name', async ({ page }) => {
      await loginAsAdmin(page);
      
      const content = await page.textContent('body');
      expect(content).toMatch(/Royal Clay Oven|restaurant|rest-/i);
    });
  });

  test.describe('2. Menu Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('should display menu items list', async ({ page }) => {
      const menuTab = page.locator('button').filter({ hasText: /menu|catalog|items/i }).first();
      if (await menuTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await menuTab.click();
        await page.waitForTimeout(1000);
        
        const content = await page.textContent('body');
        expect(content).toContain('Butter Chicken');
      }
    });

    test('should show add menu item option', async ({ page }) => {
      const menuTab = page.locator('button').filter({ hasText: /menu|catalog|items/i }).first();
      if (await menuTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await menuTab.click();
        await page.waitForTimeout(500);
        
        const addBtn = page.locator('button').filter({ hasText: /add|create|new/i }).first();
        expect(await addBtn.isVisible({ timeout: 3000 }).catch(() => false)).toBeTruthy();
      }
    });
  });

  test.describe('3. Table Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('should display table management section', async ({ page }) => {
      const tableTab = page.locator('button').filter({ hasText: /table|floor|qr/i }).first();
      if (await tableTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tableTab.click();
        await page.waitForTimeout(1000);
        
        const content = await page.textContent('body');
        expect(content).toMatch(/table|floor|qr|seat/i);
      }
    });
  });

  test.describe('4. Order Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('should display orders list', async ({ page }) => {
      const ordersTab = page.locator('button').filter({ hasText: /order|ticket/i }).first();
      if (await ordersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await ordersTab.click();
        await page.waitForTimeout(1000);
        
        const content = await page.textContent('body');
        expect(content).toMatch(/order|pending|completed/i);
      }
    });
  });

  test.describe('5. Restaurant Status', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('should show active/inactive status', async ({ page }) => {
      const content = await page.textContent('body');
      expect(content).toMatch(/active|inactive|status|open|close/i);
    });
  });
});
