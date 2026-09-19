import { test, expect } from '@playwright/test';

test('muestra la página principal de La aravica', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /El ritual de la calma/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Explorar el men/ })).toBeVisible();
});
