import { expect, test } from '@playwright/test';

test('unknown routes return the application not-found screen', async ({ page }) => {
  await page.goto('/rota-que-nao-existe');

  await expect(page.getByRole('heading', { name: 'Página não encontrada.' })).toBeVisible();
  await expect(page.getByText('/rota-que-nao-existe')).toBeVisible();
});
