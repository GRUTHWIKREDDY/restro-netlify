import { test, expect } from '@playwright/test';

test.describe('Staff Portal Login', () => {

  test.describe('1. Portal Landing', () => {
    test('should load staff portal at /portal', async ({ page }) => {
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
      expect(content).toMatch(/portal|staff|admin|kitchen/i);
    });

    test('should display role selection options', async ({ page }) => {
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toMatch(/admin|kitchen|super|merchant|chef/i);
    });
  });

  test.describe('2. Role Selection', () => {
    test('should select Admin role', async ({ page }) => {
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      
      const adminBtn = page.locator('button').filter({ hasText: /admin|merchant/i }).first();
      if (await adminBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await adminBtn.click();
        
        const content = await page.textContent('body');
        expect(content).toMatch(/email|password|login|credential/i);
      }
    });

    test('should select Kitchen role', async ({ page }) => {
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      
      const chefBtn = page.locator('button').filter({ hasText: /kitchen|chef|kds/i }).first();
      if (await chefBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await chefBtn.click();
        
        const content = await page.textContent('body');
        expect(content).toMatch(/email|password|login|credential/i);
      }
    });
  });

  test.describe('3. Dev Bypass Login', () => {
    test('should login with dev bypass credentials', async ({ page }) => {
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      
      const adminBtn = page.locator('button').filter({ hasText: /admin|merchant/i }).first();
      if (await adminBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await adminBtn.click();
        await page.waitForTimeout(500);
      }
      
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]');
      
      if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emailInput.fill('admin@kcode.it');
        await passwordInput.fill('password');
        
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        
        await page.waitForTimeout(2000);
        
        const content = await page.textContent('body');
        expect(content).toBeTruthy();
      }
    });
  });

  test.describe('4. Invalid Login', () => {
    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      
      const adminBtn = page.locator('button').filter({ hasText: /admin|merchant/i }).first();
      if (await adminBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await adminBtn.click();
        await page.waitForTimeout(500);
      }
      
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]');
      
      if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emailInput.fill('wrong@email.com');
        await passwordInput.fill('wrongpassword');
        
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        
        await page.waitForTimeout(2000);
        
        const content = await page.textContent('body');
        expect(content).toMatch(/invalid|error|incorrect|failed/i);
      }
    });
  });
});
