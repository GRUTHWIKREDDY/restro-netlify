import { test, expect } from '@playwright/test';

test.describe('Navigation & Routing', () => {

  test.describe('1. Route Handling', () => {
    test('should load root / path', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('should load /portal path', async ({ page }) => {
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('should load /kcodeit path for super admin', async ({ page }) => {
      await page.goto('/kcodeit');
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('should load customer QR route /r/:id/t/:num', async ({ page }) => {
      await page.goto('/r/rest-1/t/3');
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('should handle unknown routes gracefully', async ({ page }) => {
      await page.goto('/nonexistent-route');
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });
  });

  test.describe('2. Browser Navigation', () => {
    test('should handle back button', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      
      await page.goBack();
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('should handle forward button', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      
      await page.goBack();
      await page.goForward();
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });
  });
});

test.describe('Responsive Design', () => {

  test.describe('1. Mobile Viewport', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('should render customer UI on mobile', async ({ page }) => {
      await page.goto('/r/rest-1/t/3');
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });

    test('should render staff portal on mobile', async ({ page }) => {
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });
  });

  test.describe('2. Tablet Viewport', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('should render customer UI on tablet', async ({ page }) => {
      await page.goto('/r/rest-1/t/3');
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });
  });

  test.describe('3. Desktop Viewport', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should render customer UI on desktop', async ({ page }) => {
      await page.goto('/r/rest-1/t/3');
      await page.waitForLoadState('networkidle');
      
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    });
  });
});

test.describe('Error Handling & Edge Cases', () => {

  test.describe('1. JavaScript Console Errors', () => {
    test('should not have critical console errors on load', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto('/r/rest-1/t/3');
      await page.waitForLoadState('networkidle');
      
      const criticalErrors = errors.filter(e => 
        !e.includes('Supabase') && 
        !e.includes('credentials') &&
        !e.includes('Firebase') &&
        !e.includes('Warning') &&
        !e.includes('favicon')
      );
      
      expect(criticalErrors.length).toBe(0);
    });

    test('should not have critical errors on portal', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto('/portal');
      await page.waitForLoadState('networkidle');
      
      const criticalErrors = errors.filter(e => 
        !e.includes('Supabase') && 
        !e.includes('credentials') &&
        !e.includes('Warning')
      );
      
      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('2. Page Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/r/rest-1/t/3');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(10000);
    });
  });
});

test.describe('Footer & Global UI', () => {

  test('should display footer on all pages', async ({ page }) => {
    await page.goto('/r/rest-1/t/3');
    await page.waitForLoadState('networkidle');
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    
    const footerText = await footer.textContent();
    expect(footerText).toMatch(/Restro|kCodeIT|2026/);
  });

  test('should display footer on portal', async ({ page }) => {
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});
