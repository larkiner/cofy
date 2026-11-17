# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Angular 22 standalone-component frontend ("CafeteriaWeb") for a cafeteria ordering system, backed by a separate Spring Boot API (not in this repo). The base URL comes from `environment.apiUrl` (see "Environments" below), defaulting to `http://localhost:8080/api`. All UI text, route names, and identifiers are in Spanish — match that convention in new code.

## Branch workflow (two branches)

Two long-lived branches only (Git Flow was dropped on 2026-10-12: a single developer): **`maestro`** = production (deployed by Vercel), **`dev`** = day-to-day development. There is no `qa` and no `release/*`/`hotfix/*` flow.

- Work happens on `dev`. For something larger or risky, use a short-lived `feature/<descripcion-en-espanol>` branch from `dev` and merge it back into `dev`; delete it afterwards (local and remote).
- To release: merge `dev` into `maestro` (fast-forward when possible) and push. Tag notable releases with an annotated `v<x.y.z>` tag. Push tags by name, never `--tags` (there are local-only archive tags).
- Urgent fix to production: commit it on `dev` (or a branch from `maestro`), merge into `maestro`, and make sure `dev` ends up containing it too.
- Never commit or push without the owner's approval. No `claude/*` or `agents/*` branches and no git worktree per task.
- After pushing `maestro`, confirm Vercel built a **Production** deployment, not a Preview (see `documentación/05-infraestructura-despliegue.md`, P4, in the parent workspace).

## Running the app

**Do not run the app (`ng serve` / `npm start`) after making changes — the user runs it manually.** To verify a change, use `ng build` (or the typecheck) instead of starting the dev server. The dev server always runs on **port 4200** (fixed via `serve.options.port` in [angular.json](angular.json)); do not use a different or auto-assigned port.

## Commands

```bash
ng serve            # dev server at http://localhost:4200, auto-reload
ng build             # production build to dist/
ng test              # unit tests via Vitest (@angular/build:unit-test)
ng generate component <name>   # scaffold a new component
```

There is no lint script configured. Formatting is via Prettier (`.prettierrc`: 100 print width, single quotes, Angular parser for `.html`).

To run a single test file with Vitest directly: `npx vitest run path/to/file.spec.ts`.

## Environments

`src/environments/environment.ts` (used by the default `production` build config) and `environment.development.ts` (swapped in for `ng serve` / `ng build --configuration development` via `fileReplacements` in [angular.json](angular.json)) each export an `environment.apiUrl`. This is the **only** place the backend URL is defined — HTTP adapters import `environment` directly and read `environment.apiUrl`; don't hardcode `http://localhost:8080` or reintroduce a separate `API_URL` constant elsewhere.

## Architecture

The app follows a **hexagonal (ports & adapters)** layering under `src/app/`:

