# Conciliación Ventana A ↔ Ventana B (Ronda 2)

| Campo | Valor |
|---|---|
| Documento | `docs/sprint-0/CONCILIACION-A-B.md` |
| Fecha | 2026-11-15 |
| Autor | Ventana A |
| Origen | Instrucción del orquestador `docs/sprint-0/RONDA2-A.md` (recibida por mensaje entre sesiones y por archivo del repo) |
| Estado | **PROPUESTA.** Ninguna decisión de alcance está tomada aquí; las decisiones son del usuario (Contrato §7) |
| Nota de contrato | Este archivo **no figura** en la lista de rutas de A de `CONTRATO-TRABAJO.md` §2; se crea por orden explícita del orquestador (`RONDA2-A.md` §5). Si el usuario no lo acepta, se puede mover o borrar sin efecto en el resto |

> **Qué se leyó.** Completos: `PERSONAS-Y-CASOS-DE-USO.md`, `INVENTARIO-PANTALLAS.md`, `SISTEMA-DISENO.md`, `FICHAS-CLAVE.md`, `ESTRATEGIA-PRUEBAS.md`, `backlog-producto.md`, además de `REQUISITOS-Y-TRAZABILIDAD.md` (primeras 428 líneas de 563 en el turno anterior; **el resto —anexos— no se leyó**) y la entrada de B en `BANDEJA.md` (11:53). **Nada se ha ejecutado**: ni el SQL, ni pruebas, ni conectores.

---

## 1. Respuestas a los 8 puntos de B (bandeja 11:53)

| # | Pregunta de B | Respuesta de A | Evidencia |
|---|---|---|---|
| 1 | `verification_status.pending`: ¿nunca se publica en ese estado? | **Para eventos, confirmado.** `economic_events` tiene `CHECK (publication_status <> 'published' OR verification_status <> 'pending')`. Para **oportunidades**, el trigger exige que el evento originador esté `verified` o `partially_verified` (no `pending`). **Matices:** (a) `verification_status` **solo existe como columna en eventos**; proyectos, permisos, licitaciones e instrumentos no lo tienen (ver DIS-02), así que la regla "pending no se publica" no se aplica a ellos hoy. (b) Un `verification_records` con resultado `pending` sobre un evento ya publicado haría fallar el `UPDATE` (viola el `CHECK`) y, por tanto, el `INSERT` del registro: falla cerrado, pero conviene evitarlo en código | `schema-propuesto.sql` §7.1 y trigger `apply_verification` (revisión **a mano**, sin ejecutar) |
| 2 | `closing_soon` ¿derivado en UI (≤ 72 h) y no columna? | **Confirmado: no se almacena.** `tender_status` = `planned, open, closed, awarded, cancelled, unknown`. El umbral de 72 h es configuración de aplicación (constante/variable de entorno), **no una tabla** (no hay entidad 24). Las alertas de plazo por usuario siguen en `user_alert_preferences.tender_deadline_days` (7/3/1). Cálculo siempre sobre `deadline_at` en UTC; si `timezone_assumed = true` (columna añadida en esta ronda, ver §4) la UI debe avisarlo | SQL §7.4 |
| 3 | `permit_status`: ¿B adopta nuestro enum? | **Sí, adoptarlo.** `requested, under_review, approved, denied, expired, revoked, unknown`. Sigue `[PENDIENTE SRS]`: agregar valores es posible después (`ALTER TYPE … ADD VALUE`); quitar o renombrar no | SQL §1 |
| 4 | Capa `calculation` | **No se toca el enum `trust_layer`** (orden del orquestador). Información útil para la decisión del usuario: un valor de enum se puede añadir pero **no eliminar**, y no puede usarse en la misma transacción que lo crea; conviene decidir **antes de la primera migración**. Si se aprueba, el cambio en A es de 1 línea más revisar los `DEFAULT` y las vistas que filtran por capa | `MODELO-DATOS.md` §4 |
| 5 | Cobertura de fuentes: qué módulos quedan "cobertura pendiente" | Ver tabla §1.1 | `FUENTES-RD.md` |
| 6 | Estimaciones para EN-01…EN-08 | Ver tabla §1.2 | `backlog-tecnico.md` §9 |
| 7 | Historial (RF-A-12, RF-B-06): ¿se podrá leer desde la UI por rol? | **No directamente desde `audit_logs`.** RLS de `audit_logs`: `platform_admin` todo; `org_admin` solo su organización; el resto, nada. El `viewer` **no** puede leerlo (contiene `old_data/new_data` completos, borradores y datos personales). Para el historial **público** de un proyecto publicado hace falta un endpoint de servidor (`service_role`) con **lista blanca de columnas** y solo filas publicadas: tarea nueva **T-WEB-13** (3 d). **Límite:** `audit_logs` se retiene ≥ 1 año y luego se archiva (propuesta, `[PENDIENTE LEGAL]`): si el historial de estados debe ser permanente, hay que conservar esas particiones o materializarlo (DIS-05) | SQL §10; `MODELO-DATOS.md` §8 |
| 8 | Para evals: (a) licencia, (b) contrato JSON, (c) "fuente autorizada", (d) zona horaria | Ver §1.3 | `SISTEMA-IA.md`, `FUENTES-RD.md` |

