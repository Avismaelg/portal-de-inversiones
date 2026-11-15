# Backlog técnico — Ventana A

| Campo | Valor |
|---|---|
| Documento | `docs/sprint-0/backlog-tecnico.md` |
| Versión | 0.1.0 (Sprint 0) |
| Fecha | 2026-11-15 |
| Autor | Ventana A |
| Estado | **PROPUESTA para aprobación**. Nada está empezado |
| Complemento | `docs/sprint-0/backlog-producto.md` (Ventana B; ya existe, no se revisó su contenido en este turno) |

> **Cómo leer las estimaciones.** Son **días-persona de una sola persona con dominio**, redondeados, **sin datos históricos de velocidad**. Intervalo real esperable: ×0,6 a ×2. No sustituyen una estimación con equipo. El plan de 16 semanas del PM es una hipótesis "sujeta a validación de capacidad" (PM §12): este backlog ofrece insumos para validarla, **no la valida**. Las fases siguen el PM §12: **F2** Arquitectura, **F3** Fuentes, **F4** Plataforma web, **F5** IA (F1 = Sprint 0; F6/F7 pertenecen a calidad y piloto y se listan al final como dependencias).
> Riesgo: B=bajo, M=medio, A=alto. "Req." referencia los RF/RNF provisionales de B `[PENDIENTE SRS]`.

## 0. Prerrequisitos de Sprint 1 (bloquean todo lo demás)

| ID | Tarea | Módulo | Dependencia | Días | Riesgo | Criterio de terminado | Responsable |
|---|---|---|---|---|---|---|---|
| T-PRE-01 | Aprobación del usuario de ADR-0001…0006 | — | Revisión de Sprint 0 | 0,5 | B | ADRs en estado `ACEPTADO` o con cambios solicitados, firmados en `BANDEJA.md` | Usuario |
| T-PRE-02 | Entregar SRS y Plan Maestro, o aprobar seguir solo con el PM | — | — | — | A | B-001/B-002 cerrados con evidencia (archivos en `docs/requisitos/`) o decisión escrita | Usuario |
| T-PRE-03 | Confirmar/crear proyecto Supabase de este producto | Infra | — | 0,5 | A | `get_project_url` responde y el proyecto es el acordado; B-003 cerrado con evidencia | Usuario + A |
| T-PRE-04 | Primer commit del repositorio (tras revisar secretos) | Repo | T-PRE-01 | 0,25 | B | `git log` con 1 commit; `gitleaks`/revisión manual sin hallazgos; B-005 cerrado | Usuario |
| T-PRE-05 | Contratar revisión legal inicial (L-01…L-12 de SEGURIDAD §7) | Legal | — | externo | A | Memorándum del abogado archivado; `REQUIERE ABOGADO` reducidos o resueltos fila por fila | Usuario |
| T-PRE-06 | Elegir proveedor LLM y presupuesto mensual | IA | — | 0,5 | M | Variables `AI_*` definidas (sin secretos en repo); tope aprobado | Usuario |
| T-PRE-07 | Decidir hosting web y de workers (ADR-0005) | Infra | T-PRE-01 | 0,5 | M | ADR-0005 `ACEPTADO` | Usuario |

## 1. Fase 2 — Arquitectura y base técnica

