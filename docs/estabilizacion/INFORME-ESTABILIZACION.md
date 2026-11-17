# Informe del sprint de estabilización — 2026-11-17

Rama: `sprint/estabilizacion` · Base: `main` @ `e4f96f3` · Proyecto Supabase: `xzlwrlgjsdymcidlmqew`.
Responde a la «Primera orden de ejecución» del Prompt Maestro de Desarrollo Integral v2.0 (pegado por el usuario el 2026-11-17).

## 1. Evidencia del estado (comandos ejecutados en local)

| Comando | Resultado en la base `e4f96f3` |
|---|---|
| `npm run lint` | OK |
| `npm run typecheck` | OK |
| `npm run test:coverage` | 43/43 OK · cobertura de líneas 28,4 % |
| `npm run build` | OK |
| `npm run test:e2e` | 5/5 OK (solo páginas públicas y redirecciones; sin sesión real) |
| `npm run secret:scan` (gitleaks) | sin fugas |
| `npm audit --audit-level=high` | **FALLA**: 19 paquetes (13 altos, 6 moderados), 2 avisos raíz, todos en dependencias de desarrollo |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| CI GitHub (`main`) | **falla desde `7fe8c0f`**, solo en el job `npm audit (high)`; el resto de jobs en verde |

Tras los cambios de la rama: lint, tipos, 48/48 unitarias (cobertura de líneas 27,2 %), build, 5/5 E2E, gitleaks y la nueva puerta de auditoría en verde (ver §3).

## 2. Hallazgos de la auditoría inicial (comprobados, no asumidos)

| # | Hallazgo previo | Comprobación | Severidad |
|---|---|---|---|
| 5.1 | `npm audit` falla | Confirmado. Raíces: `picomatch` ≤4.0.7 (GHSA-fc5q-39xc-vjpf, alta, **sin versión corregida publicada**) y `minimatch` 7–11.0.0 (GHSA-g3hv-75wg-m249, moderada). Solo desarrollo. `npm audit fix --force` propone bajar vitest a 3.1.4 y eslint-config-next a 14.2.35: rechazado. | P0 (CI rojo) |
| 5.2 | La carga DGCP fija estado de publicación y confianza | Confirmado y más amplio: `public_tenders.publication_status` tenía **valor por defecto `published`**; cualquier staff (incluido `analyst`) podía insertar o actualizar como publicado; no había registro de revisor ni fecha. **158 de 300** licitaciones estaban publicadas con estado DGCP no reconocido (`unmapped_status`). | P0 (integridad) |
| 5.3 | E2E limitadas | Confirmado: 5 pruebas, sin sesión real. No existe entorno de pruebas separado ni usuarios por rol (nuevo bloqueo **B-020**). | P0 bloqueado |
| 5.4 | README desactualizado | Confirmado: decía «No hay código de producto» y «Supabase bloqueado». `AGENTS.md` también. | P1 |
| — | SRS y Plan Maestro (.docx) | **Ausentes** del repositorio (`docs/requisitos/` solo tiene README). B-001/B-002 siguen abiertos. | Bloqueo |

## 3. Cambios implementados en esta rama