### 1.1 Cobertura de fuentes por módulo (punto 5)

Nomenclatura: **F-03 es la Dirección General de Crédito Público** (`creditopublico.gob.do`, dependencia de Hacienda). El sitio principal de Hacienda (`hacienda.gob.do`) devolvió HTTP 403 y **no se leyó**. B escribe "Hacienda (F-03)": es correcto solo en ese sentido.

| Módulo / requisito | Fuente | Estado de verificación (2026-11-15) | Mostrar en UI |
|---|---|---|---|
| **A** Radar | Cualquier fuente que aporte documentos | Los eventos solo pueden venir de lo que se ingiera: hoy DGCP y Crédito Público (parciales), más carga manual | "Cobertura parcial" con lista de fuentes activas (no "radar completo") |
| **B** Permisos y proyectos: los **7 tipos** (ambientales, inmobiliarios, energéticos, turísticos, infraestructura pública, instalaciones industriales, concesiones) | MIMARENA (F-04), CNE (F-05), otras instituciones (F-10) | F-04: formato de las descargas **desconocido**; F-05: **sin leer** (HTTP 473); F-10: ni identificadas | **"Cobertura pendiente" en los 7 tipos.** Si T-SRC-04 confirma que las descargas de MIMARENA son tabulares, el tipo *ambiental* podría pasar a "cobertura parcial" (carga manual asistida) |
| **C-01** BCRD | F-02 | Parcial: XLS/XLSX publicados; **términos sin leer** (cuerpo vacío), subastas sin leer, frecuencia no declarada | "Cobertura parcial"; no activar conector sin T-SRC-02 |
| **C-02** Títulos de Hacienda | F-03 | **Buena**: PDF/XLSX de subastas 2009–2026; sin licencia explícita (`REQUIERE ABOGADO`) | Primer candidato junto con DGCP |
| **C-03** Mercado de valores (emisiones) | F-06 SIMV (HTTP 403), F-07 BVRD (HTTP 403, `ai-train=no`) | **Sin verificar** | **"Cobertura pendiente"**; BVRD solo enlace |
| **D** Licitaciones y contratos | F-01 DGCP | **Mejor documentada** (OCDS, ODbL, JSONL/CSV, "diaria" según OCP). Pendientes: `datosabiertos.dgcp.gob.do`, frecuencia real | Cobertura "completa respecto del Portal Transaccional", con la exclusión de Ley 340-06 declarada (p. ej. compras menores) |
| **E** Expansión empresarial | Sin fuente dedicada. Proveedores salen de DGCP; señales corporativas de ProDominicana (F-08, sin verificar) y prensa (no autorizada) | Las 9 señales (fábricas, sucursales, expansiones, inversión extranjera, parques energéticos, infraestructura privada, anuncios de contratación laboral, alianzas, inversión en maquinaria): **ninguna** tiene fuente verificada hoy (DGCP aporta proveedores, no señales corporativas) | "Cobertura pendiente" por señal (RF-E-01) |
| **F** Oportunidades | Derivada de eventos verificados | Limitada a lo que A/C/D aporten | Declarar que se generan solo desde eventos verificados disponibles |

### 1.2 Estimaciones EN-01…EN-08 (punto 6)

Días-persona (escala de A, sin calibrar). Detalle y criterios de terminado en `backlog-tecnico.md` §9.

| EN | Habilitador | Estimación A | Nota |
|---|---|---|---|
| EN-01 | Sistema de diseño implementado | **8 d** (nueva T-EN-01) | Requiere leer docs de Next 16/Tailwind 4 (T-INF-06); contraste a re-medir con herramienta |
| EN-02 | Vitest + CI + secretos | **2 d** (T-INF-04 + config Vitest) | Herramientas (`gitleaks`…) pendientes de aprobación (B-014) |
| EN-03 | Datos sintéticos `is_demo` | **4 d** (nueva T-EN-03) | Debe cubrir el dataset de RNF-02/03 (ver §4.3) |
| EN-04 | Golden sets y arnés de evals | **11 d** (T-AI-03 8 + T-AI-12 3) | **Bloqueado por B-015** (anotadores); tamaños alineados con B |
| EN-05 | Observabilidad (4 alertas) | **2 d** (T-INF-07) | |
| EN-06 | Runbooks y rollback | **4 d** (nueva T-EN-06) | Depende de ADR-0005 (hosting) |
| EN-07 | Simulacro de backup/restauración | **2 d** (nueva T-EN-07) | Depende del plan de Supabase `[VERIFICAR]` |
| EN-08 | Documentos raíz como índices | **0,5 d** (nueva T-EN-08) | D-001 |
| | **Suma de lo no incluido antes** | **18,5 d** (EN-01, 03, 06, 07, 08 + Vitest 0,5) | |

