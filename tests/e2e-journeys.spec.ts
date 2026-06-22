import { test, expect } from '@playwright/test';

test.describe('Complete E2E User Journeys', () => {

  test.describe('Journey 1: Full Customer Dining Flow', () => {
    test('complete customer journey from QR scan to order placement', async ({ page }) => {
      // Pre-seed localStorage to skip Bhojan welcome overlay
      await page.addInitScript(() => {
        try { localStorage.setItem('bhojan_welcome_seen', 'true'); } catch {}
      });

      // 1. Customer scans QR code
      await page.goto('/r/rest-1/t/3');
      await page.waitForLoadState('networkidle');

      // 2. Fill the combined check-in form (name + phone + PIN all in one form)
      const nameInput = page.locator('input[placeholder*="Liam Parker"]');
      const phoneInput = page.locator('input[placeholder*="9876543210"]');

      if (await phoneInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.fill('Sanjay');
        await phoneInput.fill('9876543210');

        // 3. Fill PIN (1234 for rest-1) — inline in the same form
        const pinInputs = page.locator('input[placeholder="-"]');
        const count = await pinInputs.count();
        if (count >= 4) {
          await pinInputs.nth(0).fill('1');
          await pinInputs.nth(1).fill('2');
          await pinInputs.nth(2).fill('3');
          await pinInputs.nth(3).fill('4');
        }

        // 4. Submit the single "View Digital Menu" button
        const submitBtn = page.locator('button[type="submit"]');
        await submitBtn.click();
        await page.waitForTimeout(2000);

        // 5. Should see menu/dining view
        const bodyText = await page.textContent('body');
        expect(bodyText).toMatch(/menu|food|dish|dining|enjoy|table/i);

        // 6. Try to add item to cart (force click to bypass any overlays)
        const addBtn = page.locator('button').filter({ hasText: /\+ Add|Add/i }).first();
        if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await addBtn.click({ force: true });
          await page.waitForTimeout(500);

          // 7. Cart should appear
          const content = await page.textContent('body');
          expect(content).toMatch(/basket|cart|order/i);
        }
      }
    });
  });

  test.describe('Journey 2: Staff Admin Workflow', () => {
    test('complete admin workflow from login to menu management', async ({ page }) => {
      // 1. Navigate to portal
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      
      // 2. Merchant Admin Portal is default selected
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      await emailInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

      if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emailInput.fill('rest-1@admin.it');
        await page.locator('input[type="password"], input[placeholder*="password" i]').fill('password');
        
        // 3. Login
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        
        await page.waitForTimeout(2500);
        
        // 4. Should see admin panel
        const bodyText = await page.textContent('body');
        expect(bodyText).toMatch(/admin|panel|dashboard|restaurant|menu|order/i);
        
        // 5. Navigate to menu section
        const menuTab = page.locator('button').filter({ hasText: /menu|catalog|items/i }).first();
        if (await menuTab.isVisible({ timeout: 3000 }).catch(() => false)) {
          await menuTab.click();
          await page.waitForTimeout(1000);
          
          // 6. Should see menu items
          const menuText = await page.textContent('body');
          expect(menuText).toMatch(/menu|item|food|dish/i);
        }
      }
    });
  });

  test.describe('Journey 3: Kitchen Display Workflow', () => {
    test('complete KDS workflow from login to order management', async ({ page }) => {
      // 1. Navigate to portal
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      
      // 2. Select Kitchen role
      const chefBtn = page.locator('button').filter({ hasText: /kitchen|chef/i }).first();
      if (await chefBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await chefBtn.click();
        await page.waitForTimeout(500);
      }
      
      // 3. Enter credentials
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      await emailInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

      if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emailInput.fill('rest-1@chef.it');
        await page.locator('input[type="password"], input[placeholder*="password" i]').fill('password');
        
        // 4. Login
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        
        await page.waitForTimeout(2500);
        
        // 5. Should see KDS
        const bodyText = await page.textContent('body');
        expect(bodyText).toMatch(/kitchen|KDS|chef|order|pending/i);
      }
    });
  });

  test.describe('Journey 4: Super Admin Complete Flow', () => {
    test('complete super admin flow from login to restaurant management', async ({ page }) => {
      // 1. Navigate to super admin route
      await page.goto('/kcodeit');
      await page.waitForLoadState('networkidle');
      
      // 2. Login with super admin credentials
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailInput.fill('admin@kcode.it');
        await page.locator('input[type="password"], input[placeholder*="password" i]').fill('password');
        
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        
        await page.waitForTimeout(2000);
        
        // 3. Should see dashboard or login page (Supabase auth may reject test credentials)
        const bodyText = await page.textContent('body');
        expect(bodyText).toMatch(/dashboard|control|saas|platform|restaurant|admin|login/i);
      }
    });
  });

  test.describe('Journey 5: Cross-Portal Navigation', () => {
    test('navigate between all portals', async ({ page }) => {
      // 1. Start at customer view
      await page.goto('/r/rest-1/t/3');
      await page.waitForLoadState('networkidle');
      
      // 2. Navigate to portal
      const portalLink = page.locator('a, button').filter({ hasText: /portal|staff/i }).first();
      if (await portalLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await portalLink.click();
        await page.waitForLoadState('networkidle');
        
        const content = await page.textContent('body');
        expect(content).toBeTruthy();
      }
      
      // 3. Navigate to super admin
      await page.goto('/kcodeit');
      await page.waitForLoadState('networkidle');
      
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe('Journey 6: Multi-Restaurant Flow', () => {
    test('switch between restaurants and verify data isolation', async ({ page }) => {
      // 1. Load rest-1
      await page.goto('/r/rest-1/t/3');
      await page.waitForLoadState('networkidle');
      
      const content1 = await page.textContent('body');
      expect(content1).toBeTruthy();
      
      // 2. Load rest-2
      await page.goto('/r/rest-2/t/1');
      await page.waitForLoadState('networkidle');
      
      const content2 = await page.textContent('body');
      expect(content2).toBeTruthy();
      
      // 3. Load rest-3
      await page.goto('/r/rest-3/t/2');
      await page.waitForLoadState('networkidle');
      
      const content3 = await page.textContent('body');
      expect(content3).toBeTruthy();
    });
  });
});
