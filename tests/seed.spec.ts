import { test, expect, Page } from '@playwright/test';

// Evita error de tipo TS: "process" no está definido cuando no se incluyen
// las definiciones de tipo de Node. Declaramos la forma mínima que usamos.
declare const process: { env: { [key: string]: string | undefined } };


/**
 * Seed: registra usuarios reales a través del formulario de /registro
 * (no golpea el backend directo).
 *
 * Corre secuencial en un solo worker: el backend aplica rate limiting a
 * /auth/registro (HTTP 429 "Demasiadas solicitudes...") que se dispara casi
 * de inmediato si se paraleliza en varios workers/lotes, así que en vez de
 * eso cada registro espera un poco y reintenta con backoff si lo bloquean.
 *
 * Requiere que el backend Spring Boot esté corriendo en localhost:8080
 * (environment.apiUrl). El dev server de Angular lo levanta Playwright solo
 * (ver webServer en playwright.config.ts).
 *
 * No corre con `npx playwright test` (ni en CI): tarda hasta 60 min y crea
 * 1000 cuentas reales, así que se omite salvo que se pida explícitamente con
 * la variable de entorno SEED_USUARIOS=1, por ejemplo:
 *   PowerShell:  $env:SEED_USUARIOS=1; npx playwright test tests/seed.spec.ts --project=chromium
 *   cmd.exe:     set SEED_USUARIOS=1 && npx playwright test tests/seed.spec.ts --project=chromium
 *   bash:        SEED_USUARIOS=1 npx playwright test tests/seed.spec.ts --project=chromium
 */
const TOTAL_USUARIOS = 1000;
const PAUSA_ENTRE_REGISTROS_MS = 1200;
const REINTENTOS_MAX = 5;
const SUFIJO_CORRIDA = Date.now();

async function registrarConReintentos(page: Page, nombre: string, email: string): Promise<void> {
  await page.goto('/registro');
  await page.getByLabel('Nombre').fill(nombre);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill('Passw0rd!123');

  for (let intento = 1; intento <= REINTENTOS_MAX; intento++) {
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    try {
      await expect(page).toHaveURL('/', { timeout: 5_000 });
      return; // éxito
    } catch {
      if (intento === REINTENTOS_MAX) throw new Error(`No se pudo registrar ${email} tras ${REINTENTOS_MAX} intentos`);
      // Probablemente 429 (rate limit) u otro error transitorio: esperar con
      // backoff y reintentar el mismo envío (los campos siguen llenos).
      await page.waitForTimeout(2000 * intento);
    }
  }
}

test.describe('Seed: registro masivo de usuarios', () => {
  // Un solo navegador alcanza para sembrar datos; correrlo en los 3
  // (chromium/firefox/webkit) triplicaría la cantidad de usuarios creados.
  test.skip(({ browserName }) => browserName !== 'chromium', 'Seed solo corre en chromium');

  // Nunca por defecto en `npx playwright test`/CI: ver comentario arriba.
  test.skip(process.env.SEED_USUARIOS !== '1', 'Define SEED_USUARIOS=1 para ejecutar el seed');
  
  test('registra 1000 usuarios a través del formulario de registro', async ({ page }) => {
    test.setTimeout(60 * 60 * 1000);

    let exitosos = 0;
    const fallidos: string[] = [];

    for (let i = 1; i <= TOTAL_USUARIOS; i++) {
      const email = `seed.${SUFIJO_CORRIDA}.${i}@example.com`;
      try {
        await registrarConReintentos(page, `Usuario Seed ${i}`, email);
        exitosos++;
      } catch (e) {
        fallidos.push(email);
        console.error(String(e));
      }

      if (i % 50 === 0) {
        console.log(`Progreso: ${i}/${TOTAL_USUARIOS} (${exitosos} ok, ${fallidos.length} fallidos)`);
      }

      await page.waitForTimeout(PAUSA_ENTRE_REGISTROS_MS);
    }

    expect(fallidos, `Fallaron ${fallidos.length}/${TOTAL_USUARIOS}: ${fallidos.join(', ')}`).toEqual([]);
  });
});