| ID | Tarea | Módulo | Dependencia | Días | Riesgo | Criterio de terminado | Req. |
|---|---|---|---|---|---|---|---|
| T-INF-01 | Prueba de humo de Supabase en rama/proyecto de pruebas: confirmar extensiones (`pg_trgm`, `pg_cron`, `pgvector`), `BYPASSRLS` de `service_role`, nombres de GUC del JWT, privilegios por defecto | Datos | T-PRE-03 | 1 | A | Informe con salida real de cada comprobación; cada `[VERIFICAR Sprint 1]` del SQL cerrado o ajustado | — |
| T-INF-02 | Ejecutar `schema-propuesto.sql` en una base vacía (Postgres 15+ y Supabase de pruebas) y corregir errores | Datos | T-INF-01 | 1,5 | M | Script corre sin error; conteo de 23 tablas con RLS (consulta de `MODELO-DATOS.md`); migración guardada en `supabase/migrations/` | RNF-24 |
| T-INF-03 | Suite de pruebas RLS rol × tabla × operación (T-DB-01…03) | Datos | T-INF-02 | 3,5 (antes 3; +0,5 por P0-01…11 de eventos) | M | Matriz de `MODELO-DATOS.md` §7.1 convertida en pruebas; 0 casos indebidos; informe archivado | RNF-24, AC-MVP-13 |
| T-INF-04 | CI mínima (lint, tipos, `vitest`, escaneo de secretos, `npm audit`) en GitHub Actions | Infra | T-PRE-04, SG-04 | 1,5 | B | Pipeline verde en un PR de prueba; secretos de ejemplo detectados por el escáner (prueba negativa) | RNF-26, RNF-34 |
| T-INF-05 | Esqueleto del monolito modular: carpetas de módulos, regla de lint de imports (A–F no se leen entre sí), configuración tipada de entorno con `zod` | Core | T-PRE-01 | 2 | B | `npm run lint`/`build` pasan; prueba que viola la regla de imports falla | — |
| T-INF-06 | Leer `node_modules/next/dist/docs/` relevante y registrar convenciones de Next 16 que afecten a auth, cookies, middleware/proxy y caché | Core | — | 1 | M | Nota en `docs/arquitectura/` (Ventana A) con rutas de los documentos leídos y decisiones | RT-09 |
| T-INF-07 | Observabilidad base: logs estructurados con `request_id`, Sentry (variable ya prevista), 4 alertas mínimas | Infra | T-INF-05 | 2 | M | Fallo simulado genera alerta (acta del simulacro) | RNF-35 |
| T-INF-08 | Entornos: staging y producción separados, secretos por entorno, política de datos `is_demo` | Infra | T-PRE-07 | 2 | M | Documento de despliegue + variables por entorno verificadas; sin secretos en repo | PM §10 |
| T-INF-09 | Cola `ingestion_jobs`: funciones de reclamo (`FOR UPDATE SKIP LOCKED`), lease y reintentos, con pruebas de concurrencia | Ingest | T-INF-02 | 2 | M | Prueba: 2 workers simultáneos no toman el mismo job; job con lease vencido se reasigna | RNF-07 |
| T-INF-10 | Autenticación (registro, verificación de correo, login, recuperación) con RLS de `users` y creación de perfil | Core | T-INF-02, T-INF-06 | 3 | M | AC-MVP-01 verificado; `viewer` no accede a `/admin` (403) | RF-G-01, AC-MVP-10 |

Subtotal F2: ≈ 19 días-persona.

## 2. Fase 3 — Integración de fuentes

Cada conector exige antes su tarea de verificación `T-SRC-*` (FUENTES-RD §14). **Sin esa verificación, el conector no se activa** (`CHECK` en `sources`).

