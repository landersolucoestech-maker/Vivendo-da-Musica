import { expect, test } from '@playwright/test';

test('digital product proceeds from detail to confirmed checkout', async ({ page }) => {
  let checkoutPayload: unknown;

  await page.route('**/functions/v1/create-digital-product-checkout', async (route) => {
    checkoutPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checkoutUrl: 'http://127.0.0.1:4173/pagamento-sucesso?pedido=11111111-1111-4111-8111-111111111111&tipo=produto',
        orderId: '11111111-1111-4111-8111-111111111111',
      }),
    });
  });

  await page.goto('/marketplace/pack-transicoes-e-efeitos');
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
  await page.getByRole('link', { name: 'Carrinho' }).click();

  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible();
  await expect(page.getByText('Pack de Transições e Efeitos')).toBeVisible();
  await page.getByRole('button', { name: 'Ir para o checkout' }).click();

  await expect(page.getByRole('heading', { name: 'Finalizar compra' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();

  await expect(page).toHaveURL(/\/pagamento-sucesso\?pedido=.*&tipo=produto$/);
  await expect(page.getByRole('heading', { name: 'Pagamento recebido.' })).toBeVisible();
  expect(checkoutPayload).toMatchObject({
    productIds: ['db100000-0000-4000-8000-000000000010'],
  });
});
