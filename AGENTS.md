# AGENTS.md — AviTech Investment Intelligence

Plataforma SaaS de inteligencia económica, financiera y de oportunidades de negocio.
Mercado inicial: República Dominicana. Expansión: internacional.

## Lectura obligatoria antes de actuar

1. `docs/prompts/PROMPT-MAESTRO.md` — requisitos, reglas y fases.
2. `docs/CONTRATO-TRABAJO.md` — reparto entre las 2 ventanas y protocolo.
3. `docs/sprint-0/AUDITORIA-ENTORNO.md` — estado real del entorno.
4. `docs/requisitos/` — SRS y Plan Maestro (si existen; si no, no inventar).
5. `docs/sprint-1/PLAN-SPRINT-1.md` — alcance, criterios y evidencia del Sprint 1.

## Estado actual: Sprint 1 — habilitadores técnicos

Sprint 0 cerrado y G0 aprobado (2026-11-15). Sprint 1 autorizado para CI, pruebas, gitleaks y estructura de migraciones. **B-016…B-019 resueltos el 2026-11-15 (B-017 sujeto a abogado); el SQL sigue sin ejecutar.** **No hay proyecto Supabase todavía (B-003): no ejecutar SQL, no crear tablas y no afirmar RLS probado.** El código de producto del corte vertical espera Supabase. Evidencia en `docs/sprint-1/PLAN-SPRINT-1.md`.

## Reglas no negociables

1. No inventar resultados de pruebas ni afirmar integraciones sin verificar.
2. No inventar requisitos, cifras, fuentes ni datos. Todo vacío se marca `[PENDIENTE]`.
3. No borrar funcionalidades ni archivos sin autorización.
4. No instalar dependencias sin justificación y aprobación.
5. No guardar secretos en el repo. Usar `.env.local` (ignorado por git).
6. Mantener el proyecto ejecutable al final de cada iteración.
7. Pedir confirmación antes de acciones destructivas o cambios de alcance.
8. Si falta una credencial o servicio, reportar el bloqueo y continuar con lo independiente.
9. Distinguir siempre: dato confirmado, análisis generado por IA, inferencia comercial.
10. Español para documentación; inglés para código, tablas y esquemas JSON.

## Reparto de ventanas

| Ventana | Responsabilidad | Carpetas |
|---|---|---|
| A | Arquitectura, datos, fuentes, IA, seguridad | `docs/arquitectura`, `docs/datos`, `docs/fuentes`, `docs/ia`, `docs/seguridad`, ADRs técnicos |
| B | Producto, requisitos, UX, QA | `docs/producto`, `docs/ux`, `docs/qa`, ADRs de producto |

Ninguna ventana edita archivos de la otra. Los conflictos los resuelve el usuario.

## Stack

- Next.js 16.4.6 (App Router) + TypeScript + Tailwind CSS 4
- Supabase (PostgreSQL, Auth, Storage, RLS)
- Python 3.12 para pipelines ETL/ELT
- Vitest + Testing Library + Playwright + axe para pruebas
- Sin microservicios en el MVP: monolito modular + workers asíncronos

## Comandos

```powershell
npm run dev           # desarrollo
npm run build         # build de producción
npm run lint          # ESLint 9 (eslint.config.mjs)
npm run typecheck     # next typegen + tsc --noEmit
npm test              # Vitest (unitarias)
npm run test:coverage # Vitest + cobertura v8
npm run test:e2e      # Playwright + axe (requiere Chromium)
npm run secret:scan   # gitleaks local
npm run audit         # npm audit --audit-level=high
npm run verify        # lint + tipos + coverage + build
```

Playwright instala el navegador una vez: `npx playwright install chromium`. gitleaks se resuelve desde `C:\Users\User\.portal-tools\gitleaks\gitleaks.exe` o el `PATH`.

### Instalar dependencias (importante)

El proyecto vive en OneDrive y `node_modules` es un junction a `C:\Users\User\.portal-deps`. `npm install` normal **rompe** el junction y mete 400 MB en OneDrive.

Usar siempre:

```powershell
powershell -ExecutionPolicy Bypass -File tools\npm-install.ps1 -Packages paquete1,paquete2 -Dev
```

Sin `-Packages` reinstala lo existente.

## Next.js 16 — leer antes de codificar

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
