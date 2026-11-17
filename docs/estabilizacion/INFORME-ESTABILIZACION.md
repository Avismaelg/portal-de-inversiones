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
| P2-03 | P2 | Investment Hub: verificar con axe las pantallas con sesión (requiere B-020) y crear pantallas pendientes (Permisos, Empresas, Mapa, Reportes, Configuración) | B-020 | — | 0 violaciones axe en pantallas autenticadas |
| P2-04 | P2 | Revisar aviso de desarrollo («1 Issue») observado en `/admin/ingesta` | — | — | Sin avisos en `next dev` |
| P3-01 | P3 | Mapa (MapLibre), comparador de instrumentos, expansión internacional | Control de cambios | — | — |

**Decisión (2026-11-17):** el usuario eligió el diseño «Investment Hub» del Prompt Maestro v2.0 (§15). Implementado en la rama `feat/investment-hub`: sidebar azul marino con secciones del §15 (las que no tienen pantalla aparecen deshabilitadas como «pronto», sin datos inventados), turquesa para acciones, ámbar para atención, header con buscador, estado de actualización de datos (detección/extracción real), campana de alertas (coincidencias en 24 h) y cuenta. Contraste AA calculado: turquesa/blanco 4,91; ámbar/blanco 5,02; texto atenuado/fondo 5,82; texto del sidebar 7,49–14,01.

## 7. Bloqueos

B-001/B-002 (SRS y Plan Maestro ausentes), B-009/B-017 (licencias y abogado), B-011 (clave y tope de IA), B-013 (equipo), **B-020** (entorno de pruebas separado), **B-021** (aceptación de la excepción de dependencias).


## 8. Incremento P1 (rama `feat/p1-producto`, 2026-11-17)

| Backlog | Estado | Implementación | Verificación |
|---|---|---|---|
| P1-03 Edición de licitaciones publicadas solo por gestores | **Hecho** | Migración 18 (`enforce_tender_publication`) | P0 bloque E-01 |
| — Guardia de proyectos y permisos (hallazgo nuevo: podían publicarse sin revisión) | **Hecho** | Migración 18 (`enforce_registry_publication`): gestor + documento + nota; revisor inmutable | P0 E-02…E-04 |
| P1-02 Registro de fuentes y panel de operaciones | **Hecho (parcial)** | `sources.last_success_at/last_error_at/last_error/responsible`; `record_ingestion_run`; cargas DGCP y de noticias registran éxito/fallo; `/admin/operaciones` | P0 E-05/E-06; carga DGCP real registrada el 2026-11-17 |
| P1-04 Costo, latencia y tope mensual de IA | **Hecho** | `record_ai_run`, `ai_spend_month`, `src/lib/ai/pricing.ts`; tope `AI_MONTHLY_BUDGET_USD` (5 USD por defecto); cada análisis registra modelo, versión de prompt y esquema, tokens, costo y latencia | `pricing.test.ts`; P0 E-07/E-08. **No ejecutado con la API real** (B-011) |
| P1-07 Alertas con entrega in-app | **Hecho** | `push_my_notifications` (dedup por entidad, solo propias), bandeja `/alertas` con leído/no leído, campana con no leídas | `notifications.test.ts`; P0 E-09…E-11 |
| P1-06 Oportunidades desde un análisis | **Hecho (inicial)** | `propose_opportunity_from_news`; botón en el análisis de cada noticia; ficha `/oportunidades/[id]` con «qué falta para publicar» | P0 bloque F |
| P1-06b Verificación del acontecimiento, evidencia literal y decisión | **Hecho** | Ficha `/oportunidades/[id]`: el gestor (1) registra la verificación humana del acontecimiento, (2) adjunta una cita que el servidor comprueba literalmente contra la fuente leída en ese momento (`src/lib/quote.ts`, sin guardar el texto) y (3) publica o rechaza con nota y confianza. Migración 20: `add_literal_evidence` (solo gestor) | `quote.test.ts`; P0 bloque G (9 casos). **Sin prueba en la interfaz con datos reales** (no hay oportunidades y no se crearon en la cuenta del usuario) |
| — Hallazgo: un analista podía insertar `evidence` con `literal_verified=true` sin comprobación | **Hecho** | Migración 20 (`evidence_literal_guard`): desde la API solo la función `add_literal_evidence` marca una cita como verificada; la cita no se puede editar después | P0 G-01…G-04 |
| P1-01 Historial de cambios por licitación | **Hecho** | Migración 21: `tender_changes` (antes → después de 11 campos relevantes, origen carga/revisión/edición y rol, sin identidad); escrito solo por disparador; visible para staff o si la licitación está publicada. Sección «Historial de cambios» en `/licitaciones/[id]` | `tender-changes.test.ts`; P0 bloque H (6 casos). Sin revisión visual (extensión de Chrome desconectada) |
| P1-05 Proyectos y permisos con carga manual | Pendiente | Guardia lista; falta formulario de carga con documento | — |
| P1-08 Cobertura ≥70 % en `src/lib` | **Hecho** | 71 unitarias; `src/lib` en 95,2 % líneas / 92,9 % sentencias / 88,1 % ramas / 89,9 % funciones. Umbral en `vitest.config.mts` (85/85/75/80) que hace fallar `test:coverage` y el CI si baja. `auth.ts` y `supabase/server.ts` (envoltorios de conexión) quedan en 0 % | `npm run test:coverage` (salida 0); umbral comprobado: a 99 % falla con salida 1 |
| P0-02 E2E con sesión por rol | **Bloqueado (B-020)** | — | — |

Evidencia local: lint, tipos, 71/71 unitarias y build en verde (5/5 E2E en el incremento anterior; la primera ejecución falló por tiempo de espera al compilar rutas en frío y la segunda pasó); bloques P0 D, E, F, G y H ejecutados contra `xzlwrlgjsdymcidlmqew` con el resultado esperado y revertidos.

**Riesgo residual (documentado):** la base no puede comprobar por sí misma la cita porque el texto de las noticias no se almacena (términos de las fuentes pendientes, B-009). La comprobación la hace el servidor; la función `add_literal_evidence` registra que la atestigua un gestor. Un gestor que llamara a la función directamente podría registrar una cita sin comprobar: queda trazado y es una acción humana con rol de publicación.
