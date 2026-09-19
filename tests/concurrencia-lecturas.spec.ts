import { expect, test } from '@playwright/test';

// Declare process for TypeScript when node types are not available in tsconfig
declare const process: any;

const apiUrl = process.env['E2E_API_URL'] ?? 'http://localhost:8080/api';
const clienteEmail = process.env['E2E_CLIENTE_EMAIL'];
const clientePassword = process.env['E2E_CLIENTE_PASSWORD'];

/**
 * Sonda controlada para comprobar que el pool y las rutas más consultadas
 * soportan ráfagas. No crea pedidos ni modifica inventario.
 *
 * Ejemplo:
 *   $env:E2E_CONCURRENCIA='1'; $env:E2E_CLIENTE_EMAIL='...';
 *   $env:E2E_CLIENTE_PASSWORD='...'; npm.cmd run test:e2e -- --project=chromium concurrencia-lecturas.spec.ts
 */
test.describe('concurrencia de lectura', () => {
  test.skip(
    process.env.E2E_CONCURRENCIA !== '1' || !clienteEmail || !clientePassword,
    'Requiere E2E_CONCURRENCIA=1 y credenciales de cliente',
  );

  test('atiende una ráfaga de menú y pedidos autenticados sin errores 5xx', async ({ request }) => {
    const login = await request.post(`${apiUrl}/auth/login`, {
      data: { email: clienteEmail, password: clientePassword },
    });
    expect(login.ok()).toBeTruthy();
    const { token } = await login.json();

    const respuestas = await Promise.all([
      ...Array.from({ length: 40 }, () => request.get(`${apiUrl}/menu`)),
      ...Array.from({ length: 20 }, () =>
        request.get(`${apiUrl}/pedidos`, { headers: { Authorization: `Bearer ${token}` } })),
    ]);

    for (const respuesta of respuestas) {
      expect(respuesta.status()).toBe(200);
    }
  });
});
