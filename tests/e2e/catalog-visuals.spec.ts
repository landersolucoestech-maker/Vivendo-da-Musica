import { expect, test } from '@playwright/test';

test('marketplace cards render stored product covers', async ({ page }) => {
  await page.goto('/marketplace');

  const cover = page.locator('img[alt^="Capa de "]').first();
  await expect(cover).toBeVisible();
  await expect.poll(async () => cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
});

test('product detail renders the stored cover instead of a simulated gallery', async ({ page }) => {
  await page.goto('/marketplace/pack-transicoes-e-efeitos');

  const cover = page.getByRole('img', { name: 'Capa de Pack Transições e Efeitos' });
  await expect(cover).toBeVisible();
  await expect.poll(async () => cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
});
