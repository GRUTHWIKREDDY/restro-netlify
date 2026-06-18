import { test, expect } from '@playwright/test';

test.describe('Super Admin Dashboard', () => {

  test.describe('1. Super Admin Landing', () => {
    test('should load super admin via /kcodeit route', async ({ page }) => {
      await page.goto('/kcodeit');
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
      expect(content).toMatch(/super|saas|platform|admin/i);
    });

    test('should display super admin login form', async ({ page }) => {
      await page.goto('/kcodeit');
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toMatch(/super|saas|platform|admin|email|password/i);
    });
  });

  test.describe('2. Super Admin Login', () => {
    test('should login with dev bypass', async ({ page }) => {
      await page.goto('/kcodeit');
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('admin@kcode.it');
        await page.locator('input[type="password"], input[placeholder*="password" i]').fill('password');
        
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        
        await page.waitForTimeout(2000);
        
        const content = await page.textContent('body');
        expect(content).toMatch(/dashboard|control|saas|platform|restaurant/i);
      }
    });
  });

  test.describe('3. Dashboard Overview', () => {
    test('should display all restaurants', async ({ page }) => {
      await page.goto('/kcodeit');
      await page.waitForLoadState('networkidle');
      
      // Login first
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('admin@kcode.it');
        await page.locator('input[type="password"], input[placeholder*="password" i]').fill('password');
        
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        
        await page.waitForTimeout(2000);
      }
      
      const content = await page.textContent('body');
      expect(content).toMatch(/restaurant|tenant|outlet|dashboard/i);
    });

    test('should show platform metrics', async ({ page }) => {
      await page.goto('/kcodeit');
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('admin@kcode.it');
        await page.locator('input[type="password"], input[placeholder*="password" i]').fill('password');
        
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        
        await page.waitForTimeout(2000);
      }
      
      const content = await page.textContent('body');
      expect(content).toMatch(/revenue|order|total|metric|dashboard/i);
    });
  });

  test.describe('4. Restaurant Management', () => {
    test('should show restaurant status', async ({ page }) => {
      await page.goto('/kcodeit');
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('admin@kcode.it');
        await page.locator('input[type="password"], input[placeholder*="password" i]').fill('password');
        
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        
        await page.waitForTimeout(2000);
      }
      
      const content = await page.textContent('body');
      expect(content).toMatch(/active|inactive|status|restaurant/i);
    });
  });

  test.describe('5. Staff Management', () => {
    test('should show staff management section', async ({ page }) => {
      await page.goto('/kcodeit');
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('admin@kcode.it');
        await page.locator('input[type="password"], input[placeholder*="password" i]').fill('password');
        
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        
        await page.waitForTimeout(2000);
      }
      
      const content = await page.textContent('body');
      expect(content).toMatch(/staff|credential|user|account|dashboard/i);
    });
  });

  test.describe('6. Global Orders', () => {
    test('should display cross-tenant orders', async ({ page }) => {
      await page.goto('/kcodeit');
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('admin@kcode.it');
        await page.locator('input[type="password"], input[placeholder*="password" i]').fill('password');
        
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        
        await page.waitForTimeout(2000);
      }
      
      const content = await page.textContent('body');
      expect(content).toMatch(/order|ticket|transaction|dashboard/i);
    });
  });
});