| Área | Cambio | Archivos |
|---|---|---|
| Dependencias / CI | Puerta de auditoría: producción bloquea ante cualquier alta/crítica; desarrollo bloquea ante avisos nuevos y ante excepciones vencidas. Excepción temporal y documentada para `picomatch` hasta 2026-12-17 (pendiente de aceptación formal). | `tools/audit-check.mjs`, `.github/workflows/ci.yml`, `package.json`, `docs/seguridad/RIESGOS-DEPENDENCIAS.md` |
| Integridad de publicación | Migración 16: borrador por defecto; trigger `app.enforce_tender_publication` exige gestor autenticado para publicar, nota obligatoria si hay banderas de calidad, registra `reviewed_by`/`reviewed_at` (inmutables una vez publicado); columnas de procedencia `source_url`, `extracted_at`, `validation`. Datos existentes: 158 con banderas → `in_review` (sin borrar nada); 142 limpias siguen publicadas marcadas `legacy_pre_guard`. | `supabase/migrations/20261117120000_init_16_tender_publication_guard.sql` |
| Carga DGCP | Regla `dgcp_auto_publish_v1` en función pura: limpias → publicadas a nombre de quien carga; con banderas → revisión; no deshace decisiones humanas; si un publicado cambia en la fuente, vuelve a revisión. Guarda URL del procedimiento y fecha de extracción. | `src/lib/ingest/tender-publication.ts`, `src/lib/ingest/dgcp.ts`, `src/app/(app)/admin/ingesta/actions.ts` |
| Revisión editorial | Cola `/revision/licitaciones`: publicar con nota o rechazar; enlace para verificar en DGCP. | `src/app/(app)/revision/licitaciones/*`, `src/app/(app)/revision/tender-actions.ts`, `src/app/(app)/revision/page.tsx` |
| Pruebas | Unitarias de la regla de publicación (5). Bloque D de la suite P0 contra la base (7 casos, se revierte solo). | `src/__tests__/tender-publication.test.ts`, `supabase/tests/p0_suite.sql` |
| Documentación | README, `AGENTS.md` (estado), `BLOQUEOS.md` (B-003, B-011, B-020, B-021). | — |

### Evidencia de la guardia (bloque D, ejecutado contra `xzlwrlgjsdymcidlmqew`, revertido)

```
D-01 (esperado draft): draft
D-02 OK: tender publication requires an authenticated manager        (sin sesión)
D-03 OK: tender publication requires an authenticated manager        (analista vía rol authenticated)
D-04 OK: tender with data quality flags requires review_notes ...    (gestor sin nota)
D-05 (esperado true/true): true/true                                  (gestor con nota: revisor y fecha)
D-06 (esperado true): true                                            (revisor inmutable)
D-07 viewer ve borrador (esperado 0): 0                               (RLS)
```

## 4. Seguridad

- **Resuelto:** publicación de licitaciones sin control (ahora en base de datos, no solo en la interfaz); CI de dependencias con excepción explícita en vez de rojo permanente.
- **Pendiente:**
  - `analyst` puede editar campos de una licitación publicada (título, montos) vía `public_tenders_update`; queda en auditoría pero no se revisa. → P1-03.
  - Tope de gasto de IA (`AI_MONTHLY_BUDGET_USD`) no aplicado en código. → P1-04.
  - Sin pruebas de autorización E2E con sesión real (B-020). → P0-02.
  - Aceptación formal de la excepción `picomatch` (B-021).

## 5. Matriz de trazabilidad (alcance MVP de G0-ACTA)

| Alcance G0 | Implementación | Pruebas | Estado |
|---|---|---|---|
| Radar de eventos | `/radar` sobre `news_items` (temas en alza, poco difundidas). `economic_events` sin uso en la interfaz. | `radar.test.ts`, `priority.test.ts` | Parcial: radar de señales, no de eventos verificados |
| Proyectos y permisos (carga manual asistida) | `/proyectos` de solo lectura; tablas `projects`/`permits` vacías; sin carga | — | No iniciado (solo lista) |
| Licitaciones | `/licitaciones`, carga DGCP manual, revisión editorial | `dgcp.test.ts`, `tender-publication.test.ts`, P0 bloque D | Funcional; falta detalle, historial y contratos |
| Watchlist | `/watchlist` (licitaciones, instrumentos) | — (sin E2E con sesión) | Funcional sin pruebas E2E |
| Alertas in-app | `/alertas` por palabras clave (noticias y licitaciones), cálculo al vuelo; `notifications` sin uso | `radar.test.ts` | Parcial: sin entrega, lectura, deduplicación |
| Oportunidades con revisión humana | `/oportunidades` de solo lectura; guardia en base (`enforce_opportunity_publication`) | P0 bloques A/B | No iniciado (solo lista) |
| Instrumentos con evidencia | `/instrumentos`, revisión y despublicación con motivo | P0, `review-rules` | Funcional |
| Análisis IA | Noticias: impacto, escenarios, cadena de valor; cita verificada | `analyze-news.test.ts`, `article.test.ts` | Implementado, **no ejecutado con la API real** (falta clave) |