| ID | Tarea | Módulo | Dependencia | Días | Riesgo | Criterio de terminado | Req. |
|---|---|---|---|---|---|---|---|
| T-SRC-01 | Verificar DGCP: leer `datosabiertos.dgcp.gob.do`, su `robots.txt`, frecuencia real, tamaño incremental | Fuentes | — | 0,5 | M | Ficha F-01 actualizada con evidencia; contradicción de frecuencia resuelta | RF-D-01 |
| T-SRC-02 | Verificar BCRD: términos (`/a/d/3894`), calendario de publicación, páginas de subastas, contacto para API | Fuentes | — | 0,5 | M | Ficha F-02 actualizada | RF-C-01 |
| T-SRC-03 | Verificar Crédito Público: RSS, privacidad, servicios de inversionistas | Fuentes | — | 0,5 | B | Ficha F-03 actualizada | RF-C-02 |
| T-SRC-04 | Verificar MIMARENA: formato real de descargas WPFD, `serviciosdigitales` y su robots/términos | Fuentes | — | 1 | M | Ficha F-04 con formato y campos disponibles (¿proyecto, promotor, monto, estado?) | RF-B-01 |
| T-SRC-05 | Verificar CNE desde navegador real / contacto institucional | Fuentes | — | 1 | A | Ficha F-05 con API/formato o decisión "manual" | RF-B-01 |
| T-SRC-06 | Verificar SIMV (registro y hechos relevantes) | Fuentes | — | 1 | A | Ficha F-06 completa o "manual" | RF-C-03 |
| T-SRC-07 | BVRD: aclarar licencia/acuerdo; decidir "solo enlace" | Fuentes | T-PRE-05 | 1 **[SHOULD — RF-C-03 es manual, G0 #7]** | A | Decisión escrita; ficha F-07 | RF-C-03 |
| T-SRC-08 | ProDominicana: leer `/news`, términos, evaluar como fuente de señales | Fuentes | — | 0,5 **[SHOULD — RF-E-01 manual]** | M | Ficha F-08 completa | RF-E-01 |
| T-SRC-09 | `datos.gob.do`: comprobar si es CKAN y qué publica | Fuentes | — | 0,5 **[COULD]** | M | Ficha F-09 completa | — |
| T-ING-01 | Framework de conector: cliente HTTP seguro (lista de hosts, DNS validado, límites, `robots.txt`, `User-Agent`), con pruebas SSRF | Ingest | T-INF-09, SG-05 | 4 | A | S-T-04 pasa (IP privadas, metadata, redirecciones, DNS rebinding) | PM §10 |
| T-ING-02 | Almacenamiento de originales (hash, Storage, `source_documents` inmutable) + carga manual desde panel admin | Ingest | T-INF-02 | 3 | M | Reingesta del mismo archivo no duplica (RNF-06); carga manual registra actor | RF-A-01, A-04 |
| T-ING-03 | Conector DGCP OCDS bulk (streaming `.jsonl.gz`) → `public_tenders`/`contracts`/`organizations` | Ingest/D | T-SRC-01, T-ING-01, T-ING-02 | 6 | A | Carga completa y luego incremental sin duplicados; memoria pico medida; `data_quality_flags` poblado | RF-D-01…D-06 |
| T-ING-04 | Conector Crédito Público (listado → PDF/XLSX) → `instrument_auctions` | Ingest/C | T-SRC-03, T-ING-01, T-ING-02 | 5 **[CONDICIONADA: bloqueada por T-PRE-05 (G0 #5); el MVP usa T-ING-06]** | M | Resultados de subasta reconstruidos desde XLSX consolidado; `rate_kind='awarded'`; cada fila cita su documento | RF-C-01, C-08 |
| T-ING-05 | Conector BCRD (XLS/XLSX con validación de esquema) | Ingest/C | T-SRC-02, T-ING-01 | 5 **[CONDICIONADA: sin licencia explícita; espera al abogado (G0 #5)]** | A | Un cambio de columnas produce `failed_schema` y alerta (prueba con archivo alterado) | RF-C-01 |
| T-ING-06 | Procedimiento manual asistido para CNE/SIMV/BVRD/MIMARENA (si no hay vía automática): formulario de carga, plantilla de metadatos, checklist | Ingest | T-ING-02, T-SRC-04…07 | 8 (antes 3) **[CAMINO PRINCIPAL de B, C y E, G0 #7; incluye Crédito Público manual]** | M | Un operador carga un documento y aparece con evidencia y actor; manual de procedimiento | S-05 de B |
| T-ING-07 | Conector MIMARENA (descargas WPFD) si es automatizable | Ingest/B | T-SRC-04, T-ING-01 | 4 **[CONDICIONADA a T-SRC-04…06 y abogado]** | A | Condicional: solo si T-SRC-04 lo permite | RF-B-01 |
| T-ING-08 | Programador: encola jobs por fuente (`pg_cron` o cron externo con `INGESTION_CRON_SECRET`) | Ingest | T-INF-09 | 2 | M | Jobs creados por fuente y ventana; idempotente al repetir | RF-A-01 |
| T-ING-09 | Deduplicación de eventos/organizaciones (claves y candidatos de fusión reversibles) | A/E | T-ING-03 | 4 | M | Prueba con casos de duplicado conocidos; fusión y deshacer auditados; métrica de duplicados medida (meta B ≤ 2 %) | RF-A-04, E-08, RNF-12 |
| T-ING-10 | Catálogos: siembra de `geographic_locations` desde fuente oficial **[fuente PENDIENTE]** | Datos | T-SRC-* | 2 | M | Provincias/municipios cargados con `coordinates_source`/`official_code` y cita | RF-B-07 |
| T-ING-11 | Panel de salud de ingesta (frescura, fallos, cola) | Admin | T-ING-08 | 2 | B | Datos reales de jobs visibles; alerta de fuente sin datos | RNF-15 |

Subtotal F3 (verificaciones 6,5 + conectores y comunes 40): ≈ 47 días-persona. **Cobertura realista** de módulos B/E depende de T-SRC-04…06; si resultan manuales, la automatización de esos módulos queda fuera del MVP (cobertura declarada por fuente, RF-B-01).

## 3. Fase 4 — Plataforma web (parte técnica; el diseño lo define B)

| ID | Tarea | Módulo | Dependencia | Días | Riesgo | Criterio de terminado | Req. |
|---|---|---|---|---|---|---|---|
| T-WEB-01 | Capa de acceso a datos tipada por módulo (consultas, validación `zod`, paginación obligatoria) | Core | T-INF-05, T-INF-02 | 4 | M | Pruebas unitarias; ninguna consulta sin `LIMIT` | RNF-02 |
| T-WEB-02 | Búsqueda de texto completo + facetas (`tsvector`, `pg_trgm`) y benchmark | A/Core | T-WEB-01, T-ING-03 | 4 | M | `EXPLAIN` de 10 consultas + k6 con dataset sintético; contra RNF-03 | RF-A-08, RF-G-04, RNF-03 |
| T-WEB-03 | Radar y detalle de evento con evidencia, fechas y capa de confianza (consumo de contratos de datos; UI por B) | A | T-WEB-01 | 5 | B | AC-MVP-02 | RF-A-* |
| T-WEB-04 | Proyectos y permisos con máquina de estados y restricciones | B | T-WEB-01 | 5 | M | AC-MVP-03 | RF-B-* |
| T-WEB-05 | Licitaciones (cuenta atrás, estados, alertas de plazo) | D | T-ING-03 | 4 | B | AC-MVP-04; fechas con zona | RF-D-* |
| T-WEB-06 | Instrumentos e historial (**comparador post-MVP, G0 #9**; sin "comprar"); `rate_kind` visible | C | T-ING-04 o T-ING-06 (carga manual) | 4 (antes 5; ≈ 1 d menos por el comparador, juicio de A) | M | AC-MVP-05 | RF-C-* |
| T-WEB-07 | Fichas de empresa (`organizations`) y relaciones | E | T-ING-09 | 4 | M | RF-E-03 verificado | RF-E-* |
| T-WEB-08 | Watchlist, preferencias y centro de alertas (in-app) | Alerts | T-INF-10 | 5 | M | AC-MVP-08, AC-MVP-09; prueba de no-duplicado | RF-G-06…08 |
| T-WEB-09 | Panel administrativo: fuentes, jobs, cola de revisión, usuarios/roles (`app.set_user_role`), auditoría | Admin | T-INF-10, T-ING-11 | 6 | M | 403 a no-admin; cambios de rol quedan en `audit_logs` | RF-G-12, G-13 |
| T-WEB-10 | Cabeceras de seguridad, CSP, rate limiting y validación en todas las rutas | Seguridad | T-INF-05, T-PRE-07 | 3 | M | S-T-08 y S-T-09 pasan | RNF-23 |
| T-WEB-11 | Dashboard (KPIs, vencimientos, frescura) | Core | T-WEB-03…06 | 3 | B | RF-G-10; datos `is_demo` excluidos de KPIs | RF-G-10 |
| T-WEB-12 | Mapa de proyectos (Could) | B | T-ING-10 | 3 **[COULD — fuera del camino crítico]** | B | Solo si hay coordenadas con fuente; si no, agrupar por provincia | RF-G-11 |

Subtotal F4: ≈ 51 días-persona.

## 4. Fase 5 — Inteligencia artificial

| ID | Tarea | Módulo | Dependencia | Días | Riesgo | Criterio de terminado | Req. |
|---|---|---|---|---|---|---|---|
| T-AI-01 | Interfaz `LlmClient` + registro en `ai_analysis_runs` (tokens, costo, hashes) + presupuesto duro | ai | T-PRE-06, T-INF-02 | 4 | M | Llamada de prueba registra modelo/versión/costo; al superar el tope se bloquea | RN-12, RNF-21 |
| T-AI-02 | Verificador literal de citas y validador de esquemas | ai | T-AI-01 | 3 | B | Pruebas: cita inexistente rechazada; JSON inválido rechazado | RNF-18 |
| T-AI-03 | Construcción de `golden_extraction`/`classification`/`verification` (anotación humana) | ai | T-ING-03…06 | 8 | A | Conjuntos versionados con acuerdo entre anotadores medido | RNF-16, 17 |
| T-AI-04 | Agente Extraction (prompts, esquemas, troceado) | ai | T-AI-02, T-AI-03 | 6 | A | Evals contra `golden_extraction`; informe con métricas **reales** (sin declarar cumplimiento si no llega al umbral) | RNF-16 |
| T-AI-05 | Clasificación sectorial | ai | T-AI-03 | 3 | M | macro-F1 y recall por clase medidos | RNF-17 |
| T-AI-06 | Agente Verification (reglas deterministas + LLM opcional) | ai | T-AI-04 | 5 | A | 0 falsos `verified` en casos de contradicción del golden set | RF-A-11 |
| T-AI-07 | Suite adversarial de prompt injection (≥ 30) y controles I-1…I-12 | ai/Seg | T-AI-04 | 3 | A | S-T-05: 100 % sin ejecutar instrucciones | RNF-20 |
| T-AI-08 | Agente Opportunity Intelligence + cálculo de `confidence` + flujo draft→in_review→published (trigger ya en SQL) | F | T-AI-06 | 6 | A | AC-MVP-06; publicación bloqueada sin cita literal | RF-F-* |
| T-AI-09 | **[POST-MVP — G0 #9]** Librería de cálculo financiero determinista + pruebas | C | decisión V-05 de B | 0 (antes 4) | M | `regression_financial` (≥ 30) pasa | RF-C-07 |
| T-AI-10 | Agente Alert (reglas) + deduplicación y entrega in-app | Alerts | T-WEB-08 | 3 | M | Mismo evento no genera 2 alertas; entrega medida | RF-A-09, RNF-08 |
| T-AI-11 | Cola de revisión humana (UI en admin) y registro de decisiones | Admin | T-AI-08, T-WEB-09 | 5 (antes 4; +1 por cola de revisión de eventos P0) | M | Decisión crea `verification_records` y `audit_logs` | RF-F-11 |
| T-AI-12 | Evals en CI, informe de costos por agente | ai | T-AI-04…08 | 3 | M | Cambio de prompt/modelo dispara evals; despliegue se bloquea bajo umbral | RNF-19, 21 |

Subtotal F5: ≈ 52 días-persona.

## 5. Dependencias de fases 6 y 7 (no estimadas aquí)

Pruebas unitarias/integración/E2E, seguridad y carga (`docs/qa/ESTRATEGIA-PRUEBAS.md`, Ventana B), simulacro de restauración (RNF-09), runbooks (RNF-36), piloto cerrado, revisión legal previa al lanzamiento (RNF-27).

## 6. Orden de implementación propuesto

```mermaid
flowchart LR
    PRE[T-PRE: aprobaciones, Supabase, legal] --> INF[F2: base técnica]
    INF --> SRC[T-SRC: verificar fuentes]
    SRC --> ING[F3: conectores y dedup]
    INF --> WEBb[F4: auth, datos, búsqueda]
    ING --> WEBm[F4: pantallas por módulo]
    ING --> GOLD[T-AI-03: golden sets]
    GOLD --> AI[F5: agentes y evals]
    WEBm --> ADM[T-WEB-09 + T-AI-11: revisión]
    AI --> ADM
    ADM --> PIL[F6/F7: calidad y piloto]
```

Camino crítico: **T-PRE-02/03 → T-INF-01/02/03 → T-ING-01/02 → T-ING-03 (DGCP) → T-AI-03 → T-AI-04 → T-AI-06 → T-AI-08 → T-AI-11**.

Razones del orden:

1. **Primero lo que puede invalidar el diseño:** la prueba de humo de Supabase y la ejecución real del SQL (T-INF-01/02), y la verificación de fuentes (T-SRC-*). Si una fuente es manual, cambia el alcance de B/E.
2. **Una fuente sólida antes que muchas:** DGCP (F-01) tiene evidencia suficiente; sirve de caso de prueba del framework de ingesta y del dedup.
3. **Golden sets antes que prompts:** no se afinan agentes sin conjunto de evaluación, para no "ajustar a ojo".
4. **Seguridad desde el principio** (RLS, SSRF, secretos) y no al final (Fase 6).
5. La IA entra **después** de tener documentos reales y la cola de revisión: así el MVP funciona con revisión humana desde el día 1.

## 7. Resumen de esfuerzo (solo tareas de este backlog)

| Bloque | Días-persona (estimación bruta) |
|---|---|
| F2 | ≈ 19 |
| F3 | ≈ 47 |
| F4 (técnico) | ≈ 51 |
| F5 | ≈ 52 |
| **Total (original, ver §9 para el total revisado ≈ 192,5)** | **≈ 168 días-persona** |

Equivale a **~34 semanas de una persona** o **~16 semanas con ~2 personas a plena dedicación y sin retrasos**, **sin contar** Fase 6, Fase 7, diseño/UX (B), legal ni los vacíos de la SRS. **Conclusión honesta:** con 1–2 personas, las 16 semanas del PM **no son realistas para todo el alcance**; son plausibles solo si el MVP se recorta (p. ej. fuentes manuales para B/E, comparador y calculadora fuera, mapa fuera) o si hay un equipo mayor. Se recomienda que el usuario decida recortes tras ver T-SRC-04…06. Esta cifra es una **hipótesis a validar**, no un compromiso.

## 8. Riesgos del backlog

| ID | Riesgo | Mitigación |
|---|---|---|
| RB-01 | CNE/SIMV/BVRD/MIMARENA resultan manuales | Declarar cobertura parcial; procedimiento manual (T-ING-06) |
| RB-02 | Golden set inviable (pocas muestras, licencias) | Empezar con DGCP/Crédito Público/MIMARENA; ampliar con revisión |
| RB-03 | Decisiones del usuario retrasadas (T-PRE-*) | Priorizar T-PRE-02, 03, 05 |
| RB-04 | Estimaciones sin base histórica | Re-estimar tras Sprint 1 con velocidad real |
| RB-05 | La SRS cambia el modelo de datos | No congelar `schema-propuesto.sql` hasta T-PRE-02 |

## 9. Ronda 2 — habilitadores de B y tareas de conciliación (añadido 2026-11-15)

> Estimaciones en **días-persona** (misma escala y mismas reservas que el resto de este documento). Los habilitadores EN-01…EN-08 son de `backlog-producto.md` §3.1 (B no los estimó). Cuando ya existe tarea equivalente arriba, **no se duplica**.

| ID | Tarea | Equivale a | Módulo | Dependencia | Días | Riesgo | Criterio de terminado |
|---|---|---|---|---|---|---|---|
| T-EN-01 | Sistema de diseño implementado: tokens claro/oscuro, Tailwind 4, `TrustLayerBadge`, `MetricValue`, `EvidencePanel`, `DataTable`/`DataCard`, estados vacío/carga/error | EN-01 | Web | T-INF-05, T-INF-06 (leer docs de Next 16/Tailwind 4) | 8 | M | Componentes con pruebas; contraste de tokens medido con herramienta (no solo el cálculo de diseño); capas distinguibles en escala de grises |
| (ya estimado) T-INF-04 | CI + Vitest + escaneo de secretos | EN-02 | Infra | T-PRE-04 | 1,5 (+0,5 configurar Vitest) = 2 | B | CI verde; secreto de prueba detectado |
| T-EN-03 | Datos sintéticos `is_demo` con semilla fija y catálogo de datasets de prueba (incl. el de RNF-02/03) | EN-03 | Datos | T-INF-02 | 4 | M | Generador reproducible; dataset marcado `is_demo`; excluido de KPIs (prueba) |
| (ya estimado) T-AI-03 + T-AI-12 | Golden sets y arnés de evals | EN-04 | IA | T-ING-03…06, **B-015** (anotadores) | 8 + 3 = 11 | A | Ver §4; **sin anotadores designados no empieza** |
| (ya estimado) T-INF-07 | Observabilidad base y 4 alertas | EN-05 | Infra | T-INF-05 | 2 | M | Simulacro de fallo con alerta |
| T-EN-06 | Runbooks (ingesta, IA, alertas, backups) y ensayo de rollback en staging | EN-06 | Infra | T-PRE-07 (ADR-0005), T-INF-08 | 4 | M | Acta de ensayo de rollback con tiempos reales |
| T-EN-07 | Simulacro de backup/restauración | EN-07 | Infra | T-PRE-03; plan de Supabase `[VERIFICAR]` | 2 | A | Acta con RPO/RTO medidos (B: ≤ 24 h / ≤ 4 h) |
| T-EN-08 | Documentos raíz del PM §14 como **índices** que enlazan a los archivos reales (D-001) | EN-08 | Docs | Aprobación de Sprint 0 | 0,5 | B | Índices creados sin duplicar contenido |
| T-WEB-13 | **Historial público** de cambios (RF-A-12, RF-B-06): endpoint de servidor con lista blanca de columnas y solo filas publicadas; no se lee `audit_logs` desde el cliente | — (respuesta al punto 7 de B) | Web/Datos | T-INF-02, T-WEB-04 | 3 | M | Un `viewer` ve el historial de un proyecto publicado y **no** el de borradores (prueba); sin campos personales |
| T-INF-11 | Conciliar modelo con fichas de B (propuestas DIS-02…DIS-07 de `CONCILIACION-A-B.md`): `verification_status` en otras entidades, `CHECK` de documento por estado, restricción de fusión a `platform_admin`, visibilidad de `ingestion_jobs` | — | Datos | Decisión del usuario sobre DIS-02…DIS-07 | 2 | M | SQL actualizado y ejecutado en Postgres de pruebas; casos negativos pasan |

**Nuevo total de este backlog:** 168,5 (original) + 8 + 0,5 (Vitest) + 4 + 4 + 2 + 0,5 + 3 + 2 = **≈ 192,5 días-persona** (se descuentan los habilitadores ya estimados arriba). No incluye QA E2E/A11Y/carga/DAST, pruebas de usabilidad, revisión legal, piloto ni Fase 6/7. Comparación con el roadmap de B: `docs/sprint-0/CONCILIACION-A-B.md` §3.

## 10. Ronda 4 — recálculo tras los recortes de G0 (2026-11-15)

> Base: `G0-ACTA.md` (#7, #9, #11, #13) y `RONDA4-A.md`. Mismas reservas de siempre: días-persona **sin calibrar**; los ajustes marcados "juicio de A" son estimaciones mías, no mediciones. Las filas afectadas están marcadas en las tablas de §1–§4 (nada se borró).

### 10.1 Cambios de esta ronda

| Tarea | Cambio | Δ días | Motivo |
|---|---|---|---|
| T-AI-09 | **POST-MVP** (calculadora, G0 #9) | −4 | RF-C-07 fuera del MVP |
| T-WEB-06 | Sin comparador (G0 #9) | −1 | Juicio de A: el comparador no estaba separado en la estimación; es una suposición |
| T-ING-06 | Carga manual asistida pasa a **camino principal** de B, C (incl. Crédito Público) y E (G0 #7) | +5 (3 → 8) | Antes era plan B para algunas fuentes; ahora cubre varios tipos de entidad (permisos, proyectos, instrumentos/subastas) con validación, evidencia y deduplicación. Juicio de A |
| T-INF-03 | Añade las pruebas P0-01…P0-11 de la guardia de eventos | +0,5 | Ronda 4 §3 |
| T-AI-11 | La cola de revisión incluye **eventos** no verificados (P0), no solo oportunidades | +1 | G0 #11a; juicio de A |
| T-ING-04, T-ING-05, T-ING-07 | **CONDICIONADAS** (no se activan sin abogado/verificación; G0 #5, #7) | 0 (14 d quedan fuera de la base) | Se mantienen para cuando se autoricen |
| T-WEB-12 (mapa) | **COULD** | 0 (3 d fuera de la base) | RF-G-11 sigue Could; el acta no lo recorta |
| T-SRC-07, T-SRC-08 | **SHOULD** (RF-C-03 y RF-E-01 son manuales) | 0 (1,5 d fuera de la base) | |
| T-SRC-09 | **COULD** | 0 (0,5 d fuera de la base) | Sin requisito asociado |
| (sin tarea previa) | Comparador RF-C-06, vistas guardadas RF-G-05, exportación CSV RF-G-16, capa `Cálculo` | 0 | **Nunca tuvieron tarea propia en este backlog** |

### 10.2 Totales (sin maquillar)

| Concepto | Días-persona |
|---|---|
| Total anterior (§9, Ronda 2) | 192,5 |
| − T-AI-09 − comparador | −5,0 |
| + carga manual principal + pruebas P0 + cola de eventos | +6,5 |
| **Total tras Ronda 4 (todas las tareas)** | **194,0** |
| − tareas condicionadas a abogado/verificación (T-ING-04, 05, 07) | −14,0 |
| − Should/Could (T-WEB-12, T-SRC-07/08/09) | −5,0 |
| **Base comprometible del MVP (sin conectores condicionados ni Should/Could)** | **175,0** |
| Base + conectores si el abogado los autoriza | 189,0 |

**El total NO baja: sube 1,5 d (+0,8 %).** Razones: (1) los recortes de G0 eliminan poco trabajo **de este backlog** (≈ 5 d), porque comparador, vistas guardadas, CSV y capa `Cálculo` casi no tenían tareas propias aquí; su coste vivía en la UI de B o dentro de T-WEB-01/02/06 sin desglosar, y A no puede separarlo con honestidad; (2) a cambio, G0 #7 convierte la carga manual en camino principal (+5 d) y la puerta P0 añade pruebas y cola de eventos (+1,5 d). Lo que sí cambia es la **composición**: 14 d de conectores pasan a depender del abogado, de modo que la base realmente comprometible es 175 d.

### 10.3 Comparación con el backlog de B (428 pts)

B: **428 pts** = Must 353 + Should 65 + Could 10 (tras retirar 22 pts) y baseline aprobado de **20–24 semanas con 2–3 personas** (G0 #6).

| Escenario (100 % de dedicación, 5 d/semana) | Capacidad (días) | 194 d (todo) | 175 d (base) | Holgura que queda para QA, endurecimiento, usabilidad y piloto (sobre 194 d) |
|---|---|---|---|---|
| 2 personas × 20 semanas | 200 | 97 % | 88 % | **6 d (3 %)**: no cabe |
| 2 personas × 24 semanas | 240 | 81 % | 73 % | 46 d (19 %): justo |
| 3 personas × 20 semanas | 300 | 65 % | 58 % | 106 d (35 %) |
| 3 personas × 24 semanas | 360 | 54 % | 49 % | 166 d (46 %) |

Lectura: el baseline de G0 **solo es sostenible con 3 personas, o con 2 personas en el extremo de 24 semanas y poca holgura**. Con 2 personas y 20 semanas, el trabajo de este backlog consume casi toda la capacidad antes de QA, F6/F7 y legal (que no estimo). Cada +10 % de trabajo no estimado equivale a ≈ 19 d.

Comparación de unidades (solo orden de magnitud): 194 d / 428 pts ≈ **0,45 d/pt**; sobre Must únicamente (175 d / 353 pts) ≈ **0,50 d/pt**. Ese factor **no está calibrado**: sale de dividir dos cifras sin velocidad real. B-013 sigue abierto: hasta medir velocidad en S1–S2 ninguna de las dos escalas es una predicción. Con 0,5 d/pt, los 353 pts de Must requieren ≈ 176 d: ≈ 2,5 personas durante 70 días laborables (S1–S7), coherente con "2–3 personas", pero **sin margen** si el equipo es de 2.

### 10.4 Riesgos del recálculo

| ID | Riesgo | Mitigación |
|---|---|---|
| RR-01 | Los +5 d de T-ING-06 y los −1 d de T-WEB-06 son juicios de A | Re-estimar en S1 con el primer formulario real |
| RR-02 | La base de 175 d no incluye QA E2E/A11Y/carga/DAST, usabilidad, legal ni piloto | Estimar con B cuando las herramientas aprobadas (G0 #12) estén instaladas |
| RR-03 | Si el abogado autoriza los conectores (+14 d), el total vuelve a 189–194 d | Decidir tras T-PRE-05; no prometer automatización antes |
| RR-04 | Las decisiones DIS-02…DIS-07 (T-INF-11, 2 d) siguen abiertas y podrían ampliar el modelo | Cerrarlas antes de T-INF-02 |
