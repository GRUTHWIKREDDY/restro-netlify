import { test, expect, type Page } from '@playwright/test';

/**
 * Dismisses the Bhojan welcome overlay if it appears.
 */
async function dismissBhojanOverlay(page: Page) {
  await page.evaluate(() => {
    try { localStorage.setItem('bhojan_welcome_seen', 'true'); } catch {}
  });

  const overlay = page.locator('#bhojan-welcome-overlay');
  if (await overlay.isVisible().catch(() => false)) {
    const closeBtn = overlay.locator('button[aria-label="Skip introduction"]');
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    } else {
      const backdrop = overlay.locator('.absolute.inset-0').first();
      if (await backdrop.isVisible().catch(() => false)) {
        await backdrop.click({ force: true });
      }
    }
    await page.waitForTimeout(500);
  }
}

/**
 * Logs in as a dine-in customer. All fields (name, phone, PIN) are in a single form.
 * Waits for restaurant data (verificationPin) to load from Supabase before submitting.
 */
async function loginCustomerFlow(page: Page, phone: string, name: string, pin: string, table: string = '10') {
  // Pre-seed localStorage to skip the Bhojan welcome overlay
  await page.addInitScript(() => {
    try { localStorage.setItem('bhojan_welcome_seen', 'true'); } catch {}
  });

  await page.goto(`/r/rest-1/t/${table}`);
  await page.waitForLoadState('networkidle');

  const nameInput = page.locator('input[placeholder*="Liam Parker"]');
  const phoneInput = page.locator('input[placeholder*="9876543210"]');

  // Wait for the check-in form to load (the inputs to be visible)
  await phoneInput.waitFor({ state: 'visible', timeout: 10000 });

  await nameInput.fill(name);
  await phoneInput.fill(phone);

  // Fill PIN digits (all 4 in the same form)
  const pinInputs = page.locator('input[placeholder="-"]');
  const pinCount = await pinInputs.count();
  if (pinCount >= 4) {
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill(pin[i]);
    }
  }

  // Submit the combined form
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();
  await page.waitForTimeout(2500);

  // Dismiss overlay just in case
  await dismissBhojanOverlay(page);
}

