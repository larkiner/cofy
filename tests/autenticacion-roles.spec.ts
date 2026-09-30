import { expect, test } from '@playwright/test';

/**
 * Credenciales únicamente desde el entorno: nunca se guardan en Git.
 *
 * PowerShell:
 *   $env:E2E_ADMIN_EMAIL='...'; $env:E2E_ADMIN_PASSWORD='...'; npm.cmd run test:e2e -- --project=chromium
 *   $env:E2E_CLIENTE_EMAIL='...'; $env:E2E_CLIENTE_PASSWORD='...'; npm.cmd run test:e2e -- --project=chromium
 */
const admin = {
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
};
const cliente = {
  email: process.env.E2E_CLIENTE_EMAIL,
  password: process.env.E2E_CLIENTE_PASSWORD,
};

test.describe('autenticación y permisos', () => {
  test.skip(!admin.email || !admin.password, 'Faltan E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD');

  test('el administrador entra al panel e inventario', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(admin.email!);
    await page.getByLabel(/Contrase/).fill(admin.password!);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/interno/);
    await expect(page.getByRole('link', { name: 'Inventario' })).toBeVisible();
    await page.getByRole('link', { name: 'Inventario' }).click();
    await expect(page.getByRole('heading', { name: 'Inventario' })).toBeVisible();
  });
});

test.describe('portal de cliente', () => {
  test.skip(!cliente.email || !cliente.password, 'Faltan E2E_CLIENTE_EMAIL y E2E_CLIENTE_PASSWORD');

  test('el cliente inicia sesión y solo ve sus opciones', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(cliente.email!);
    await page.getByLabel(/Contrase/).fill(cliente.password!);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Mis pedidos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Panel interno' })).toHaveCount(0);
  });
});
