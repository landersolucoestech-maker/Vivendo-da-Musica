import { expect, test } from '@playwright/test';

test('public lesson renders configured Vimeo source as an embed', async ({ page }) => {
  await page.goto('/academia/producao-musical-do-zero-ao-profissional/aulas/boas-vindas');

  const player = page.getByTitle('Boas-vindas e visão geral');
  await expect(player).toBeVisible();
  await expect(player).toHaveAttribute('src', 'https://player.vimeo.com/video/76979871');
  await expect(page.locator('video[src*="player.vimeo.com"]')).toHaveCount(0);
});