### 1.3 Para las evals (punto 8)

**(a) Licencia para usar documentos públicos como golden set.** No hay una licencia general; depende de la fuente:

| Fuente | Uso como golden set interno | Redistribución / commit al repo |
|---|---|---|
| DGCP (F-01) | Probablemente permitido: ODbL declarada en la ficha de OCP (requiere atribución; *share-alike* para versiones adaptadas) | **`REQUIERE ABOGADO`** (efecto de *share-alike* sobre un conjunto derivado) |
| Crédito Público (F-03), BCRD (F-02), MIMARENA (F-04) | **No hay licencia explícita**; los términos dicen "contenido protegido por derechos de propiedad intelectual" | No subir los documentos al repositorio; guardarlos solo en Storage privado con `redistribution_allowed = false`. Uso interno para evaluar: **`REQUIERE ABOGADO`** |
| BVRD (F-07) | **Excluida**: declara `ai-train=no`, `use=reference` | No usar |
| CNE, SIMV, ProDominicana | **Sin verificar** | No usar hasta T-SRC-05/06/08 |

Regla práctica: los golden sets **no entran en git** (el repo vive en OneDrive y se prevé GitHub); se versionan por hash y se guardan en almacenamiento privado, con un manifiesto (hash, fuente, fecha, versión de términos) en el repo.
Fixtures sintéticos con la misma forma son siempre aceptables.

**(b) Contrato JSON de los agentes.** Está en `docs/ia/SISTEMA-IA.md` §3 (envoltorio, `evidence` — **definición `$defs.evidence` añadida hoy**) y §4.1–4.6 (resultado de Discovery, `EventCandidate`, `VerificationResult`, `OpportunityDraft`, `FinancialAnalysis`). **Faltan** `ProjectCandidate`, `PermitCandidate`, `InstrumentCandidate` (y los de licitación/contrato vienen de OCDS estructurado, sin LLM): se escriben en Sprint 1 con las pruebas de contrato. Hasta entonces B puede escribir pruebas de contrato solo contra los esquemas existentes.

**(c) Criterio de "fuente autorizada" frente a noticia.** Propuesta (requiere aprobación del usuario):

1. **Fuente autorizada** = registro en `sources` con `legal_status = 'verified_ok'` (o `access_method = 'manual'` aprobado por el administrador), cuyo `owner_org_id` es la institución que emite el documento y cuyo host figura en `allowed_hosts`. Un documento autorizado e íntegro (hash) sustenta capa `confirmed` y puede llevar el evento a `verified` aun con una sola fuente (PM §5).
2. **Noticia/prensa/otras** = cualquier documento que no cumpla lo anterior. Solo puede producir capa `ai_analysis`, con `verification_status` máximo `partially_verified` mientras no exista un documento autorizado que lo respalde; **nunca** `confirmed`.
3. **Consecuencia hoy:** ninguna fuente tiene `legal_status = 'verified_ok'` (B-009). Hasta que el abogado y T-SRC-* avancen, **no hay fuentes "autorizadas" en el sentido estricto**: los datos entrarían como carga manual aprobada, y la UI debe mostrarlo. Esto conviene que B lo refleje en la expectativa de G1/G2.

**(d) Zona horaria por defecto.** Si la fuente no indica zona: se asume **`America/Santo_Domingo`**, se guarda en UTC y se marca `timezone_assumed = true` (columna **añadida hoy** en `source_documents`, `economic_events` y `public_tenders`; SQL no ejecutado). B afirma que la zona es UTC−4 sin horario de verano: **A no lo verificó con fuente oficial**; conviene que B cite la referencia. La UI debe avisar cuando `timezone_assumed` sea `true`, sobre todo en `deadline_at`.

---

## 2. Discrepancias encontradas

> Formato: hecho (con evidencia) → opciones → recomendación. **Ninguna se resuelve aquí.** "Decide" = quién debe decidir.

