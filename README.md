# AviTech Investment Intelligence

Plataforma SaaS de inteligencia económica, financiera y de oportunidades de negocio para República Dominicana, con expansión internacional.

> **Estado (2026-11-18):** aplicación funcional en desarrollo local sobre Supabase `xzlwrlgjsdymcidlmqew` (26 migraciones aplicadas, RLS activa). Hay código de producto: autenticación, instrumentos con revisión y publicación, licitaciones DGCP (carga manual asistida), noticias de fuentes primarias, radar, alertas in-app, watchlist, datos macro del BCRD, análisis de impacto con Claude y una v1 del agente de extracción de noticias (candidato para revisión, no publica). Los análisis con IA requieren `AI_API_KEY` y **no se han ejecutado contra la API real**. **No está listo para producción:** fuentes sin revisión legal (B-009/B-017), E2E sin sesión real y sin entorno de pruebas separado, sin despliegue. Sprint de estabilización en curso: `docs/estabilizacion/INFORME-ESTABILIZACION.md`.

- **Organización:** AviTech Solutions Group
- **Versión:** 0.1.0
- **Repo:** `C:\Users\User\OneDrive\Escritorio\portal de inversiones`

---

## Empezar

Requiere Node 24 (ver `.nvmrc`) y npm 11.

```powershell
npm run dev      # http://localhost:3000
```

Para instalar dependencias, **no uses `npm install` directo**:

```powershell
powershell -ExecutionPolicy Bypass -File tools\npm-install.ps1 -Packages paquete1,paquete2 -Dev
```

Motivo: el proyecto está en OneDrive y `node_modules` es un junction a `C:\Users\User\.portal-deps`. Un `npm install` normal borra el junction y sincroniza cientos de MB a la nube.

---

## Calidad

| Comando | Qué hace |
|---|---|
| `npm run lint` | ESLint 9 |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test` | Vitest (unitarias) |
| `npm run test:coverage` | Vitest + cobertura v8 |
| `npm run build` | Build de producción |
| `npm run test:e2e` | Playwright + axe (Chromium) |
| `npm run secret:scan` | gitleaks sobre el historial |
| `npm run audit` | Puerta de dependencias: producción bloquea; desarrollo con excepciones documentadas (`docs/seguridad/RIESGOS-DEPENDENCIAS.md`) |
| `npm run verify` | lint + tipos + coverage + build |

Playwright necesita el navegador instalado una vez:

```powershell
npx playwright install chromium
npm run test:e2e
```

El navegador se guarda fuera de OneDrive, en `%LOCALAPPDATA%\ms-playwright`.

gitleaks se resuelve desde `C:\Users\User\.portal-tools\gitleaks\gitleaks.exe` o desde el `PATH`. El CI también ejecuta el escaneo.

Evidencia de la última ejecución: `docs/estabilizacion/INFORME-ESTABILIZACION.md`. No se declara una prueba como pasada sin salida verificable.

---

## Estado y alcance

- **Sprint 0:** cerrado. G0 aprobado con recortes y condiciones (`docs/sprint-0/G0-ACTA.md`).
- **Sprint 1 técnico:** CI, Vitest, Playwright, axe, gitleaks, Dependabot y estructura de migraciones (`docs/sprint-1/PLAN-SPRINT-1.md`).
- **Bloqueado o pendiente:** abogado y licencias de fuentes (B-009/B-017), clave y presupuesto del proveedor LLM (B-011: Anthropic elegido, falta `AI_API_KEY` y tope mensual), SRS y Plan Maestro ausentes del repo (B-001/B-002), equipo y dedicación (B-013), entorno Supabase de pruebas separado (nuevo). Supabase (B-003) disponible desde 2026-11-15. Detalle en `docs/sprint-0/BLOQUEOS.md`.
- **Fuera del MVP:** comparador, calculadora V-05, vistas guardadas, capa `Cálculo`, CSV, alertas por email, facturación y multi-tenant.

---

## Cómo trabajan las 2 ventanas de Claude

Los prompts están listos para copiar y pegar:

| Ventana | Prompt | Responsabilidad |
|---|---|---|
| A | `docs/sprint-0/PROMPT-VENTANA-A.md` | Arquitectura, datos, fuentes, IA, seguridad |
| B | `docs/sprint-0/PROMPT-VENTANA-B.md` | Producto, requisitos, UX, QA |

Flujo recomendado:

1. **Coloca la SRS y el Plan Maestro** en `docs/requisitos/` (ver `B-001`/`B-002`). Sin ellos, las ventanas trabajan con vacíos marcados.
2. Abre cada ventana en la carpeta del repo y pega su prompt.
3. Cada ventana responde con un plan y pide `ADELANTE`. Revísalo antes de aprobar.
4. Al terminar, cada una entrega un bloque `ESTADO`. Pásalo a la otra ventana solo si necesita coordinación.
5. El usuario aprueba cada sprint. G0 está aprobado y el Sprint 1 técnico fue autorizado; el estado vive en `docs/sprint-1/PLAN-SPRINT-1.md`.

Reglas completas: `docs/CONTRATO-TRABAJO.md`.

---

## Documentación

```
docs/
├── prompts/PROMPT-MAESTRO.md        # requisitos y reglas del producto
├── CONTRATO-TRABAJO.md              # reparto y protocolo entre ventanas
├── requisitos/                      # SRS + Plan Maestro (los aporta el usuario)
├── sprint-0/
│   ├── G0-ACTA.md                   # decisiones vinculantes de G0
│   ├── BLOQUEOS.md                  # B-001…B-019
│   ├── AUDITORIA-ENTORNO.md
│   └── PROMPT-VENTANA-A/B.md
├── sprint-1/
│   ├── PLAN-SPRINT-1.md             # alcance, criterios y evidencia
│   └── HERRAMIENTAS-PRUEBAS.md      # estado real de cada herramienta
├── arquitectura/                    # Ventana A
├── datos/                           # Ventana A
├── fuentes/                         # Ventana A
├── ia/                              # Ventana A
├── seguridad/                       # Ventana A
├── producto/                        # Ventana B
├── ux/                              # Ventana B
├── qa/                              # Ventana B
├── adr/                             # decisiones arquitectónicas
└── estabilizacion/                  # auditoría y sprint de estabilización (2026-11-17)

supabase/
├── migrations/                      # 26 aplicadas en xzlwrlgjsdymcidlmqew
└── tests/p0_suite.sql               # guardias, RLS y privilegios (bloques A–M26, se revierten solos)
```

---

## Stack

- Next.js 16.4.6 (App Router) + TypeScript + Tailwind CSS 4
- Supabase (PostgreSQL, Auth, Storage, RLS)
- Python 3.12 para ETL/ELT
- Vitest + Testing Library + Playwright + axe
- Arquitectura objetivo: monolito modular + workers asíncronos (sin microservicios en el MVP)

## Principios

1. Nada se declara funcionando sin prueba ejecutada.
2. Ningún dato sin fuente; ningún requisito inventado.
3. Dato confirmado, análisis IA e inferencia comercial se muestran distintos.
4. Sin secretos en el repo.
5. El proyecto queda ejecutable al final de cada iteración.

## Advertencia Next.js 16

Esta versión tiene cambios incompatibles con versiones anteriores. Antes de escribir código, leer `node_modules/next/dist/docs/` (ver `AGENTS.md`).
