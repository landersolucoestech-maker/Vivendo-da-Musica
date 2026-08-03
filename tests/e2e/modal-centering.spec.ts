import { expect, test, type Locator, type Page } from '@playwright/test';

const expectCentered = async (page: Page, popup: Locator) => {
  await expect(popup).toBeVisible();
  await popup.evaluate((element) => element.getAnimations().map((animation) => animation.finish()));

  const viewport = page.viewportSize();
  const box = await popup.boundingBox();
  expect(viewport).not.toBeNull();
  expect(box).not.toBeNull();
  if (!viewport || !box) return;

  const popupCenterX = box.x + box.width / 2;
  const popupCenterY = box.y + box.height / 2;
  expect(Math.abs(popupCenterX - viewport.width / 2)).toBeLessThanOrEqual(4);
  expect(Math.abs(popupCenterY - viewport.height / 2)).toBeLessThanOrEqual(4);
};

test('company opportunity editor opens as a centered popup', async ({ page }) => {
  await page.goto('/empresa/oportunidades');
  await page.getByRole('button', { name: 'Nova oportunidade' }).click();

  const dialog = page.getByRole('dialog', { name: 'Nova oportunidade' });
  await expectCentered(page, dialog);
  await expect(dialog).toContainText('As informações publicadas aparecerão na página de oportunidades');

  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
});

test('company deletion confirmation uses a centered alert popup', async ({ page }) => {
  await page.goto('/empresa/oportunidades');
  const deleteButton = page.getByRole('button', { name: 'Excluir' }).first();
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();

  const alert = page.getByRole('alertdialog', { name: 'Excluir oportunidade?' });
  await expectCentered(page, alert);
  await expect(alert).toContainText('Esta ação não pode ser desfeita');

  await alert.getByRole('button', { name: 'Cancelar' }).click();
  await expect(alert).toBeHidden();
});

test('admin course editor opens as a centered popup', async ({ page }) => {
  await page.goto('/admin/cursos');
  await page.getByRole('button', { name: 'Novo curso' }).click();

  const dialog = page.getByRole('dialog');
  await expectCentered(page, dialog);
  await expect(dialog).toContainText(/novo curso|criar curso/i);
});