- `domain/<context>/` — framework/infrastructure-free code: TypeScript model interfaces (`*.model.ts`, mirroring backend JSON) and **ports** — abstract classes that declare what the domain needs (e.g. [MenuRepository](src/app/domain/menu/menu.repository.ts), [SesionPort](src/app/domain/auth/sesion.port.ts)). Contexts: `auth`, `menu`, `carrito`, `pedidos`, `interno`.
- `infrastructure/` — **adapters**: concrete implementations of the domain ports. `http/*-http.repository.ts` implement the `*Repository` ports with `HttpClient` + `environment.apiUrl` (see "Environments" below); `storage/local-storage-sesion.adapter.ts` implements `SesionPort` with `localStorage`; `http/auth.interceptor.ts` attaches `Authorization: Bearer <token>` only to requests to `environment.apiUrl` (never other hosts; an explicit `Authorization` is respected), reading `SesionPort`; it drops an expired token (JWT `exp`, `domain/auth/jwt.ts`) and, on a 401 to a request that carried the current session token (except `/auth/login|registro|password|logout`), calls `AuthService.expirarSesion()` (clears the local session and goes to `/login?sesion=expirada`) — the one deliberate infra-to-application dependency, resolved with `inject()` at request time to avoid a cycle with `HttpClient`.
- `application/` — orchestration services that `features/` actually inject: `AuthService`, `MenuService`, `PedidoService`, `InternoService` (each `inject()`s its domain port and exposes the same thin `Observable`-returning API the port declares), `CarritoService` (pure in-memory cart state, no port — nothing to adapt), `rutas-rol.ts`, and `guards/` (`clienteGuard`, `personalGuard`, `adminGuard`, `supervisorGuard`) gating routes by role.
- `features/<area>/` — standalone UI components, unaware of `infrastructure/`. Areas: `auth` (login/registro), `menu`, `carrito`, `pedidos` (mis-pedidos), `interno` (staff panel + tablero/entregar/mostrador/inventario/metricas/turnos). Each page/component gets its own subfolder (`<area>/<component-name>/<component-name>.ts` + `.html`), so a section never shares a directory with its siblings — e.g. `auth/login/login.ts` and `auth/registro/registro.ts`, or `interno/tablero/tablero.ts` and `interno/entregar/entregar.ts`. A feature CSS file shared by several sibling pages (`auth/auth.css`; el panel interno usa clases con ámbito `.pi` en `src/styles.css`) stays one level up, at the area root, referenced as `styleUrl: '../auth.css'` etc. An area with only one page (`menu/`, `carrito/`, `pedidos/`) keeps that page directly in the area root instead of adding a redundant single-child subfolder.

**Wiring**: ports are bound to their adapters explicitly in [app.config.ts](src/app/app.config.ts) providers (`{ provide: MenuRepository, useClass: MenuHttpRepository }`, etc.) rather than via `providedIn: 'root'` on the adapter — that's what makes the port/adapter seam swappable. When adding a new backend-facing feature: define the model + abstract `*Repository` port in `domain/<context>/`, implement it as `infrastructure/http/<context>-http.repository.ts`, add the DI binding in `app.config.ts`, then add a thin `application/<context>.service.ts` that injects the port for `features/` to consume.

### Auth & role model

Five roles come back from the backend JWT: `CLIENTE`, `BARISTA`, `CAJERO`, `SUPERVISOR`, `ADMIN`. [AuthService](src/app/application/auth.service.ts) orchestrates `AuthRepository` (login/registro over HTTP) and `SesionPort` (token/email/rol persistence), exposing them as signals (`email`, `rol`, `logueado`, `esCliente`, `esPersonal`, `esAdmin`).

Route guards in `src/app/application/guards/*.guard.ts` gate access by role:
- `clienteGuard` — only `CLIENTE`
- `personalGuard` — any staff role (`BARISTA`/`CAJERO`/`SUPERVISOR`/`ADMIN`)
- `adminGuard` — only `ADMIN`
- `supervisorGuard` — `SUPERVISOR` or `ADMIN`

[rutaSegunRol](src/app/application/rutas-rol.ts) decides post-login redirect: clients go to `/`, staff go to `/interno`.

### Routing structure

Defined in [src/app/app.routes.ts](src/app/app.routes.ts), all lazy-loaded via `loadComponent`. `/interno` is a parent route (`PanelInterno`) guarded by `personalGuard`, with child routes for each staff feature (`tablero` default, `entregar`, `mostrador`, `turnos` open to all staff; `inventario` further gated by `adminGuard`, `metricas` by `supervisorGuard`). `PanelInterno` itself reads the role to decide which sub-nav links to show.

### State pattern

State lives in `application/` services as `signal`/`computed`, not RxJS subjects — components `inject()` the service and read signals directly in templates. Repository ports return `Observable` (thin methods, no extra state wrapping) and are consumed with `.subscribe()` in components. New client-only state should follow `CarritoService`'s shape: signals only, no port needed unless it talks to the backend.

