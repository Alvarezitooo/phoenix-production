import { test, expect } from '@playwright/test';
import { login } from './utils';

const credentialsProvided = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

test.skip(!credentialsProvided, 'E2E_EMAIL et E2E_PASSWORD doivent être définis pour exécuter les tests e2e.');

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('accède au module Letters et vérifie la présence du formulaire', async ({ page }) => {
  await page.goto('/letters');
  await expect(page.getByRole('heading', { name: 'Letters — Cover Letter Studio' })).toBeVisible();
  await expect(page.getByPlaceholder('Ex : Product Marketing Manager')).toBeVisible();
});

test('accède au module Rise et affiche le configurateur', async ({ page }) => {
  await page.goto('/rise');
  await expect(page.getByRole('heading', { name: 'Rise — Interview Studio' })).toBeVisible();
  await expect(page.getByPlaceholder('Ex : Head of Product')).toBeVisible();
  await expect(page.getByRole('button', { name: /Lancer l’atelier|Lancer l'atelier/ })).toBeVisible();
});

test('génère une lettre via le flux principal', async ({ page }) => {
  await page.route('**/api/letters', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '# Lettre test\n\nBonjour équipe,\n\nCeci est une lettre générée en e2e.',
          draftId: 'draft_e2e',
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto('/letters');

  await page.getByPlaceholder('Ex : Product Marketing Manager').fill('Responsable Automatisation');
  await page.getByPlaceholder("Nom de l’entreprise").fill('NovaTech');
  await page.getByPlaceholder('Ex : Madame Dupont — VP Marketing').fill('Monsieur Leroy — CTO');
  await page
    .getByPlaceholder('Résumez vos forces, secteurs clés, preuves chiffrées.')
    .fill('15 ans de leadership produit, 3 lancements internationaux, ROI +45%.');
  await page
    .getByPlaceholder('Ex : Pilotage d’un lancement produit européen')
    .first()
    .fill('Pilotage d’un lancement SaaS pan-européen (+60% ARR).');
  await page
    .getByPlaceholder('Ex : Pilotage d’un lancement produit européen')
    .nth(1)
    .fill('Structuration d’une équipe produit de 0 à 12 personnes.');

  await page.getByRole('button', { name: 'Générer la lettre' }).click();

  await expect(page.getByText('Lettre générée et sauvegardée', { exact: false })).toBeVisible();
  await expect(page.locator('article')).toContainText('Lettre test');
});

test('génère et sauvegarde un atelier Rise', async ({ page }) => {
  await page.route('**/api/rise/context', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeSummary: 'Résumé e2e',
        letterSummary: null,
        matches: [
          {
            id: 'match-e2e',
            title: 'Lead Product Manager',
            compatibilityScore: 92,
            requiredSkills: ['Leadership', 'Analyse', 'Go-To-Market'],
          },
        ],
        sessions: [],
      }),
    });
  });

  await page.route('**/api/rise/questions', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'rise_session_e2e',
          questions: [
            {
              question: 'Décrivez une décision critique récente.',
              competency: 'Leadership',
              guidance: 'Structurez votre réponse avec la méthode STAR.',
            },
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/rise/sessions/*', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto('/rise');

  await page.getByPlaceholder('Ex : Head of Product').fill('Directeur Produit IA');
  await page.getByRole('button', { name: 'Stratégique' }).click();
  await page.getByRole('button', { name: /Lancer l’atelier|Lancer l'atelier/ }).click();

  await expect(page.getByText('Atelier généré', { exact: false })).toBeVisible();
  await expect(page.getByText('Décrivez une décision critique récente.')).toBeVisible();

  await page.getByPlaceholder('Votre réponse ou plan de réponse').fill('Réponse préparée pour l’atelier.');
  await page.getByRole('button', { name: 'Sauvegarder les notes' }).click();

  await expect(page.getByText('Notes sauvegardées', { exact: false })).toBeVisible();
});