| ID | Discrepancia | Evidencia | Opciones | Recomendación de A | Decide |
|---|---|---|---|---|---|
| **DIS-01** | Tamaños y estadística de evals: A proponía 100 docs / 20 por sector / 60 casos y umbrales sin intervalo; B exige ≥ 300 campos por tipo crítico, ≥ 30 por categoría, ≥ 100 pares, y límite de Wilson | A: `SISTEMA-IA.md` §7 (v0.1); B: `ESTRATEGIA-PRUEBAS.md` §8.1, §8.3 | (a) mantener A; (b) adoptar B | **(b)** | **RESUELTO**: `SISTEMA-IA.md` actualizado hoy (tabla de golden sets, regla de Wilson, puerta P1, `$defs.evidence`, GS-NEG añadido) |
| **DIS-02** | B exige estado de verificación visible en **las 5 fichas** (FC-05) y dice que "A impone `CHECK`" para `pending`; el SQL solo tiene `verification_status` en `economic_events` | `FICHAS-CLAVE.md` §0 FC-05; `schema-propuesto.sql` | (a) añadir columna `verification_status` a `projects`, `permits` (y a `public_tenders`, `financial_instruments`); (b) derivarlo en servidor de `verification_records` + `sources.legal_status` para fuentes estructuradas | **Híbrido:** columna en `projects` y `permits` (extracción con IA); derivado para licitaciones/contratos/subastas/instrumentos de fuentes estructuradas (`trust_layer = 'confirmed'` + fuente `verified_ok`) | Usuario (cambia el modelo) |
| **DIS-03** | RF-B-03: "cada transición exige documento y fecha" y `FICHAS-CLAVE` §3.2 exige documento mínimo por estado (incl. `announced`, `permit_applied`, `suspended`, `cancelled`); el SQL solo exige documento oficial para `permit_approved`, `under_construction`, `operating` | RF-B-03/B-04; `schema-propuesto.sql` §7.2 | (a) extender el `CHECK`: todo estado ≠ `unknown` exige `COALESCE(official_document_id, primary_source_document_id) IS NOT NULL` y `status_changed_at IS NOT NULL`; (b) dejarlo y validar en servidor | **(a)**; además, `suspended`/`cancelled` exigen `official_document_id` | Usuario |
| **DIS-04** | Fusión de duplicados: `PERSONAS` §3.2: solo `platform_admin`; `FICHAS` §1.3: "Deshacer" solo `platform_admin`; `INVENTARIO` SCR-02: el analista "propone", el admin confirma; pero `INVENTARIO` AC-08-04 dice "un `analyst` fusiona… se puede deshacer por `platform_admin`". En el SQL, **cualquier personal** puede modificar `merged_into_id` (política `UPDATE` de staff) | Los tres documentos de B y SQL §12 | (a) trigger que limite el cambio de `merged_into_id` a `platform_admin`/servicio; (b) permitir al analista fusionar y solo deshacer al admin | **(a)** (coincide con la matriz de roles de B). B debe corregir AC-08-04 | Usuario + B |
| **DIS-05** | **Retención de auditoría vs historial visible:** A propone conservar `audit_logs` ≥ 1 año y luego archivar/borrar la partición; B quiere historial de versiones de proyecto (RF-B-06) sin plazo | `MODELO-DATOS.md` §8.3; RF-B-06 | (a) no borrar particiones con historial de tablas de cara al usuario; (b) tabla/vista de historial de estados permanente (sería entidad 24 o columna jsonb) | Decidir tras la opinión legal sobre retención (L-11). Mientras tanto **no purgar** | Usuario + abogado |
| **DIS-06** | `PERSONAS` §3.2: "Ver estado de fuentes e ingesta" para `org_admin` **solo de su organización (O)**; en el modelo de A las fuentes y los jobs son **globales** (no pertenecen a un tenant) y `ingestion_jobs` es legible por `org_admin` de cualquier organización | `PERSONAS` §3.2; SQL §12.9 | (a) `ingestion_jobs` solo `platform_admin`; `org_admin` ve un estado agregado de frescura (sin detalle de jobs); (b) mantener | **(a)**: la ingesta es operación de plataforma, no de tenant | Usuario + B |
| **DIS-07** | `PERSONAS` §3.3 regla 4: "la última cuenta `platform_admin` no puede eliminarse ni degradarse sin transferencia previa". El SQL no la implementa (`app.set_user_role` no comprueba, y `ON DELETE CASCADE` desde Auth permite borrarla) | `PERSONAS` §3.3; SQL §10 | (a) comprobación en `set_user_role` + trigger `BEFORE DELETE/UPDATE` en `users`; (b) solo en servidor | **(a)** (defensa en profundidad) | A (no cambia el modelo); entra en T-INF-11 |
| **DIS-08** | `US-G-03`: "un usuario solo ve datos de su organización" y `AC-10-03`: "no aparecen… entidades de otra organización". En el modelo de A los datos de negocio (eventos, proyectos, licitaciones…) son **información pública compartida** y solo son por organización: `users`, `organizations` tipo tenant y `audit_logs`; por usuario: watchlists, preferencias, notificaciones | `BACKLOG-PRODUCTO` US-G-03; INVENTARIO AC-10-03; SQL §12 | (a) aclarar el criterio: "ve solo los usuarios y la auditoría de su organización" (con una sola organización en el MVP, S-04); (b) hacer los datos de negocio por tenant (cambio grande de modelo) | **(a)**, y B reescribe la aceptación | Usuario + B |
| **DIS-09** | `FICHAS` §3.3: `linked_project_id` "confirmado/inferido (se declara cuál)"; `permits.project_id` no tiene esa marca | `FICHAS` §3.3; SQL §7.3 | (a) columna `project_link_trust trust_layer`; (b) representar el vínculo inferido solo en `entity_relationships` | **(b)**: el FK `project_id` queda solo para vínculos confirmados | A |
| **DIS-10** | `AC-12-04` de B ("Por qué recibí esto" con la regla exacta): `notifications.preference_id` pasa a `NULL` si se borra la preferencia, y la regla puede haber cambiado | INVENTARIO AC-12-04; SQL §9.3 | (a) columna `rule_snapshot jsonb` en `notifications`; (b) no soportar | **(a)** | A (cambio pequeño; T-INF-11) |
| **DIS-11** | **Volumen:** B dimensiona RNF-02/03 con 100 000 eventos y 10 000 proyectos. La ficha OCP de DGCP indica **583 549 licitaciones y 646 180 contratos** (≈ 1,23 M filas) solo de contrataciones desde 2015 | `ESTRATEGIA-PRUEBAS.md` §10; OCP ficha 22 (en `FUENTES-RD.md` F-01) | (a) cargar solo los últimos N años `[PENDIENTE]`; (b) dimensionar la prueba de carga con ≈ 1,2 M filas en licitaciones/contratos | **(b)** si se carga el histórico completo; si no, declarar el recorte | Usuario |
| **DIS-12** | **Calendario de IA:** B coloca clasificación y verificación IA (US-A-02, A-11) en S3 (semanas 5–6) y "primer eval de extracción con IC" en G2 (semana 8). La cadena de A necesita antes: conector y documentos reales (T-ING-03…06), golden sets anotados (T-AI-03, **sin anotadores: B-015**) y tamaño suficiente (≥ 300 campos por tipo) | `backlog-producto.md` §5.2–5.3; `backlog-tecnico.md` §4 | Ver §3 (fila 7) | Mover US-A-02/A-11 a S4–S5 o aceptar clasificación por reglas en S3 | Usuario |
| **DIS-13** | **G2 (semana 8) exige datos reales de ≥ 1 fuente por módulo**, pero para el Módulo B (permisos y proyectos) no hay fuente verificada: MIMARENA sin formato conocido, CNE ilegible | `backlog-producto.md` §5.3 G2; `FUENTES-RD.md` | (a) G2 admite carga manual asistida para B; (b) retrasar G2 | **(a)**, con cobertura declarada | Usuario |
| **DIS-14** | **Orden de conectores de C:** B planifica BCRD en S3 (US-C-01) y Hacienda en S4 (US-C-02). La evidencia de A es la inversa: Crédito Público tiene buena base; BCRD tiene términos sin leer y XLS frágiles | `backlog-producto.md` §2 C; `FUENTES-RD.md` F-02/F-03 | (a) invertir S3/S4; (b) mantener | **(a)** | B |

