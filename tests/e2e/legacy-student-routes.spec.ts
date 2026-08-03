import { expect, test } from '@playwright/test';

test('legacy student beats route redirects to the student downloads area', async ({ page }) => {
  await page.goto('/aluno/beats');

  await expect(page).toHaveURL(/\/aluno\/downloads$/);
  await expect(page.getByRole('heading', { name: 'Downloads' })).toBeVisible();
  await expect(page.getByText('Acesse arquivos protegidos, contratos e materiais vinculados às suas compras.')).toBeVisible();
});
