# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Angular 22 standalone-component frontend ("CafeteriaWeb") for a cafeteria ordering system, backed by a separate Spring Boot API (not in this repo). The base URL comes from `environment.apiUrl` (see "Environments" below), defaulting to `http://localhost:8080/api`. All UI text, route names, and identifiers are in Spanish — match that convention in new code.

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
- `infrastructure/` — **adapters**: concrete implementations of the domain ports. `http/*-http.repository.ts` implement the `*Repository` ports with `HttpClient` + `environment.apiUrl` (see "Environments" below); `storage/local-storage-sesion.adapter.ts` implements `SesionPort` with `localStorage`; `http/auth.interceptor.ts` attaches `Authorization: Bearer <token>` to every outgoing request by reading `SesionPort` directly (an infra-to-infra dependency — it never reaches into `application/`).
- `application/` — orchestration services that `features/` actually inject: `AuthService`, `MenuService`, `PedidoService`, `InternoService` (each `inject()`s its domain port and exposes the same thin `Observable`-returning API the port declares), `CarritoService` (pure in-memory cart state, no port — nothing to adapt), `rutas-rol.ts`, and `guards/` (`clienteGuard`, `personalGuard`, `adminGuard`, `supervisorGuard`) gating routes by role.
- `features/<area>/` — standalone UI components, unaware of `infrastructure/`. Areas: `auth` (login/registro), `menu`, `carrito`, `pedidos` (mis-pedidos), `interno` (staff panel + tablero/entregar/mostrador/inventario/metricas/turnos). Each page/component gets its own subfolder (`<area>/<component-name>/<component-name>.ts` + `.html`), so a section never shares a directory with its siblings — e.g. `auth/login/login.ts` and `auth/registro/registro.ts`, or `interno/tablero/tablero.ts` and `interno/entregar/entregar.ts`. A feature CSS file shared by several sibling pages (`auth/auth.css`, `interno/interno.css`) stays one level up, at the area root, referenced as `styleUrl: '../auth.css'` etc. An area with only one page (`menu/`, `carrito/`, `pedidos/`) keeps that page directly in the area root instead of adding a redundant single-child subfolder.

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

Tailwind CSS 4 is installed and wired via PostCSS (`.postcssrc.json` → `@tailwindcss/postcss`; Angular's `@angular/build:application` builder auto-detects it, no `angular.json` change needed). Existing UI is still plain per-component CSS files (not Tailwind utility classes) built on CSS custom properties defined once in [src/styles.css](src/styles.css) (`--color-bg`, `--color-text`, `--color-accent`, the `--estado-*` status-pill pairs, etc.) — always reference `var(--color-*)` in component CSS instead of hardcoding colors, so both themes and any future Tailwind utilities stay in sync.

Dark mode is a `.dark` class on `<html>`, toggled by [TemaService](src/app/application/tema.service.ts) (signal-based, no port — same "pure client state" shape as `CarritoService`, persisted to `localStorage` directly since it's a trivial UI preference, not domain data). `styles.css` defines a `:root.dark { --color-bg: ...; }` block that overrides every variable from `:root`, and `@custom-variant dark (&:where(.dark, .dark *));` makes Tailwind's `dark:` utilities follow the same `.dark` class rather than `prefers-color-scheme`. The toggle button lives in [app.html](src/app/app.html)'s header.