### 2.1 Qué `[PENDIENTE A]` de B quedan cubiertos

| Pendiente de B | Dónde responde A | ¿Cerrado? |
|---|---|---|
| Contrato de `economic_events` y evidencia (INVENTARIO §4, FICHAS) | SQL §7.1, §7.9; `SISTEMA-IA` §3 | Propuesto (sin ejecutar) |
| Taxonomía de estados de proyecto/permiso | SQL enums `project_status`, `permit_status` | Propuesto; `[PENDIENTE SRS]`; ver DIS-03 |
| Fuente DGCP y esquema de licitaciones | `FUENTES-RD` F-01; SQL §7.4 | Parcial (falta T-SRC-01) |
| Fuentes BCRD/Hacienda/SIMV y reglas de tasa | F-02/F-03/F-06; `rate_kind` | Parcial; SIMV sin verificar |
| Esquema de oportunidades y flujo de revisión | SQL §7.8; trigger de publicación; `SISTEMA-IA` §4.4 | Propuesto |
| Entidad empresa (`organizations`, C-07) | DM-01 | **Pendiente del usuario** |
| Geolocalización (C-10) | `geographic_locations`; catálogos oficiales sin cargar | **No cerrado** |
| Índice de búsqueda | `tsvector` + `pg_trgm` (`MODELO-DATOS` §10) | Propuesto, sin medir (RNF-03) |
| Notificaciones y deduplicación | SQL §9.3 | Propuesto; ver DIS-10 |
| RLS y roles | `MODELO-DATOS` §7 | Propuesto, **sin probar** (B-007) |
| Auditoría | SQL §10 | Propuesto; ver DIS-05, DIS-07 |
| Política de conservación de originales (FK-05) | `sources.redistribution_allowed` (falso por defecto) y `retention_days`; sin licencia clara → solo enlace + hash + fecha de captura | Propuesto; `REQUIERE ABOGADO` |
| Criterio de "fuente autorizada" | §1.3 (c) | Propuesto |
| Identificador fiscal (RNC) | `organizations.tax_id` único por país; formato **no validado** | `[PENDIENTE]` |
| Fuentes autoalojadas / librería de gráficos (DS-D3) | A recomienda autoalojar tipografías (sin peticiones a terceros); **no elige librería de gráficos** (dependencia nueva, Regla 5) | Abierto |
| Contrato de métricas agregadas (SCR-01) | "Evento publicado (KPI)" = `publication_status = 'published'` AND `merged_into_id IS NULL` AND `is_demo = false`. **Hueco:** no existe una marca de tiempo de "publicado en la plataforma" para eventos (solo `published_at` de la fuente y `detected_at`); se propone usar `detected_at` como proxy hasta decidir | Parcial |
| Frescura por fuente | `now() − max(source_documents.detected_at)` por `source_id`, comparado con `sources.expected_freshness` | Propuesto |

