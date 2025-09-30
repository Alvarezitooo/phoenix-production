import { test, expect } from '@playwright/test';
import { login } from './utils';

const credentialsProvided = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

test.skip(!credentialsProvided, 'E2E_EMAIL et E2E_PASSWORD doivent être définis pour exécuter les tests e2e.');

test('affiche le dashboard après connexion', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: /Prêt·e à faire décoller votre carrière/i })).toBeVisible();
  await expect(page.getByText('Recommandations prioritaires')).toBeVisible();
});

test('lien quick action letters redirige vers Letters', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: /Lettre/i }).first().click();
  await page.waitForURL('**/letters**');
  await expect(page.getByRole('heading', { name: 'Letters — Cover Letter Studio' })).toBeVisible();
});