## 6. Backlog priorizado

| ID | Prioridad | Tarea | Depende de | Archivos previstos | Aceptación |
|---|---|---|---|---|---|
| P0-01 | P0 | Fusionar esta rama tras CI verde | — | — | CI verde en PR |
| P0-02 | P0 | E2E con sesión real por rol (viewer, analyst, manager, admin): login, acceso no autorizado, revisión/publicación, watchlist, alertas | B-020 | `e2e/*.spec.ts`, `playwright.config.ts`, seed de pruebas | Un viewer no publica ni ve borradores; un analista no publica; un gestor publica con nota |
| P0-03 | P0 | Aceptación formal de B-021 o retirada de la excepción | Responsable de seguridad | `RIESGOS-DEPENDENCIAS.md` | Decisión registrada |
| P1-01 | P1 | Detalle de licitación con historial de cambios (diferencias entre cargas) | — | `public_tenders` + tabla de versiones | Una recarga que cambia monto/fecha queda en historial |
| P1-02 | P1 | Registro de fuentes completo (estado operativo, último éxito/error, licencia, responsable) y panel de operaciones | — | `sources`, `ingestion_jobs`, `/admin` | Cada carga crea un `ingestion_job` con resultado |
| P1-03 | P1 | Restringir edición de licitaciones publicadas a gestores | — | migración 17 | Analista no puede editar publicadas (prueba P0) |
| P1-04 | P1 | Registro de costo/latencia por análisis IA y tope mensual | B-011 | `ai_analysis_runs`, `analyze-actions.ts` | Se rechaza un análisis si se supera el tope |
| P1-05 | P1 | Proyectos y permisos: carga manual asistida con evidencia y línea de tiempo | B-009 | `projects`, `permits`, `/proyectos/[id]` | Ficha con estado documentado; «permiso solicitado» ≠ «aprobado» |
| P1-06 | P1 | Oportunidades: flujo detectada → revisión → publicada desde un análisis IA | P1-05 o eventos | `investment_opportunities`, `/oportunidades/[id]` | Publicación bloqueada sin evidencia literal |
| P1-07 | P1 | Alertas con entrega in-app (`notifications`), lectura, deduplicación | — | `notifications`, `/alertas` | Una coincidencia genera 1 notificación, no duplicada |
| P1-08 | P1 | Subir cobertura de unitarias en `src/lib` a ≥70 % | — | `src/__tests__` | Informe de cobertura |
| P2-01 | P2 | Correlación de acontecimientos y resolución de entidades | P1-05, P1-01 | — | Relaciones con naturaleza confirmada/inferida |
| P2-02 | P2 | Búsqueda unificada con Full Text Search de PostgreSQL | — | — | Busca en noticias, licitaciones, instrumentos |
| P2-03 | P2 | Rediseño «Investment Hub» (sidebar, azul marino/turquesa/ámbar) | — | `globals.css`, layout | Contraste AA verificado con axe |
| P2-04 | P2 | Revisar aviso de desarrollo («1 Issue») observado en `/admin/ingesta` | — | — | Sin avisos en `next dev` |
| P3-01 | P3 | Mapa (MapLibre), comparador de instrumentos, expansión internacional | Control de cambios | — | — |

**Contradicción a decidir:** el Prompt Maestro v2.0 (§15) pide un sidebar «Investment Hub» azul marino/turquesa; la interfaz actual, aprobada por el usuario el 2026-11-17, usa barra superior estilo red profesional en azul. Se registra como P2-03 y no se cambia sin decisión del usuario.

## 7. Bloqueos

B-001/B-002 (SRS y Plan Maestro ausentes), B-009/B-017 (licencias y abogado), B-011 (clave y tope de IA), B-013 (equipo), **B-020** (entorno de pruebas separado), **B-021** (aceptación de la excepción de dependencias).