---

## 3. Calendario: 168 días-persona frente a 16 semanas

### 3.1 Cifras, sin maquillar

| Concepto | A | B |
|---|---|---|
| Unidad | Días-persona (1 persona con dominio, 100 % dedicada) | Puntos relativos (Fibonacci) |
| Total declarado | **168,5 d** (≈ 34 semanas-persona) en la versión del turno anterior; **192,5 d** tras añadir habilitadores y tareas de conciliación (`backlog-tecnico.md` §9) | **450 pts** (Must 353 · Should 84 · Could 13); dentro de las 16 semanas 361 pts |
| Calibración | **Ninguna** | **Ninguna** (B-013) |
| Excluye | QA E2E/A11Y/carga/DAST, usabilidad, legal, piloto, F6/F7 | Habilitadores EN (sin estimar), legal, definición del equipo |

**Factor implícito, solo ilustrativo:** si los 192,5 d de A cubrieran los 361 pts de las 16 semanas, 1 punto ≈ **0,53 d**. Ese factor **no es una medición**: sale de dividir dos cifras sin calibrar y mezcla descomposiciones distintas (el trabajo de A incluye infraestructura que B no puntúa; las historias de B incluyen UI y pruebas que A solo estima parcialmente). Se usa solo para ver el orden de magnitud.

### 3.2 Tabla de conflicto

| # | Supuesto | Conflicto | Resolución propuesta | Impacto |
|---|---|---|---|---|
| 1 | **Equipo.** A: 1 persona a tiempo completo (sin definir); B: "capacidad `[PENDIENTE]`" (B-013) | Con 192,5 d: 1 persona ≈ **38,5 semanas**; 2 ≈ **19,3**; 3 ≈ **12,8**; 4 ≈ **9,6** (100 % de dedicación, 5 d/semana, sin QA ni F6/F7) | Definir el equipo antes de G0 y **no prometer 16 semanas sin él** | Con 1–2 personas, 16 semanas no alcanzan ni para los Must de ingeniería |
| 2 | **Capacidad que implica el plan de B.** S1–S7 = 70 días laborables para 361 pts | Con el factor ilustrativo: 192,5 d / 70 d ≈ **2,75 personas** de media; el sprint más cargado (S6, 63 pts ≈ 34 d) pide ≈ **3,4 personas**. Con un factor de dedicación del 70 % (**supuesto ilustrativo**, no medido) sube a ≈ 3,9 | Medir velocidad real en S1–S2 y recalibrar; reconocer que el plan de 16 semanas supone ≈ 3–4 desarrolladores | Si el equipo es menor, los Must no caben en S1–S7 |
| 3 | **Alcance.** B: 16 semanas = 65 Must + 8 pts de Should; A: incluye ~7 d de Should/Could (mapa 3 d, librería de cálculo 4 d) | Diferencia pequeña (≈ 3,6 % de 192,5) | Quitar de A lo que no sea Must si el usuario confirma el recorte: ≈ **185,5 d** | Marginal; no resuelve el conflicto principal |
| 4 | **Fases 6 y 7.** B reserva S8 (2 semanas) para endurecimiento y piloto y reparte QA continua; A no estima ninguna prueba E2E/A11Y/carga/DAST ni usabilidad ni piloto | Cualquier porcentaje de QA sería inventado. Aritmética de sensibilidad: **cada +10 % de A = +19 d** | Estimar QA con B cuando exista el plan de pruebas con herramientas aprobadas (B-014) | La cifra de 192,5 d es un **suelo**, no un total |
| 5 | **Primer conector (DGCP) en S2 (semana 4).** | Camino de A hasta la primera ingesta real: T-INF-01 (1) → T-INF-02 (1,5) → T-INF-09 (2) → T-ING-01 (4) → T-ING-03 (6) = **14,5 d** de ruta crítica, además de T-PRE-02/03 (aprobaciones y Supabase, `0,5`) y T-SRC-01 (0,5, en paralelo) | Posible con ≥ 2 personas **y** con T-PRE resueltas el día 1. Si T-PRE-03 (Supabase) se retrasa, retrasa todo | G1 (semana 4) en riesgo si B-003 sigue abierto |
| 6 | **Alertas y panel de revisión en S6.** | Coherente con A (T-WEB-08, T-AI-10, T-WEB-09, T-AI-11) | Mantener | — |
| 7 | **IA en S3–S5.** US-A-02/A-11 (S3), F-* (S5) | Ruta de A: conector (T-ING-03…06) → golden sets (T-AI-03, 8 d, **requiere anotadores: B-015**; ≥ 300 campos por tipo exige más trabajo del que A estimó al inicio) → Extraction (6) → clasificación (3) → Verification (5) = **≥ 22 d en serie después de tener documentos y anotadores**. Imposible terminar clasificación y verificación para la semana 6 | Mover US-A-02/A-11 a S4–S5 **o** usar clasificación por reglas en S3 y declarar "IA" más tarde; G2 sin "primer eval con IC" a la semana 8 (solo informe preliminar `NO CONCLUYENTE`) | G2/G3 cambian de criterio |
| 8 | **Módulo B con datos reales (G2).** | Sin fuente verificada (DIS-13) | G2 admite carga manual asistida (T-ING-06, 3 d) y declara "cobertura pendiente" donde no haya fuente | Evita declarar un hito que depende de una fuente inexistente |
| 9 | **Orden BCRD/Hacienda.** | DIS-14 | Invertir S3 y S4 | Reduce riesgo legal y de formato en S3 |
| 10 | **Volumen para RNF-02/03.** | DIS-11 | Dimensionar con ≈ 1,2 M filas de licitaciones/contratos o recortar el histórico cargado | La prueba de carga de B podría no representar la producción |
| 11 | **Legal.** Opinión legal L-01…L-12 | B asume revisión antes de G5 (semana 16); A necesita L-04/L-05 **antes de activar cualquier conector** (S2) | Adelantar T-PRE-05 a antes de G0/G1 | Sin ella, el conector de F-02/F-03/F-04 no se activa (`CHECK` en `sources`) |
| 12 | **Habilitadores sin estimar en B.** EN-01…EN-08 | A los estima en 18,5 d adicionales (§1.2) | Incluirlos en el plan de S1–S7 | Añade ≈ 10 % al esfuerzo |
| 13 | **G6/G7 fuera de las 16 semanas.** | Coincide con A: el piloto y RNF-19 concluyente no caben | Mantener | — |
| 14 | **Plazos de espera del usuario.** T-PRE-01…07 | Ninguno está en el calendario de B como actividad; la semana 1 de B empieza "solo después de aprobar G0" | Cronograma de G0 con fecha de cada decisión | Cada semana sin decisión desplaza todo |