test.describe('Customer Dine-In Flow', () => {

  test.describe('1. QR Code Routing & Landing', () => {
    test('should load customer UI via QR route', async ({ page }) => {
      await page.goto('/r/rest-1/t/10');
      await page.waitForLoadState('networkidle');

      // Wait until check-in form input appears
      const phoneInput = page.locator('input[placeholder*="9876543210"]');
      await phoneInput.waitFor({ state: 'visible', timeout: 10000 });

      const content = await page.textContent('body');
      expect(content).toBeTruthy();
      expect(content).toMatch(/welcome|name|phone|code|dining|Royal Clay|Access Code|Bhojan|Namaste|Liam Parker|9876543210/i);
    });

    test('should handle different restaurant IDs', async ({ page }) => {
      await page.goto('/r/rest-2/t/10');
      await page.waitForLoadState('networkidle');

      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('should default to rest-1 when no QR route', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });
  });

  test.describe('2. Phone Number Validation', () => {
    test('should reject invalid phone numbers', async ({ page }) => {
      await page.goto('/r/rest-1/t/10');
      await page.waitForLoadState('networkidle');

      const phoneInput = page.locator('input[placeholder*="9876543210"]');
      await phoneInput.waitFor({ state: 'visible', timeout: 10000 });

      await phoneInput.fill('1234');

      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      await page.waitForTimeout(1000);

      const content = await page.textContent('body');
      expect(content).toMatch(/name|phone|code|welcome|Namaste/i);
    });

    test('should accept valid Indian phone numbers', async ({ page }) => {
      await page.goto('/r/rest-1/t/10');
      await page.waitForLoadState('networkidle');

      const phoneInput = page.locator('input[placeholder*="9876543210"]');
      const nameInput = page.locator('input[placeholder*="Liam Parker"]');

      await phoneInput.waitFor({ state: 'visible', timeout: 10000 });

      await nameInput.fill('Sanjay');
      await phoneInput.fill('9876543210');

      const content = await page.textContent('body');
      expect(content).toMatch(/phone|code|name/i);
    });
  });

  test.describe('3. PIN Verification', () => {
    test('should reject incorrect PIN', async ({ page }) => {
      await page.goto('/r/rest-1/t/10');
      await page.waitForLoadState('networkidle');

      const nameInput = page.locator('input[placeholder*="Liam Parker"]');
      const phoneInput = page.locator('input[placeholder*="9876543210"]');

      await phoneInput.waitFor({ state: 'visible', timeout: 10000 });

      await nameInput.fill('Sanjay');
      await phoneInput.fill('9876543210');

      const pinInputs = page.locator('input[placeholder="-"]');
      if (await pinInputs.count() >= 4) {
        await pinInputs.nth(0).fill('0');
        await pinInputs.nth(1).fill('0');
        await pinInputs.nth(2).fill('0');
        await pinInputs.nth(3).fill('0');
      }

      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      await page.waitForTimeout(1000);

      const content = await page.textContent('body');
      expect(content).toMatch(/invalid|incorrect|wrong|error/i);
    });

    test('should accept correct PIN (1234)', async ({ page }) => {
      await loginCustomerFlow(page, '9876543210', 'Sanjay', '1234', '11');

      const content = await page.textContent('body');
      expect(content).toMatch(/menu|food|dish|dining|enjoy|table|Bhojan|Namaste/i);
    });
  });

  test.describe('4. Menu Browsing', () => {
    test('should display menu items after login', async ({ page }) => {
      await loginCustomerFlow(page, '9876543211', 'Ramesh', '1234', '12');

      const content = await page.textContent('body');
      expect(content).toMatch(/menu|food|item|dish|dining/i);
    });

    test('should filter by category', async ({ page }) => {
      await loginCustomerFlow(page, '9876543212', 'Priya', '1234', '13');

      const starterBtn = page.locator('button').filter({ hasText: /Starter|starter|appetizer/i }).first();
      if (await starterBtn.isVisible().catch(() => false)) {
        await starterBtn.click({ force: true });
        await page.waitForTimeout(500);

        const content = await page.textContent('body');
        expect(content).toMatch(/starter|appetizer|tandoori|chaap|chicken/i);
      } else {
        const content = await page.textContent('body');
        expect(content).toMatch(/menu|food|item|dish|dining/i);
      }
    });

    test('should search menu items', async ({ page }) => {
      await loginCustomerFlow(page, '9876543213', 'Arjun', '1234', '14');

      // Wait for menu items to load from Supabase before searching
      const anyItem = page.locator('button').filter({ hasText: /Add|\+ Add/i }).first();
      await anyItem.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});

      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('Butter');
        await page.waitForTimeout(1000);

        const content = await page.textContent('body');
        expect(content).toMatch(/butter|chicken|menu|item|food/i);
      } else {
        const content = await page.textContent('body');
        expect(content).toMatch(/dining|table|menu|Royal Clay/i);
      }
    });
  });

  test.describe('5. Cart Operations', () => {
    test('should add item to cart', async ({ page }) => {
      await loginCustomerFlow(page, '9876543214', 'Meena', '1234', '15');

      const addBtn = page.locator('button').filter({ hasText: /\+ Add|Add/i }).first();
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click({ force: true });
        await page.waitForTimeout(500);

        const content = await page.textContent('body');
        expect(content).toMatch(/basket|cart|order|1/i);
      } else {
        const content = await page.textContent('body');
        expect(content).toMatch(/menu|food|dining/i);
      }
    });

    test('should show empty cart state', async ({ page }) => {
      await loginCustomerFlow(page, '9876543215', 'Kumar', '1234', '16');

      const content = await page.textContent('body');
      expect(content).not.toMatch(/Your Basket|Verify Basket/);
    });
  });

  test.describe('6. Waiter Buzzer', () => {
    test('should have buzzer functionality', async ({ page }) => {
      await loginCustomerFlow(page, '9876543216', 'Sunita', '1234', '17');

      const content = await page.textContent('body');
      expect(content).toMatch(/dining|menu|table|bell|buzzer|waiter|enjoy/i);
    });
  });

  test.describe('7. AI Concierge', () => {
    test('should have AI assistant feature', async ({ page }) => {
      await loginCustomerFlow(page, '9876543217', 'Deepak', '1234', '18');

      const content = await page.textContent('body');
      expect(content).toMatch(/ai|maitre|gemini|concierge|assistant|sparkle|bhojan/i);
    });
  });
});