### Styling & theming

Tailwind CSS 4 is installed and wired via PostCSS (`.postcssrc.json` → `@tailwindcss/postcss`; Angular's `@angular/build:application` builder auto-detects it, no `angular.json` change needed). **Since 2026-11-17 Tailwind utility classes are how styles are written:** components have no stylesheet of their own (`src/styles.css` is the only `.css` file); styles go as utilities in the template and `:host` rules as `host: { class: '…' }` in the `@Component`. There is no Sass. The design tokens live in `@theme static` in `styles.css` with their original names, so the palette is used as `bg-bg`, `text-text`, `text-muted`, `bg-accent`, `border-border`, `bg-card`, `rounded-pill`, `shadow-card`, `font-display`… Tailwind's default colors, radii, shadows and breakpoints are **removed** (`bg-red-500`, `shadow-lg`, `rounded-xl`, `md:` do not compile): use only the project tokens. Custom breakpoints: `movil` 621, `angosto` 720, `medio` 821, `tablet` 900, `ancho` 960 px (`tablet:` = ≥ 900 px, `max-tablet:` = < 900 px). `hover:` is redefined as plain `:hover` (`@custom-variant hover`). Keyframes live in `@theme` as `--animate-*`. Layers: base styles in `@layer base`; shared primitives, the `.pi` scope and the few pieces unreadable as utilities (`.esqueleto-bloque`, `.esqueleto-tarjeta`, `.tiquete`) in `@layer components` — remember that any unlayered CSS beats every utility. The full set of conventions (`color-mix(in oklch,…)` as an arbitrary value, never `bg-accent/14`; fixed px as `[Npx]`; `aria-[current=…]:` for active states; class names kept as unstyled markers because tests use them; `@let` for repeated class strings) is in `documentación/planes/2026-11-17-plan-migracion-tailwind.md` §2.1 — read it before styling anything. Prettier sorts classes with `prettier-plugin-tailwindcss`. Since 2026-10-15 the shared controls and surfaces (`.boton`, `.campo`, `.superficie`, `.estado-pill`, `.mensaje-ok/.mensaje-error`, `.estado-msj`, `.vacio`, `.cabecera-pagina`, `.cifras`) are **global in `styles.css`**, together with spacing/typography/control tokens (`--esp-*`, `--titulo-*`, `--alto-control`, `--forma-boton`…): new components use them instead of redefining buttons or fields. The `.pi` scope only adjusts density for the internal panel (36 px controls, 44 px on touch) and its own pieces. Do not globalize `.tarjeta` or `.encabezado` (name clashes). Readable labels for states, roles and payment methods live in `shared/util/etiquetas.ts`; use the shared `app-codigo-retiro`, `app-seguimiento-pedido`, `app-estado-vacio`, `app-tarjeta-pedido` and `app-imagen-producto` components. Never hardcode a color: use the token utilities, or `var(--color-*)` / `var(--estado-*)` inside an arbitrary value, so both themes stay in sync (the `--estado-*` status-pill pairs are plain variables, not theme colors). Shadows go through `--sombra-card*` (the theme's `--shadow-card` points to it) so `shadow-card` follows dark mode.

Dark mode is a `.dark` class on `<html>`, toggled by [TemaService](src/app/application/tema.service.ts) (signal-based, no port — same "pure client state" shape as `CarritoService`, persisted to `localStorage` directly since it's a trivial UI preference, not domain data). `styles.css` defines a `:root.dark { --color-bg: ...; }` block that overrides every theme/`:root` variable (it is unlayered so it beats `@theme`), which is why the token utilities switch theme without any `dark:` prefix, and `@custom-variant dark (&:where(.dark, .dark *));` makes Tailwind's `dark:` utilities follow the same `.dark` class rather than `prefers-color-scheme`. The toggle button lives in [app.html](src/app/app.html)'s header.
