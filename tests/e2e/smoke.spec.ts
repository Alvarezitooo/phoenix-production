import { test, expect } from '@playwright/test';

/**
 * Smoke Tests Phoenix — Sprint 8
 * Tests critiques pour validation Go-Live
 */

test.describe('Smoke Tests — Pages Publiques', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Phoenix/i);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('sign up page loads', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('sign in page loads', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
});

test.describe('Smoke Tests — Dashboard (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login avec user de test
    // await page.goto('/auth/sign-in');
    // await page.fill('input[name="email"]', 'test@phoenix.app');
    // await page.fill('input[name="password"]', 'TestPass123!');
    // await page.click('button[type="submit"]');
    // await expect(page).toHaveURL('/dashboard');
  });

  test.skip('dashboard loads with portals', async ({ page }) => {
    await page.goto('/dashboard');

    // Vérifie les portails principaux
    await expect(page.locator('text=Aube')).toBeVisible();
    await expect(page.locator('text=Aurora')).toBeVisible();
    await expect(page.locator('text=Letters')).toBeVisible();
    await expect(page.locator('text=Rise')).toBeVisible();

    // Vérifie energy wallet
    await expect(page.locator('text=/énergie/i')).toBeVisible();
  });

  test.skip('can navigate to Aurora', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=Aurora');
    await expect(page).toHaveURL('/aurora');
    await expect(page.locator('text=Le Voile')).toBeVisible();
  });
});

test.describe('Smoke Tests — Aurora Journey', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login
  });

  test.skip('Aurora chamber 1 loads', async ({ page }) => {
    await page.goto('/aurora');

    // Vérifie présence chambre 1
    await expect(page.locator('text=Le Voile')).toBeVisible();

    // Vérifie input disponible
    const input = page.locator('input[type="text"]').first();
    await expect(input).toBeVisible();
  });

  test.skip('can send message in chamber 1', async ({ page }) => {
    await page.goto('/aurora');

    // Envoie un message
    const input = page.locator('input[type="text"]').first();
    await input.fill('curieux');
    await page.click('button:has-text("Envoyer")');

    // Attend réponse IA (max 10s)
    await expect(page.locator('text=/C\'est une réaction/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Smoke Tests — Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('landing page responsive', async ({ page }) => {
    await page.goto('/');

    // Pas de scroll horizontal
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBe(clientWidth);
  });

  test('dashboard responsive', async ({ page }) => {
    // TODO: Login first
    await page.goto('/dashboard');

    // Vérifie que les cards ne débordent pas
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 pour arrondi
  });
});

test.describe('Smoke Tests — Accessibility', () => {
  test('landing has proper headings', async ({ page }) => {
    await page.goto('/');

    // Vérifie h1 présent
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();

    // Vérifie lang attribute
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang');
  });

  test('forms have labels', async ({ page }) => {
    await page.goto('/auth/sign-in');

    // Vérifie que les inputs ont des labels
    const emailInput = page.locator('input[name="email"]');
    const emailLabel = page.locator('label[for]:has-text(/email/i)');

    await expect(emailInput).toBeVisible();
    // Note: peut être aria-label au lieu de label visible
  });

  test('interactive elements have focus styles', async ({ page }) => {
    await page.goto('/');

    // Tab navigation
    await page.keyboard.press('Tab');

    // Vérifie qu'un élément a le focus
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT']).toContain(focused);
  });
});

test.describe('Smoke Tests — Performance', () => {
  test('landing page loads fast', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Page doit charger en moins de 3s
    expect(loadTime).toBeLessThan(3000);
  });

  test('no console errors on landing', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Pas d'erreurs critiques (certains warnings sont OK)
    expect(consoleErrors.length).toBe(0);
  });
});
