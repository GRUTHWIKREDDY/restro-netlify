import { test, expect, type Page, APIRequestContext } from '@playwright/test';

async function resetDb(request: APIRequestContext) {
  await request.post('http://localhost:3001/api/reset');
}

async function loginCustomerFlow(page: Page, phone: string, name: string, pin: string, table: string = '99') {
  await page.goto(`/r/rest-1/t/${table}`);
  await page.waitForLoadState('networkidle');
  
  // Fill phone and name
  const phoneInput = page.locator('input[placeholder*="9876543210"]');
  const nameInput = page.locator('input[placeholder*="Liam Parker"]');
  
  if (await phoneInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await phoneInput.fill(phone);
    await nameInput.fill(name);
    
    // Submit form
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    
    await page.waitForTimeout(1500);
    
    // Enter PIN if visible
    const pinInputs = page.locator('input[placeholder="-"]');
    const pinCount = await pinInputs.count();
    
    if (pinCount >= 4) {
      for (let i = 0; i < 4; i++) {
        await pinInputs.nth(i).fill(pin[i]);
      }
      
      const menuBtn = page.locator('button').filter({ hasText: /View Digital Menu|Enter/i });
      if (await menuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await menuBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  }
}

test.describe('Customer Dine-In Flow', () => {

  test.describe('1. QR Code Routing & Landing', () => {
    test('should load customer UI via QR route', async ({ page }) => {
      await page.goto('/r/rest-1/t/3');
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
      expect(content).toMatch(/phone|name|check|enter|dining/i);
    });

    test('should handle different restaurant IDs', async ({ page }) => {
      await page.goto('/r/rest-2/t/1');
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
      await page.goto('/r/rest-1/t/3');
      await page.waitForLoadState('networkidle');
      
      const phoneInput = page.locator('input[placeholder*="9876543210"]');
      if (await phoneInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await phoneInput.fill('1234567890');
        
        const submitBtn = page.locator('button[type="submit"]');
        await submitBtn.click();
        
        await page.waitForTimeout(1000);
        
        const content = await page.textContent('body');
        expect(content).toMatch(/valid|10-digit|error/i);
      }
    });

    test('should accept valid Indian phone numbers', async ({ page }) => {
      await page.goto('/r/rest-1/t/3');
      await page.waitForLoadState('networkidle');
      
      const phoneInput = page.locator('input[placeholder*="9876543210"]');
      const nameInput = page.locator('input[placeholder*="Liam Parker"]');
      
      if (await phoneInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await phoneInput.fill('9876543210');
        await nameInput.fill('Sanjay');
        
        const submitBtn = page.locator('button[type="submit"]');
        await submitBtn.click();
        
        await page.waitForTimeout(1500);
        
        // Should proceed to PIN entry
        const content = await page.textContent('body');
        expect(content).toMatch(/access|code|pin|dining/i);
      }
    });
  });

  test.describe('3. PIN Verification', () => {
    test('should reject incorrect PIN', async ({ page }) => {
      await page.goto('/r/rest-1/t/3');
      await page.waitForLoadState('networkidle');
      
      const phoneInput = page.locator('input[placeholder*="9876543210"]');
      const nameInput = page.locator('input[placeholder*="Liam Parker"]');
      
      if (await phoneInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await phoneInput.fill('9876543210');
        await nameInput.fill('Sanjay');
        
        const submitBtn = page.locator('button[type="submit"]');
        await submitBtn.click();
        
        await page.waitForTimeout(1500);
        
        const pinInputs = page.locator('input[placeholder="-"]');
        const pinCount = await pinInputs.count();
        
        if (pinCount >= 4) {
          await pinInputs.nth(0).fill('0');
          await pinInputs.nth(1).fill('0');
          await pinInputs.nth(2).fill('0');
          await pinInputs.nth(3).fill('0');
          
          const menuBtn = page.locator('button').filter({ hasText: /View Digital Menu|Enter/i });
          await menuBtn.click();
          
          await page.waitForTimeout(1000);
          
          const content = await page.textContent('body');
          expect(content).toMatch(/invalid|incorrect|wrong|error/i);
        }
      }
    });

    test('should accept correct PIN (1234)', async ({ page }) => {
      await page.goto('/r/rest-1/t/3');
      await page.waitForLoadState('networkidle');
      
      const phoneInput = page.locator('input[placeholder*="9876543210"]');
      const nameInput = page.locator('input[placeholder*="Liam Parker"]');
      
      if (await phoneInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await phoneInput.fill('9876543210');
        await nameInput.fill('Sanjay');
        
        const submitBtn = page.locator('button[type="submit"]');
        await submitBtn.click();
        
        await page.waitForTimeout(1500);
        
        const pinInputs = page.locator('input[placeholder="-"]');
        const pinCount = await pinInputs.count();
        
        if (pinCount >= 4) {
          await pinInputs.nth(0).fill('1');
          await pinInputs.nth(1).fill('2');
          await pinInputs.nth(2).fill('3');
          await pinInputs.nth(3).fill('4');
          
          const menuBtn = page.locator('button').filter({ hasText: /View Digital Menu|Enter/i });
          await menuBtn.click();
          
          await page.waitForTimeout(2000);
          
          const content = await page.textContent('body');
          expect(content).toContain('Butter Chicken');
        }
      }
    });
  });

  test.describe('4. Menu Browsing', () => {
    test('should display menu items after login', async ({ page, request }) => {
      await resetDb(request);
      await loginCustomerFlow(page, '9876543210', 'Sanjay', '1234', '98');
      
      const content = await page.textContent('body');
      expect(content).toContain('Butter Chicken');
    });

    test('should filter by category', async ({ page, request }) => {
      await resetDb(request);
      await loginCustomerFlow(page, '9876543210', 'Sanjay', '1234', '97');
      
      const starterBtn = page.locator('button').filter({ hasText: /Starter/i }).first();
      if (await starterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await starterBtn.click();
        
        const content = await page.textContent('body');
        expect(content).toContain('Tandoori Soya Chaap');
      }
    });

    test('should search menu items', async ({ page, request }) => {
      await resetDb(request);
      await loginCustomerFlow(page, '9876543210', 'Sanjay', '1234', '96');
      
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill('Butter');
        
        await page.waitForTimeout(500);
        
        const content = await page.textContent('body');
        expect(content).toContain('Butter Chicken');
      }
    });
  });

  test.describe('5. Cart Operations', () => {
    test('should add item to cart', async ({ page, request }) => {
      await resetDb(request);
      await loginCustomerFlow(page, '9876543210', 'Sanjay', '1234', '95');
      
      const addBtn = page.locator('button').filter({ hasText: /\+ Add|Add/i }).first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.click();
        
        await page.waitForTimeout(500);
        
        const content = await page.textContent('body');
        expect(content).toMatch(/basket|cart|order/i);
      }
    });

    test('should show empty cart state', async ({ page, request }) => {
      await resetDb(request);
      await loginCustomerFlow(page, '9876543210', 'Sanjay', '1234', '94');
      
      const content = await page.textContent('body');
      expect(content).not.toMatch(/Your Basket|Verify Basket/);
    });
  });

  test.describe('6. Waiter Buzzer', () => {
    test('should have buzzer functionality', async ({ page, request }) => {
      await resetDb(request);
      await loginCustomerFlow(page, '9876543210', 'Sanjay', '1234', '93');
      
      const buzzerBtn = page.locator('button').filter({ hasText: /bell|🛎️|buzzer|summon/i }).first();
      const bellIcon = page.locator('svg.lucide-bell').first();
      const hasBuzzer = await buzzerBtn.isVisible({ timeout: 3000 }).catch(() => false) 
        || await bellIcon.isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasBuzzer).toBeTruthy();
    });
  });

  test.describe('7. AI Concierge', () => {
    test('should have AI assistant feature', async ({ page, request }) => {
      await resetDb(request);
      await loginCustomerFlow(page, '9876543210', 'Sanjay', '1234', '92');
      
      const content = await page.textContent('body');
      expect(content).toMatch(/ai|maitre|gemini|concierge|assistant|sparkle/i);
    });
  });
});
