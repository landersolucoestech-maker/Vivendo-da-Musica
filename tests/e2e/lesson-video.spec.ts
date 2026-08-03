import { expect, test } from '@playwright/test';

test('lesson player never embeds YouTube or Vimeo and uses private delivery', async ({ page }) => {
  await page.goto('/academia/producao-musical-do-zero-ao-profissional/aulas/boas-vindas');

  await expect(page.locator('iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="vimeo"]')).toHaveCount(0);

  const privateVideo = page.getByTestId('private-lesson-video');
  const emptyState = page.getByText('Nenhum vídeo foi enviado para esta aula.');
  await expect(privateVideo.or(emptyState)).toBeVisible();

  if (await privateVideo.count()) {
    await expect(privateVideo).toHaveAttribute('src', /\/storage\/v1\/object\/sign\/lesson-videos\//);
    await expect(privateVideo).toHaveAttribute('controlslist', /nodownload/);
  }
});
