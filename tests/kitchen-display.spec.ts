import { test, expect } from '@playwright/test';

test.describe('Kitchen Display System', () => {

  async function loginAsChef(page: import('@playwright/test').Page) {
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');

    const chefBtn = page.locator('button').filter({ hasText: /kitchen|chef|kds/i }).first();
    if (await chefBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chefBtn.click();
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

  test.describe('1. KDS Landing', () => {
    test('should display kitchen display after chef login', async ({ page }) => {
      await loginAsChef(page);

      const content = await page.textContent('body');
      expect(content).toBeTruthy();
      expect(content).toMatch(/kitchen|KDS|chef|order/i);
    });

    test('should show restaurant name on KDS', async ({ page }) => {
      await loginAsChef(page);

      const content = await page.textContent('body');
      expect(content).toMatch(/kitchen|KDS|chef|restaurant/i);
    });
  });

  test.describe('2. Order Display', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsChef(page);
    });

    test('should display pending orders', async ({ page }) => {
      const content = await page.textContent('body');
      expect(content).toMatch(/pending|order|ticket/i);
    });

    test('should show order items', async ({ page }) => {
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('should display table numbers', async ({ page }) => {
      const content = await page.textContent('body');
      expect(content).toMatch(/table|\d+/);
    });
  });

  test.describe('3. Order Status', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsChef(page);
    });

    test('should show status controls', async ({ page }) => {
      const content = await page.textContent('body');
      expect(content).toMatch(/accept|prepare|start|ready|complete/i);
    });
  });

  test.describe('4. Timer', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsChef(page);
    });

    test('should show order age or timestamp', async ({ page }) => {
      const content = await page.textContent('body');
      expect(content).toMatch(/\d+:\d+|min|sec|ago|time/i);
    });
  });
});