### 3.3 Conclusión sin eufemismos

Con la información disponible: (1) **las 16 semanas solo son compatibles con ≈ 3–4 desarrolladores a tiempo completo y todo saliendo según lo previsto**; (2) con 1–2 personas, el MVP "de Must" necesita ≈ 19–39 semanas **antes** de QA, hardening y piloto; (3) ambas cifras (de A y de B) son hipótesis sin calibrar. **Recomendación:** definir el equipo (B-013), recalibrar tras S1–S2 con velocidad real y decidir entonces: recortar alcance, ampliar plazo o ampliar equipo. No recortar QA ni seguridad para cuadrar la fecha (R-B05 de B, ratificado por A).

---

## 4. Correcciones al SQL (`docs/datos/schema-propuesto.sql`)

> **Estado:** editadas a mano; **no ejecutadas** (B-007). Comprobaciones con `grep`: 26 `CREATE TABLE` = 23 entidades + 3 particiones de auditoría; 27 `ENABLE ROW LEVEL SECURITY` = 23 tablas + 3 particiones + 1 dentro de la función `create_audit_partition`.

| # | Orden de la Ronda 2 | Cambio |
|---|---|---|
| 1 | RLS en las 3 particiones de `audit_logs` y revocar grants directos | Tras crear `audit_logs_2026_11`, `audit_logs_2026_12` y `audit_logs_default`: `ALTER TABLE … ENABLE ROW LEVEL SECURITY` en cada una y `REVOKE ALL … FROM PUBLIC, anon, authenticated`, de forma explícita. **Añadido (no pedido):** función `app.create_audit_partition(date)` que crea la partición futura, activa RLS y revoca grants en un solo paso (ejecutable solo por `service_role`); limitación de Postgres con la partición `DEFAULT` documentada en el SQL. Consultas de comprobación 0b añadidas al final |
| 2 | `users_auth_fk` obligatorio, separado "solo Supabase" | Nueva sección **4.2 "SOLO SUPABASE — PASO OBLIGATORIO"**: bloque `DO` que crea la FK `users.id → auth.users(id) ON DELETE CASCADE` **siempre** que exista `auth.users`. Si no existe (Postgres plano), la migración **falla** (`RAISE EXCEPTION`) salvo que se declare explícitamente `SET LOCAL app.allow_plain_postgres = 'on'` para pruebas (entonces solo avisa). Consulta de comprobación incluida. Es **fail-closed**: no se puede desplegar sin la FK por descuido |
| 3 | Confirmar RNF-02/03 | Ver §4.3 |
| — | **Añadido por discrepancia con B (punto 8d):** `timezone_assumed boolean NOT NULL DEFAULT false` en `source_documents`, `economic_events` y `public_tenders` | |

### 4.1 Cambios que **no** se hicieron (a la espera de decisión)

DIS-02, DIS-03, DIS-04, DIS-06, DIS-07, DIS-09 y DIS-10 requieren cambios al SQL, pero alteran el modelo o la política de acceso y la orden del orquestador no los pidió. Quedan **propuestos** y agrupados en la tarea **T-INF-11** (2 d). No se aplicaron para no introducir sin pruebas cambios de seguridad que el usuario no ha aprobado.

