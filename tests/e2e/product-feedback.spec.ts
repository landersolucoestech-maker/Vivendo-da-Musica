import { expect, test } from '@playwright/test';

test('product detail renders published reviews and answered questions', async ({ page }) => {
  await page.goto('/marketplace/pack-transicoes-e-efeitos');

  await expect(page.getByText('Os arquivos vieram organizados e encaixaram bem em vídeos verticais.')).toBeVisible();
  await expect(page.getByText('A variedade de transições resolveu várias partes do meu lançamento.')).toBeVisible();
  await expect(page.getByText('Os arquivos funcionam em qualquer editor de vídeo?')).toBeVisible();
  await expect(page.getByText('Sim. O pacote inclui arquivos exportados em formatos comuns e uma pasta com orientações de uso.')).toBeVisible();
  await expect(page.getByText('Ainda sem avaliações')).not.toBeVisible();
  await expect(page.getByText('Nenhuma pergunta ainda')).not.toBeVisible();
});
