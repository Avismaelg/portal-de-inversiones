# Plan de Sprint 1 — Habilitadores técnicos

| Campo | Valor |
|---|---|
| Documento | `docs/sprint-1/PLAN-SPRINT-1.md` |
| Versión | 0.1.0 |
| Fecha | 2026-11-15 |
| Autor | Orquestador |
| Estado | **HABILITADORES COMPLETADOS EN LOCAL** — CI remoto pendiente |
| Base | `G0-ACTA.md` (aprobado 2026-11-15) |

## 1. Objetivo

Dejar el repositorio listo para construir el corte vertical **DGCP + Crédito Público** en cuanto exista el proyecto Supabase: CI que bloquee regresiones, pruebas unitarias y E2E, escaneo de secretos, dependencias vigiladas y estructura de migraciones.

## 2. Alcance

**Dentro:**

- CI en GitHub Actions: lint, tipos, unitarias, coverage, build, Playwright y gitleaks.
- Vitest + Testing Library + jsdom.
- Playwright + axe-core (Chromium).
- Dependabot para npm y GitHub Actions.
- Estructura `supabase/migrations/` y su convención.
- `npm audit` como puerta de seguridad.
- Documentación de herramientas pendientes (k6, ZAP, Lighthouse).

**Fuera:**

- Código de producto (pantallas, rutas, componentes de negocio).
- Ejecutar SQL o crear tablas.
- Conectores, ingesta, IA y prompts.
- Supabase CLI, Docker y psql (B-006).
- Decisiones B-016…B-019.

## 3. Tareas

| ID | Tarea | Estado | Evidencia |
|---|---|---|---|
| S1-T01 | Instalar Vitest, Testing Library, Playwright y axe | HECHO | `package.json` |
| S1-T02 | Configurar Vitest (jsdom, alias `@/`, coverage) | HECHO | `vitest.config.mts` |
| S1-T03 | Prueba unitaria de humo de la página | HECHO | `src/__tests__/page.test.tsx` |
| S1-T04 | Configurar Playwright (Chromium, webServer) | HECHO | `playwright.config.ts` |
| S1-T05 | E2E de humo + axe (sin violaciones críticas) | HECHO | `e2e/home.spec.ts` |
| S1-T06 | CI de calidad, E2E, gitleaks y audit | HECHO | `.github/workflows/ci.yml`; ejecución remota pendiente |
| S1-T07 | Dependabot (npm + actions) | HECHO | `.github/dependabot.yml`; ejecución remota pendiente |
| S1-T08 | Estructura de migraciones y convención | HECHO | `supabase/migrations/README.md` |
| S1-T09 | Verificar lint, tipos, unitarias, build y E2E en local | HECHO | Ver §5 |
| S1-T10 | Instalar navegador Chromium de Playwright | HECHO | Chromium 159 / Playwright 1.65.1 |
| S1-T11 | Escaneo local de secretos con gitleaks | HECHO | 8.30.1; 5 commits; 0 fugas |

## 4. Criterios de salida

El Sprint 1 técnico se considera cerrado cuando:

1. `npm run lint` pasa sin errores.
2. `npm run typecheck` pasa sin errores.
3. `npm test` pasa con al menos una prueba.
4. `npm run build` genera la aplicación de producción.
5. `npm run test:e2e` pasa en Chromium.
6. `npm audit --audit-level=high` no reporta vulnerabilidades altas ni críticas.
7. gitleaks no encuentra secretos en el historial.
8. El árbol de trabajo queda commiteado.

**Estado al 2026-11-15:** criterios 1–7 verificados en local; criterio 8 completado con el commit `afed0e0`. La ejecución del workflow en GitHub queda pendiente de que exista un remoto; no se declara CI verde.

## 5. Evidencia de ejecución

| Comando | Resultado | Fecha |
|---|---|---|
| `npm run lint` | OK — 0 errores, 0 advertencias | 2026-11-15 |
| `npm run typecheck` | OK — `next typegen` + `tsc --noEmit` | 2026-11-15 |
| `npm test` | OK — 1 archivo, 1 prueba | 2026-11-15 |
| `npm run test:coverage` | OK — 100% sobre 1 archivo | 2026-11-15 |
| `npm run build` | OK — Next.js 16.4.6; `/` estática | 2026-11-15 |
| `npm run test:e2e` | OK — 1 prueba Chromium; axe sin violaciones críticas | 2026-11-15 |
| `npm run audit` | OK — 0 altas/críticas; 7 moderadas de desarrollo | 2026-11-15 |
| gitleaks 8.30.1 | OK — 5 commits, 1.09 MB, 0 fugas | 2026-11-15 |
| `npm run verify` | OK — lint + tipos + coverage + build; 0 advertencias | 2026-11-15 |

### 5.1 Limitaciones conocidas

- **CI no ejecutado en GitHub:** el repositorio todavía no tiene remoto. El workflow existe y los comandos equivalentes pasaron en local; **no** se afirma que el CI esté verde.
- **7 vulnerabilidades moderadas:** `minimatch@10.2.6` dentro de `@typescript-eslint/typescript-estree@8.72.2`, arrastrado por `eslint-config-next@16.4.6`. La última 10.x sigue afectada; la corrección está en `minimatch@11` (major) y requeriría `npm audit fix --force`. No se aplica: es tooling de lint, no código de producción. El gate de CI es severidad alta/crítica.
- **Cobertura:** 100% sobre un único archivo. No es una métrica de calidad todavía; se elevará cuando exista lógica de producto.
- **E2E:** prueba la página inicial de Next.js. Se reemplazará por flujos reales del corte vertical.
- **gitleaks local:** binario portátil en `C:\Users\User\.portal-tools\gitleaks\gitleaks.exe`; no está en el `PATH` global. `npm run secret:scan` lo resuelve.

## 6. Bloqueos que no detienen este sprint

| Bloqueo | Efecto |
|---|---|
| B-003 — Supabase no disponible | No se ejecuta SQL, RLS ni pruebas P0 |
| B-006 — sin CLI/Docker/psql | No hay Postgres local |
| B-011 — sin proveedor LLM | No hay agentes ni evals |
| B-013 — equipo sin nombres | No hay velocidad real |
| B-015 — sin anotadores | No hay golden sets |
| B-016…B-019 | No se cierran migraciones definitivas |

## 7. Siguiente incremento

1. Resolver B-016…B-019: publicación, seudonimización, columnas staff-only y `superseded`.
2. Crear el proyecto Supabase nuevo y exclusivo; añadir `.env.local`.
3. Partir `schema-propuesto.sql` en `0001_init`…`0004_views`.
4. Ejecutar en rama y correr la suite RLS/P0.
5. Conectar una única fuente: DGCP, tras `T-SRC-01`.
6. Primer vertical slice con datos reales y revisión humana.