### 4.2 Riesgos de estas correcciones

- **No hay Postgres para probarlas.** Un error de sintaxis en el bloque `DO` o en la función de particiones haría fallar toda la transacción (comportamiento deseado: nada a medias), pero no se habría detectado hoy.
- La función `create_audit_partition` usa `SECURITY DEFINER` con `search_path` vacío; hay que revisar su propietario y los privilegios en Supabase `[VERIFICAR Sprint 1]`.
- Enable RLS en una partición **no** protege el acceso a través del padre (eso lo hacen las políticas del padre); protege el acceso directo a la partición.

### 4.3 RNF-02 / RNF-03: ¿100 000 eventos reales o dataset de prueba?

**Lectura de los documentos de B:** es un **dataset de prueba sembrado**, no una previsión de volumen real:

- `REQUISITOS-Y-TRAZABILIDAD.md` RNF-02: "…con 100 000 eventos y 10 000 proyectos", medido con k6 "contra staging con dataset sembrado".
- `ESTRATEGIA-PRUEBAS.md` §4: "p. ej. «100 000 eventos para RNF-02/03»" como dataset sintético con semilla fija; §10: "Dataset: sintético… se documenta cómo se generó".

**Lo que A puede añadir:** el volumen **real** de eventos es desconocido (nadie lo ha medido). Pero el de licitaciones/contratos **sí tiene un orden de magnitud documentado**: 583 549 licitaciones y 646 180 contratos en el registro de OCP para DGCP (≈ 1,23 M filas desde 2015, **no verificado en la fuente primaria**). Por tanto, el dataset de B representa bien a `economic_events`, pero **subestima** `public_tenders` y `contracts` si se carga el histórico completo (DIS-11). B debe confirmar esta lectura; A no la da por cerrada hasta que B responda.

---

## 5. Cambios realizados en los documentos de A en esta ronda

| Archivo | Cambio |
|---|---|
| `docs/datos/schema-propuesto.sql` | §4.2 (`users_auth_fk`), RLS/REVOKE en particiones y `create_audit_partition`, `timezone_assumed` (×3), consultas de comprobación |
| `docs/ia/SISTEMA-IA.md` | `$defs.evidence` y lista de esquemas faltantes; tamaños de golden sets alineados con B; GS-NEG; regla estadística de Wilson (§7.2); puerta P1 |
| `docs/sprint-0/backlog-tecnico.md` | §9: T-EN-01/03/06/07/08, T-WEB-13, T-INF-11 y nuevo total ≈ 192,5 d |
| `docs/sprint-0/CONCILIACION-A-B.md` | Este documento |
| `docs/sprint-0/ESTADO-VENTANA-A.md`, `BANDEJA.md` | Estado y respuesta a B |

**No se modificó:** `PROMPT-MAESTRO`, `CONTRATO-TRABAJO`, `docs/requisitos`, `package.json`, el enum `trust_layer`, ni ningún archivo de B. No se hizo `git commit`. No se instaló nada.

## 6. Riesgos abiertos de la conciliación

| ID | Riesgo | Mitigación |
|---|---|---|
| RC-01 | El usuario lee "168 d" o "16 semanas" como compromiso | Ambas son hipótesis sin calibrar; §3 lo dice |
| RC-02 | B-013 (equipo) sin resolver invalida ambos calendarios | Decisión del usuario antes de G0 |
| RC-03 | DIS-02/03 cambian el modelo después de que B haya escrito sus fichas | Resolver antes de G0; B ya adoptó los enums de A |
| RC-04 | Cambios de seguridad (DIS-04, 06, 07) sin probar | Entran en T-INF-11 con casos negativos (T-INF-03) |
| RC-05 | Golden sets sin anotadores (B-015) → evals `NO CONCLUYENTE` | Designar anotadores en G0 |
| RC-06 | Licencias de fuentes sin aclarar → no hay fuente "autorizada" | T-PRE-05 (abogado) antes de G1 |

## 7. Decisiones que necesito del usuario (resumen)

1. **Equipo y calendario (B-013):** ¿cuántas personas? ¿recortar alcance, ampliar plazo o ampliar equipo? (§3)
2. **Verificación en otras entidades (DIS-02)** y **documento por estado (DIS-03).**
3. **Fusión de duplicados solo por `platform_admin` (DIS-04)**, **visibilidad de `ingestion_jobs` (DIS-06)**, **última cuenta admin (DIS-07).**
4. **Criterio de "datos por organización" (DIS-08)** y **retención del historial (DIS-05).**
5. **Criterio de "fuente autorizada" (§1.3 c)** y **orden BCRD/Crédito Público (DIS-14).**
6. **Volumen del dataset de prueba (DIS-11)** y **G2 con carga manual para el Módulo B (DIS-13).**
7. Las decisiones previas: DM-01, DM-03, ADR-0002 y ADR-0005, abogado, proyecto Supabase.
