import { expect, test } from '@playwright/test';

test('course detail renders published review and active student metrics', async ({ page }) => {
  await page.goto('/academia/beatmaking-trap-funk-e-drill');

  await expect(page.getByRole('heading', { name: 'Beatmaking: Trap, Funk e Drill' })).toBeVisible();
  await expect(page.getByText('5 (1)', { exact: true })).toBeVisible();
  await expect(page.getByText('1 alunos', { exact: true })).toBeVisible();
  await expect(page.getByText('A parte de groove e 808 foi direta ao ponto e muito prática.')).toBeVisible();
  await expect(page.getByText('Aluno de Desenvolvimento')).toBeVisible();
});
