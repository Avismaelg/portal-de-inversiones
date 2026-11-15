# Fichas clave — AviTech Investment Intelligence

| Campo | Valor |
|---|---|
| Documento | `docs/ux/FICHAS-CLAVE.md` |
| Versión | 0.4.0 (Sprint 0, Ronda 5) |
| Fecha | 2026-11-15 |
| Autor | Ventana B |
| Estado | **BORRADOR PARA APROBACIÓN** |
| Fuentes | Prompt Maestro §4 (módulos A–F), §5, §9; `docs/ux/SISTEMA-DISENO.md` (capas, badges, componentes); `docs/producto/REQUISITOS-Y-TRAZABILIDAD.md` |
| Dependencias | Ventana A: esquemas de `economic_events`, `projects`, `permits`, `public_tenders`, `financial_instruments`, `investment_opportunities`, `evidence`, `verification_records`. **Ninguno validado aún** (`[PENDIENTE A]`). |

> **Cómo leer este documento.** Cada ficha especifica **qué se muestra, en qué orden y con qué garantías**. Los nombres de campo (`snake_case`) son propuestas alineadas con las entidades del Prompt Maestro §8; **no son el esquema**. Si la Ventana A cambia un campo, la ficha se ajusta, no al revés. Los ejemplos de pantalla son **ilustrativos** y usan marcadores `[EJEMPLO]`; no contienen datos reales.

---

## 0. Reglas comunes a todas las fichas

| ID | Regla | Origen |
|---|---|---|
| FC-01 | **Cifra con fuente.** Toda cifra (monto, tasa, plazo, capital, fecha límite) se muestra con `MetricValue`: valor, unidad/moneda, fuente (enlace) y fecha. Si falta cualquiera, se muestra **“No disponible”** y el motivo. Nunca `0`, `—` ni estimaciones silenciosas. | RN-01, RN-06 |
| FC-02 | **Capa visible.** Cada bloque lleva `TrustLayerBadge`: `Confirmado`, `Análisis IA` o `Inferencia` (SISTEMA-DISENO §6). Un bloque no mezcla capas. | RN-02 |
| FC-03 | **Fuente original a un clic.** Cada ficha tiene un bloque “Fuente original” con institución, título del documento, URL oficial, `published_at`, `captured_at` y hash corto. Abre en pestaña nueva con `rel="noopener noreferrer"`. | RF-A-05 |
| FC-04 | **Fechas.** `published_at` (la fuente), `detected_at` (el sistema), `updated_at` (última modificación) y, en eventos, `released_at` (“Publicado en la plataforma”, fijado al publicar; propuesto por A en `economic_events`). UTC almacenado; visualización `America/Santo_Domingo`. | RF-A-06, RN-09 |
| FC-05 | **Estado de verificación explícito** (`verified`, `partially_verified`, `disputed`, `unverifiable`) con motivo y fecha. | RF-A-11 |
| FC-06 | **Historial visible** (cuándo/qué cambió, con enlace a la versión anterior). El **actor** solo se muestra a `analyst`+; el `viewer` ve el historial público sanitizado (PERSONAS §3.3). | RF-A-12, RF-B-06 |
| FC-07 | **Demo etiquetado.** `is_demo` → `DemoRibbon`; excluido de KPIs. | RN-08 |
| FC-08 | **Sin recomendación.** Ninguna ficha usa “recomendado”, “compra”, “seguro”, “garantizado” ni promete rendimiento. Aviso `DisclaimerNote` donde aplique. | RN-04, RN-05 |
| FC-09 | **Cobertura declarada.** Si la fuente no publica un campo, la ficha lo dice (“Esta fuente no publica montos”), no lo deja vacío. | V-10 |
| FC-10 | **Permisos.** `viewer` ve solo `published`; borradores y notas internas requieren `analyst`+ (verificado en servidor y RLS). | PERSONAS §3.3 |
| FC-11 | **URL estable y compartible.** Cada ficha tiene URL canónica; “Copiar enlace” copia la URL de la ficha, no de un dato aislado. | J-04 |
| FC-13 | **Sin contenido íntegro de fuentes.** Los lectores no reciben `extracted_text` ni el archivo salvo `redistribution_allowed` (MODELO-DATOS §7.1): la ficha muestra “Fuente original ↗” y la **cita literal** necesaria; la “copia capturada” solo se ofrece si la fuente lo permite. Mostrar citas de fuentes sin licencia explícita es una pregunta legal abierta (L-04). | A: MODELO-DATOS §7.1, SEGURIDAD T-10 |
| FC-12 | **Accesibilidad.** Orden de lectura = orden visual; encabezados jerárquicos; cada enlace a documento con nombre accesible completo; contenido operable con teclado. | RNF-29/30 |

### 0.1 Orden visual universal de una ficha

1. **Cabecera:** título, badges de estado y capa, `DemoRibbon`, acciones (Guardar, Crear alerta, Copiar enlace).
2. **Resumen de una línea** (capa explícita).
3. **Hechos clave** (`Confirmado`) con `MetricValue`.
4. **Fuente original y evidencia** (`EvidencePanel`).
5. **Análisis IA** (si existe), con modelo/versión/revisión.
6. **Inferencia comercial** (si existe), siempre al final y diferenciada.
7. **Relacionados** (entidades vinculadas, `confirmed` vs `inferred`).
8. **Historial y verificación.**
9. **Aviso legal** (cuando aplique).

---

## 1. Ficha de evento económico

**Entidad:** `economic_events` (+ `source_documents`, `verification_records`). **Pantalla:** SCR-02 (detalle). **Requisitos:** RF-A-03, A-05, A-06, A-07, A-10, A-11, A-12.

### 1.1 Campos

| Campo | Tipo (propuesto) | Capa | Obligatorio | Notas |
|---|---|---|---|---|
| `title` | texto | Confirmado (si procede del documento) / IA (si es reformulado) | Sí | Si el titular lo escribió la IA, se etiqueta `Análisis IA`. |
| `summary` | texto ≤ 400 caracteres | `Análisis IA` | Sí | Con modelo, versión y revisión. |
| `key_facts[]` | lista | `Confirmado` | Sí (≥ 1) | Cada hecho con su cita (`evidence_id`). |
| `event_type` | enumerado | `Análisis IA` o `Confirmado` | Sí | `[PENDIENTE A: taxonomía]`. |
| `sectors[]` | de 11 categorías | `Análisis IA` + corrección humana | Sí | Etiqueta “clasificado por IA” si no hay revisión. |
| `organizations[]` | relación con `confirmed`/`inferred` | Según relación | No | Cada vínculo declara cómo se obtuvo (RF-A-07). |
| `locations[]` | provincia/municipio | Según fuente | No | Sin geocodificación inventada. |
| `published_at`, `detected_at`, `updated_at` | fecha-hora UTC | Confirmado/Sistema | Sí | FC-04. |
| `verification_status` + `verification_reason` + `verified_at` | enumerado + texto | Sistema | Sí | FC-05. |
| `sources[]` (documentos) | lista | Confirmado | Sí (≥ 1) | Institución, URL, `captured_at`, hash. |
| `evidence[]` | lista de citas | Confirmado | Sí (≥ 1) | Fragmento, página/sección, enlace. |
| `related_events[]` | lista | Sistema | No | Duplicados fusionados y relacionados (con motivo). |
| `related_opportunities[]` | lista | `Inferencia` | No | Solo si hay oportunidad publicada. |
| `change_history[]` | lista | Sistema | Sí | Quién/cuándo/campo/antes/después. |
| `is_demo` | boolean | — | Sí | FC-07. |

### 1.2 Jerarquía visual

```
┌───────────────────────────────────────────────────────────────────┐
│ [Verificado]  [DEMO?]                           Guardar  Alerta ⋯ │
│ Título del evento (h1)                                            │
│ Sector · Provincia · Organización · Publicado 12 nov 2026 (AST)   │
├───────────────────────────────────────────────────────────────────┤
│ ▌Confirmado — Hechos clave                                        │
│   • Hecho 1 …………………………………………  [cita 1]                        │
│   • Hecho 2 …………………………………………  [cita 2]                        │
├───────────────────────────────────────────────────────────────────┤
│ Fuente original: Institución · Título del documento · 12/11/2026  │
│   Abrir documento original ↗     Capturado 12/11 14:30 · hash 9f3a│
├───────────────────────────────────────────────────────────────────┤
│ ▌Análisis IA — Resumen (modelo X v.Y · 12/11 · sin revisión)      │
├───────────────────────────────────────────────────────────────────┤
│ Relacionados: organizaciones · proyectos · licitaciones           │
│ Oportunidades derivadas (Inferencia) →                            │
├───────────────────────────────────────────────────────────────────┤
│ Historial · Verificación (motivo, fecha)                          │
└───────────────────────────────────────────────────────────────────┘
```
`[ilustrativo; sin datos reales]`

### 1.3 Fuente, evidencia, historial y verificación

- **Fuente original:** siempre visible sin desplazarse en escritorio (parte superior del panel lateral).
- **Evidencia:** `EvidencePanel` (SISTEMA-DISENO §5.5) con fragmento citado y enlace al documento. Un hecho clave sin cita no se renderiza como `Confirmado`: baja a `Análisis IA` con aviso “Sin cita”.
- **Historial:** cronología de cambios (clasificación corregida, fusión de duplicados, cambio de estado de verificación). Las fusiones muestran “Deshacer” solo a `platform_admin`.
- **Verificación:**
  - `verified`: documento oficial auténtico (la ausencia de segunda fuente **no** invalida, PM §5).
  - `partially_verified`: parte de los hechos con respaldo.
  - `disputed`: fuentes en conflicto; se muestran lado a lado **solo si un `opportunity_manager+` lo publicó deliberadamente** (P0); mientras está en cola es invisible para `viewer`.
  - `unverifiable`: sin documento comprobable; **no puede originar oportunidades** (RF-F-01).
  - `pending` (valor inicial definido por A, `verification_status`): aún no verificado; se muestra “Pendiente de verificación” y **no** puede publicarse (A impone `CHECK`).

### 1.4 CTA (por prioridad)

| Prioridad | CTA | Rol | Condición |
|---|---|---|---|
| 1 | **Abrir documento original** | Todos autenticados | Siempre, si hay URL. |
| 2 | **Guardar** | `viewer`+ | — |
| 3 | **Crear alerta** (con este sector/organización) | `viewer`+ | — |
| 4 | **Ver oportunidades derivadas** | `viewer`+ | Solo si existen publicadas. |
| 5 | **Corregir clasificación / Marcar duplicado** | `analyst`+ | Con motivo; auditado. |

### 1.5 Estados vacíos y límite

| Situación | Tratamiento |
|---|---|
| Sin evidencia almacenada | “Sin evidencia verificable.” No se permite generar oportunidad. |
| Documento no accesible | Se muestran URL y fecha de captura; “No pudimos abrir el documento” (no se simula lectura). |
| Sin organizaciones | “No se identificaron organizaciones.” (no es un error). |
| Sin ubicación | “La fuente no publica ubicación.” |
| Sin oportunidades derivadas | “Aún no hay oportunidades derivadas de este evento.” |
| Evento fusionado en otro | Redirección al evento principal con aviso “Este evento se fusionó el [fecha]”. |
| Demo | `DemoRibbon` + “Contenido de demostración”. |

### 1.6 Criterios de aceptación

- **AC-FC-E-01** Dado un evento `published`, cuando se abre la ficha, entonces muestra ≥ 1 cita, el documento original, las tres fechas y el estado de verificación.
- **AC-FC-E-02** Dado un hecho clave sin cita, cuando se renderiza, entonces no lleva la etiqueta `Confirmado`.
- **AC-FC-E-03** Dado un evento `disputed` **publicado deliberadamente** (P0), cuando un `viewer` lo abre, entonces se muestran la etiqueta “En disputa” y las fuentes en conflicto, y no se genera un único resumen que las mezcle.
- **AC-FC-E-05** Dado un evento `disputed` o `partially_verified` **en cola**, cuando un `viewer` solicita su URL, entonces recibe 404/403 sin filtrar contenido; si su verificación empeora tras publicarse, vuelve a la cola y deja de ser visible hasta nueva publicación humana.
- **AC-FC-E-04** Dado un `viewer`, cuando solicita un evento en borrador por URL, entonces recibe 403/404 sin filtrar contenido.

**Dependencias A:** contrato de evidencia, estados de verificación, política de conservación del documento original (licencia).

---

## 2. Ficha de oportunidad

**Entidad:** `investment_opportunities` + `evidence`. **Pantalla:** SCR-07 (detalle). **Requisitos:** RF-F-01…RF-F-14.

### 2.1 Campos (los 11 del PM §4-F más metadatos)

| Campo | Capa | Obligatorio | Regla |
|---|---|---|---|
| `title` | `Inferencia` | Sí | Formulado como hipótesis (“Posible necesidad de…”), no como hecho. |
| `opportunity_type` | `Inferencia` | Sí | Uno de los 11 tipos del PM. |
| `description` | `Análisis IA` + `Inferencia` | Sí | Separar lo que dice el documento de lo que se infiere. |
| `origin_fact` (hecho que la origina) | `Confirmado` | Sí | Enlace al evento principal (`primary_event_id`, C-08); solo `verified`/`partially_verified` (RF-F-01). |
| `evidence[]` | `Confirmado` | Sí (≥ 1) | Sin evidencia no se publica (RF-F-04). |
| `beneficiary_sectors[]` | `Inferencia` | Sí | — |
| `location` | `Confirmado` si viene del evento | No | “No disponible” si la fuente no lo publica. |
| `estimated_capital` | Según base | No | Solo con base justificable; muestra supuestos y fuente; si no, “No disponible” (RF-F-05). |
| `participation_requirements[]` | `Confirmado` si lo publica la fuente / `Inferencia` | No | Sin interpretar normativa. |
| `risks[]` | `Análisis IA` + `Inferencia` | Sí (≥ 1) | Visibles **antes** de cualquier CTA (RF-F-07). |
| `time_horizon` | `Inferencia` | Sí | Con unidad e incertidumbre (RF-F-08). |
| `confidence` (0–100) + `confidence_explanation` | `Análisis IA` | Sí | Metodología documentada; no es probabilidad de éxito (RF-F-06). |
| `next_steps[]` | `Inferencia` | Sí | Accionables, con enlace a fuente oficial. |
| `status` (`draft`/`in_review`/`published`/`rejected`) | Sistema | Sí | Flujo RF-F-11. |
| `reviewer`, `reviewed_at`, `model_name`, `model_version`, `prompt_version` | Sistema | Sí al publicar | RN-12. |
| `version`, `previous_versions[]`, `updated_flag` | Sistema | Sí | RF-F-14. |
| `is_demo` | — | Sí | FC-07. |

### 2.2 Jerarquía visual

```
┌───────────────────────────────────────────────────────────────────┐
│ [Inferencia] [Publicada · Revisada por X, 12/11]  [DEMO?]         │
│ Posible necesidad de … (h1)                  Guardar  Alerta ⋯    │
│ Tipo · Sector beneficiado · Ubicación · Horizonte                 │
├───────────────────────────────────────────────────────────────────┤
│ ▌Confirmado — Hecho que la origina                                │
│   Evento: … [Verificado] · Fuente original ↗ · [cita]             │
├───────────────────────────────────────────────────────────────────┤
│ ⚠ Riesgos y condiciones   (antes de cualquier acción)             │
│   • Riesgo 1 …   • Requisito de participación …                   │
├───────────────────────────────────────────────────────────────────┤
│ ┆Inferencia ┆ Descripción de la oportunidad (cursiva = hipótesis) │
│ ┆ Base del razonamiento · Confianza 62/100 · “No es una prob.”    │
│ ┆ Capital estimado: No disponible — la fuente no lo publica       │
├───────────────────────────────────────────────────────────────────┤
│ Próximos pasos posibles · Ver requisitos en la fuente ↗           │
├───────────────────────────────────────────────────────────────────┤
│ Evidencia (EvidencePanel) · Versiones · Feedback útil/no útil     │
└───────────────────────────────────────────────────────────────────┘
```
`[ilustrativo; los valores son marcadores]`

### 2.3 Fuente, evidencia, historial y verificación

- **Evidencia:** cada afirmación relevante enlaza a una cita; las cifras muestran su cita al lado (RN-06). Una cifra sin cita **bloquea la publicación** (RF-F-10) y, si llegara a verse, se sustituye por “No disponible”.
- **Historial/versiones:** indicador “Actualizada el [fecha]” con enlace a la versión anterior y diff de campos cuando cambia el evento originador (RF-F-14).
- **Verificación:** estado del **evento originador** visible; si el evento pasa a `disputed`, la oportunidad se marca “Revisión requerida” y deja de aparecer en alertas nuevas `[PROPUESTO]`.
- **Trazabilidad de IA:** pie con modelo, versión, fecha y revisor (RN-12). Enlace “Cómo se calcula la confianza”.
- **Revisión:** “Revisada por [nombre/rol] el [fecha]”; sin revisión humana no puede estar `published` en el MVP (RN-07).

### 2.4 CTA

| Prioridad | CTA | Rol | Condición |
|---|---|---|---|
| 1 | **Ver evidencia de origen** | Todos | Siempre. |
| 2 | **Guardar en watchlist** (+ nota privada) | `viewer`+ | — |
| 3 | **Ver requisitos en la fuente** | Todos | Si existe URL oficial. |
| 4 | **Marcar como útil / no útil** | `viewer`+ | RF-F-13. |
| 5 | **Crear alerta de cambios** | `viewer`+ | — |
| — | *Borrador:* **Editar**, **Enviar a revisión** | `analyst`+ | Solo en `draft`. |
| — | *En revisión:* **Publicar**, **Rechazar (con motivo)** | `opportunity_manager`+ | Bloqueado si falta cita o cifra sin fuente. |

> **No existen CTA** como “Invertir”, “Contratar”, “Comprar”, “Contactar proveedor” ni datos de contacto de terceros no verificados (FC-08).

### 2.5 Estados vacíos y límite

| Situación | Tratamiento |
|---|---|
| Sin capital estimado | “No disponible: no hay una base documentada para estimarlo.” |
| Sin requisitos publicados | “La fuente no publica requisitos de participación. Consulte la fuente oficial.” |
| Confianza baja (umbral `[PENDIENTE]`) | Aviso “Confianza baja: revise la evidencia antes de decidir.” |
| Evento originador disputado | Banner “Revisión requerida: el hecho que origina esta oportunidad está en disputa.” |
| Oportunidad rechazada | Solo visible a `analyst`+ con motivo; no aparece a `viewer`. |
| Sin feedback aún | Controles neutros, sin contador. |

### 2.6 Criterios de aceptación

- **AC-FC-O-01** Dada una oportunidad publicada, cuando se abre, entonces muestra hecho originador, ≥ 1 cita, riesgos, horizonte, confianza con explicación y próximos pasos, y los riesgos aparecen antes que cualquier CTA.
- **AC-FC-O-02** Dada una oportunidad con una cifra sin cita, cuando se intenta publicar, entonces la publicación se bloquea y se indica la cifra.
- **AC-FC-O-03** Dado un evento `disputed`/`unverifiable`, cuando se intenta crear una oportunidad, entonces el sistema lo impide.
- **AC-FC-O-04** Dado un `viewer`, cuando solicita una oportunidad en borrador, entonces no recibe contenido en el payload.
- **AC-FC-O-05** Dada una oportunidad `inference`, cuando se muestra, entonces lleva la frase “No es un contrato ni una garantía” y ningún CTA financiero.

**Dependencias A:** esquema de oportunidad/evidencia, verificador de grounding, metodología de confianza, versionado, política de revisión.

---

## 3. Ficha de proyecto / permiso

**Entidades:** `projects`, `permits`. **Pantallas:** SCR-03 (proyecto), SCR-04 (permiso). **Requisitos:** RF-B-01…RF-B-11.

### 3.1 Campos del proyecto (los 12 del PM §4-B)

| Campo | Capa | Obligatorio | Regla |
|---|---|---|---|
| `name` | Confirmado | Sí | Tal como aparece en el documento. |
| `promoter` (empresa promotora) | Confirmado (vínculo a `organizations`) | No | Si el documento no la nombra: “No disponible”. |
| `location` (provincia/municipio) | Confirmado | No | Coordenadas solo si la fuente las publica. |
| `sector` | `Análisis IA` + corrección humana | Sí | — |
| `description` | Confirmado (extracto) + `Análisis IA` (resumen) | No | Separados. |
| `announced_amount` + `currency` + `reference_year` | Confirmado | No | Solo si se publica; cita obligatoria (RF-B-08). |
| `administrative_status` | Confirmado | Sí | Ver taxonomía; **solo con documento** para estados altos (RF-B-04). |
| `authorization_date` | Confirmado | No | Solo con documento de aprobación. |
| `responsible_institution` | Confirmado | Sí | — |
| `official_document[]` | Confirmado | Sí (≥ 1) | Enlace y metadatos. |
| `change_history[]` | Sistema | Sí | RF-B-06. |
| `potential_opportunities[]` | `Inferencia` | No | Vinculadas a oportunidades publicadas (RF-B-09). |

### 3.2 Estados administrativos y reglas de transición

| Estado | Texto | Documento mínimo requerido | Prohibido inferir de |
|---|---|---|---|
| `announced` | Anunciado | Cualquier anuncio oficial o referencia identificable | Rumores, notas sin fuente |
| `permit_applied` | Permiso solicitado | Registro/acuse oficial de solicitud | Mención en prensa |
| `permit_approved` | Permiso aprobado | **Documento de aprobación** (resolución, licencia) | **Aparecer en un registro** (RN-03) |
| `under_construction` | En construcción | Documento o aviso de inicio de obra `[PENDIENTE A: qué fuente lo acredita]` | Imágenes, rumores |
| `operating` | En operación | Documento de entrada en operación | — |
| `suspended` / `cancelled` | Suspendido / Cancelado | Documento oficial | — |
| `unknown` | Estado desconocido | Ninguno | — |

- **Regla dura:** sin documento de aprobación, el máximo es `permit_applied` o `announced` (RF-B-04).
- Cada transición registra documento, fecha y origen. Una **regresión** (p. ej. aprobado → suspendido) se muestra en el historial de forma destacada.
- Si hay documentos contradictorios sobre el estado, se muestra el más reciente con aviso y ambos en el historial.

### 3.3 Campos del permiso

| Campo | Capa | Obligatorio |
|---|---|---|
| `permit_type` (ambiental, energético, concesión, etc.) | Confirmado | Sí |
| `file_number` (expediente) | Confirmado | No (“No disponible” si no existe) |
| `issuing_institution` | Confirmado | Sí |
| `applicant` / `holder` | Confirmado | No |
| `status` (`requested`, `under_review`, `approved`, `denied`, `expired`, `revoked`, `unknown`; enumeración propuesta por A en `schema-propuesto.sql`, `[PENDIENTE SRS]`) | Confirmado | Sí |
| `filed_at`, `decided_at`, `valid_until` | Confirmado | No |
| `conditions[]` (condiciones del permiso) | Confirmado (extracto) | No |
| `official_document[]` | Confirmado | Sí (≥ 1) |
| `linked_project_id` | Confirmado/inferido | No (se declara cuál) |

### 3.4 Jerarquía visual (proyecto)

```
┌───────────────────────────────────────────────────────────────────┐
│ [Permiso solicitado]  [Cobertura parcial]  [DEMO?]   Guardar ⋯    │
│ Nombre del proyecto (h1)                                          │
│ Promotor · Provincia · Sector · Institución responsable           │
├───────────────────────────────────────────────────────────────────┤
│ Línea de estado:  ● Anunciado → ● Solicitado → ○ Aprobado → ○ …   │
│  (cada punto con fecha y documento; “sin documento” si falta)      │
├───────────────────────────────────────────────────────────────────┤
│ ▌Confirmado: Monto anunciado: No disponible (la fuente no lo …)   │
│   Fecha de autorización: No aplica (aún no aprobado)              │
│   Documento oficial ↗  Expediente: [EJEMPLO]                      │
├───────────────────────────────────────────────────────────────────┤
│ ▌Análisis IA: resumen · sector · modelo/versión                   │
├───────────────────────────────────────────────────────────────────┤
│ Permisos asociados · Relacionados (no es el mismo proyecto)       │
│ Oportunidades potenciales (Inferencia) →                          │
├───────────────────────────────────────────────────────────────────┤
│ Historial de versiones · Verificación                             │
└───────────────────────────────────────────────────────────────────┘
```
`[ilustrativo]`

### 3.5 Fuente, evidencia, historial y verificación

- Cada campo de la ficha puede abrir su evidencia; el estado lleva el documento que lo respalda.
- **Historial de versiones** (RF-B-06): estado, monto, descripción y documentos, con fecha y origen del cambio; los cambios de estado se destacan.
- **Verificación:** mismo modelo que eventos; un proyecto `permit_approved` sin documento **no es posible** (el componente rechaza el estado).
- **Relacionados** (RF-B-11): mismos promotor/ubicación/expediente, etiquetados “Relacionado”, nunca fusionados automáticamente.

### 3.6 CTA

| Prioridad | CTA | Condición |
|---|---|---|
| 1 | **Abrir documento oficial** | Siempre |
| 2 | **Guardar** / **Seguir cambios de estado** | `viewer`+ |
| 3 | **Ver oportunidades potenciales** | Si existen publicadas |
| 4 | **Ver empresa promotora** | Si hay vínculo |
| — | **Editar ficha / Proponer corrección** | `analyst`+ |

### 3.7 Estados vacíos y límite

| Situación | Tratamiento |
|---|---|
| Sin monto | “Monto anunciado: No disponible. La fuente no lo publica.” |
| Sin promotor | “Promotor: No disponible.” (no “desconocido”, para no sugerir investigación propia) |
| Tipo sin fuente validada | “Cobertura pendiente para este tipo de permiso.” (RF-B-01) |
| Sin permisos asociados | “No se conocen permisos asociados a este proyecto.” |
| Sin coordenadas | Ubicación a nivel de provincia; en el mapa aparece agrupado y así se indica. |
| Estado `unknown` | “No hay documento que acredite el estado actual.” |

### 3.8 Criterios de aceptación

- **AC-FC-P-01** Dado un proyecto `permit_applied`, cuando se abre la ficha, entonces no aparece la palabra “aprobado” como estado y se muestra la institución y el expediente si existen.
- **AC-FC-P-02** Dado un intento de establecer `permit_approved` sin documento, cuando se guarda, entonces el sistema lo rechaza con un mensaje que cita la regla.
- **AC-FC-P-03** Dado un proyecto con cambio de estado, cuando se consulta el historial, entonces se ve el estado anterior, el nuevo, el documento y la fecha.
- **AC-FC-P-04** Dado un monto sin moneda o sin cita, cuando se renderiza, entonces se muestra “No disponible”.

**Dependencias A:** taxonomía de estados y permisos, fuente del Ministerio de Medio Ambiente y otras (no validadas), normalización geográfica, deduplicación.

---

## 4. Ficha de licitación

**Entidades:** `public_tenders`, `contracts`. **Pantalla:** SCR-05. **Requisitos:** RF-D-01…RF-D-10.

### 4.1 Campos

| Campo | Capa | Obligatorio | Regla |
|---|---|---|---|
| `process_code` | Confirmado | Sí | Identificador oficial. |
| `title`, `description` | Confirmado (extracto) | Sí | Resumen en lenguaje claro = `Análisis IA`, aparte. |
| `contracting_institution` | Confirmado | Sí | — |
| `procurement_type` / modalidad `[PENDIENTE A]` | Confirmado | No | — |
| `sector` | `Análisis IA` + corrección humana | Sí | RF-D-06. |
| `location` | Confirmado | No | — |
| `budget` + `currency` | Confirmado | No | “No disponible” si no se publica (RF-D-03). |
| `published_at`, `deadline_at` (con zona), `opening_at` | Confirmado | Sí (`deadline_at`) | Cuenta atrás con zona horaria (RF-D-02). |
| `status` (enumeración de A: `planned`, `open`, `closed`, `awarded`, `cancelled`, `unknown`) + `closing_soon` **derivado en la UI** de `deadline_at` | Sistema | Sí | `closing_soon` = `open` con cierre ≤ 72 h `[PROPUESTO]`; no se almacena. |
| `requirements_summary` | `Análisis IA` | No | Con enlace al pliego; **no interpreta** requisitos legales. |
| `documents[]` (pliegos, adendas) | Confirmado | Sí (≥ 1 si existen) | Sin copiar íntegro si la licencia no lo permite (RF-D-10). |
| `award` (proveedor, monto adjudicado, fecha, documento) | Confirmado | Si adjudicada | RF-D-04. |
| `smb_flag` (“oportunidad para PyME”) | `Análisis IA` (criterios explícitos y configurables) | No | No es recomendación (RF-D-07, `[PENDIENTE SRS]`). |
| `subcontracting_hypotheses[]` | `Inferencia` | No | Con base, confianza y aviso; no es contrato (RF-D-08). |
| `change_history[]` | Sistema | Sí | Adendas, prórrogas, cancelaciones. |
| `is_demo` | — | Sí | — |

### 4.2 Jerarquía visual

```
┌───────────────────────────────────────────────────────────────────┐
│ [Cierra pronto]  [PyME?]  [DEMO?]              Guardar  Alerta ⋯  │
│ Título de la licitación (h1) · Código [EJEMPLO]                   │
│ Institución · Sector · Provincia                                  │
├───────────────────────────────────────────────────────────────────┤
│ ⏱ Cierra el 18 nov 2026, 17:00 AST — faltan 2 d 6 h              │
│   (hora local: AST = UTC−4)                                       │
├───────────────────────────────────────────────────────────────────┤
│ ▌Confirmado: Presupuesto: DOP [EJEMPLO] (fuente, fecha)           │
│   Pliego y adendas ↗ (nombre, fecha, tamaño)                      │
├───────────────────────────────────────────────────────────────────┤
│ ▌Análisis IA: qué se contrata · requisitos (extracto)             │
├───────────────────────────────────────────────────────────────────┤
│ Adjudicación (si existe): proveedor · monto · fecha ↗             │
├───────────────────────────────────────────────────────────────────┤
│ ┆Inferencia┆ Posibles necesidades de subcontratación — no es un  │
│ ┆ contrato ni una garantía · base · confianza                      │
├───────────────────────────────────────────────────────────────────┤
│ Historial (adendas/prórrogas) · Verificación                      │
└───────────────────────────────────────────────────────────────────┘
```
`[ilustrativo]`

### 4.3 Fuente, evidencia, historial y verificación

- La **fuente** es el portal oficial de contrataciones públicas `[PENDIENTE A: DGCP — acceso, licencia y formato no verificados]`. Toda ficha enlaza al proceso original.
- **Verificación:** la licitación procede de un documento oficial: `verified` por defecto si el documento es auténtico y está capturado; si la captura falla, “No verificada (captura pendiente)”.
- **Historial:** prórrogas y adendas con fecha anterior/nueva; se destaca un **cambio de fecha límite**.
- **Cuenta atrás:** siempre con hora y zona; el valor se calcula en el cliente a partir de `deadline_at` UTC y se acompaña de la fecha absoluta (para lectores de pantalla y capturas).
- **Adjudicación:** el proveedor adjudicado se vincula a la ficha de empresa (SCR-08), con la etiqueta de que el vínculo es por nombre/identificador `[PENDIENTE A: reconciliación]`.

### 4.4 CTA

| Prioridad | CTA | Condición |
|---|---|---|
| 1 | **Abrir pliego oficial** ↗ | Siempre si hay documento |
| 2 | **Guardar y avisarme antes del cierre** (7/3/1 días, RF-D-09) | `viewer`+, si `open`/`closing_soon` |
| 3 | **Ver proveedor adjudicado** | Si hay adjudicación |
| 4 | **Ver oportunidades relacionadas** | Si existen publicadas |

> No existe “Participar” ni “Postularme” dentro del producto: la participación ocurre en el portal oficial (S-08, RN-04).

### 4.5 Estados vacíos y límite

| Situación | Tratamiento |
|---|---|
| Sin presupuesto | “Presupuesto: No disponible. La fuente no lo publica.” |
| Sin fecha límite | “Fecha límite: no publicada. Consulte el pliego.” (no se supone) |
| Cerrada | Estado “Cerrada”; se oculta la cuenta atrás; se muestra “Cerró el [fecha]”. |
| Cancelada | Motivo si existe; “La fuente no indica el motivo” si no. |
| Sin documentos accesibles | “El pliego no está disponible en la fuente en este momento.” + última captura. |
| Sin adjudicación | “Aún no se ha publicado adjudicación.” |
| Fuente caída | `FreshnessBanner` con la antigüedad del último dato; el estado “Abierta” no se afirma con datos antiguos (“Estado a la fecha de [última captura]”). |

### 4.6 Criterios de aceptación

- **AC-FC-L-01** Dada una licitación con `deadline_at`, cuando se muestra, entonces incluye fecha, hora y zona, y la cuenta atrás coincide con el valor UTC almacenado.
- **AC-FC-L-02** Dada una licitación cerrada, cuando se abre, entonces no muestra cuenta atrás ni acción de aviso.
- **AC-FC-L-03** Dada una hipótesis de subcontratación, cuando se muestra, entonces lleva la etiqueta `Inferencia` y el aviso de que no es un contrato.
- **AC-FC-L-04** Dado un cambio de fecha límite por adenda, cuando se consulta el historial, entonces se ven la fecha anterior, la nueva y el documento.
- **AC-FC-L-05** Dada una fuente retrasada, cuando se abre la ficha, entonces el estado se acompaña de “Estado a la fecha de la última captura”.

**Dependencias A:** fuente DGCP (API/licencia/formato), modelo de licitación/adjudicación, reconciliación de proveedores, almacenamiento de pliegos.

---

## 5. Ficha de instrumento financiero

**Entidades:** `financial_instruments`, `instrument_auctions`. **Pantalla:** SCR-06. **Requisitos:** RF-C-01…RF-C-13.

### 5.1 Campos

| Campo | Capa | Obligatorio | Regla |
|---|---|---|---|
| `name` / `identifier` (p. ej. ISIN o código oficial) `[PENDIENTE A]` | Confirmado | Sí | — |
| `issuer` (BCRD, Ministerio de Hacienda, emisor del mercado de valores) | Confirmado | Sí | RF-C-04. |
| `instrument_type` | Confirmado | Sí | Renta fija, título, certificado… `[PENDIENTE A: taxonomía]`. |
| `currency` | Confirmado | Sí | ISO 4217. |
| `issue_date`, `maturity_date`, `term` | Confirmado | Sí | Con fuente. |
| `rate` + `rate_type` (`indicative`/`awarded`/`effective`) + `rate_basis` | Confirmado | Sí | **Nunca** una tasa sin su tipo (RF-C-05). |
| `rate_history[]` | Confirmado | Si existe | Una serie por tipo (RF-C-08). |
| `auctions[]` (fecha, hora, monto convocado, monto adjudicado, tasa de corte) | Confirmado | Si aplica | Solo lo publicado. |
| `participation_requirements` + enlace | Confirmado (extracto) | No | Sin interpretación legal (RF-C-11). |
| `availability_status` (A: `not_confirmed` / `confirmed_by_source`) | Confirmado | Sí | Por defecto `not_confirmed` = “No confirmada”; `confirmed_by_source` exige documento (RF-C-12). |
| `liquidity_info`, `risk_info` | Confirmado solo si la fuente lo declara | No | Sin ratings propios (RF-C-13). |
| `calendar_events[]` (subastas, vencimientos) | Confirmado | Si existen | Con hora y zona (RF-C-09). |
| `yield_estimate` | ~~`Cálculo`~~ **Post-MVP (G0 #9)** | — | No se muestra en el MVP: calculadora y capa `Cálculo` quedan fuera. |
| `change_history[]` | Sistema | Sí | — |
| `is_demo` | — | Sí | — |

### 5.2 Jerarquía visual

```
┌───────────────────────────────────────────────────────────────────┐
│ [Disponibilidad no confirmada]  [Tasa adjudicada]  [DEMO?]        │
│ Nombre del instrumento (h1) · Emisor · Moneda                     │
│                                         Guardar  Alerta           │
├───────────────────────────────────────────────────────────────────┤
│ ▌Confirmado                                                        │
│   Tasa: [EJEMPLO]% · Tipo: Adjudicada · Fecha: …  [fuente ↗]      │
│   Plazo · Emisión · Vencimiento                                    │
│   ⓘ Una tasa indicativa no es la que se paga; consulte el tipo.   │
├───────────────────────────────────────────────────────────────────┤
│ Historial de tasas (una serie por tipo)  [gráfico + tabla]         │
├───────────────────────────────────────────────────────────────────┤
│ Calendario: próxima subasta/vencimiento (hora + zona)             │
├───────────────────────────────────────────────────────────────────┤
│ Requisitos de participación → Ver requisitos en la fuente ↗       │
│ Riesgos y liquidez (solo si la fuente los declara)                │
├───────────────────────────────────────────────────────────────────┤
│ (Rendimiento estimado: post-MVP, G0 #9)                            │
├───────────────────────────────────────────────────────────────────┤
│ DisclaimerNote · Historial · Verificación                         │
└───────────────────────────────────────────────────────────────────┘
```
`[ilustrativo]`

### 5.3 Reglas específicas de tasas

| Tipo | Significado (según PM §4-C) | Regla visual |
|---|---|---|
| `indicative` | Tasa indicativa publicada, no vinculante | Etiqueta “Indicativa” + icono propio; nunca se dibuja en la misma serie que otra. |
| `awarded` | Tasa adjudicada en una subasta | Etiqueta “Adjudicada” + fecha de subasta. |
| `effective` | Tasa efectiva (definición exacta `[PENDIENTE SRS]`) | Etiqueta “Efectiva” + convención de cálculo visible. |

- Los tres tipos usan el **mismo tono neutro** (ninguno “parece mejor”).
- Comparar instrumentos con tasas de distinto tipo se muestra en columnas separadas, con aviso.
- Monedas distintas: no se suman ni se convierten sin tipo de cambio con fuente y fecha (RN-10).
- Cálculo de rendimiento: **solo** con motor determinista y fórmula visible; no con respuesta generativa (PM §5, Agente 5). Bloqueado hasta cerrar V-05.

### 5.4 Fuente, evidencia, historial y verificación

- Cada observación de tasa tiene fuente (URL oficial) y fecha; el gráfico y la tabla las exponen.
- **Historial:** correcciones oficiales de una tasa se muestran como nueva observación con motivo, sin borrar la anterior.
- **Verificación:** verificada contra el documento oficial de la subasta/emisión; si procede de una nota informativa no oficial: `Análisis IA`, no `Confirmado`, y estado “Sin verificar”.
- **Frescura:** `FreshnessBanner` con la última observación y la periodicidad esperada.

### 5.5 CTA

| Prioridad | CTA | Condición |
|---|---|---|
| 1 | **Ver requisitos en la fuente** ↗ | Siempre (único “CTA transaccional” permitido) |
| 2 | **Guardar** / **Avisarme de nuevas emisiones o vencimiento** | `viewer`+ |
| 3 | ~~Comparar~~ | **Post-MVP (G0 #9)** |
| 4 | ~~Calcular rendimiento~~ | **Post-MVP (G0 #9)** |

> **Prohibido** (RF-C-12, AC-UX-09): “Comprar”, “Invertir ahora”, “Suscribir”, “Mejor tasa”, “Recomendado”.

### 5.6 Estados vacíos y límite

| Situación | Tratamiento |
|---|---|
| Sin historial de tasas | “Aún no hay observaciones publicadas para este instrumento.” + fuente esperada. |
| Sin tasa de un tipo | “Tasa [adjudicada]: No disponible. La fuente no la publica.” |
| Disponibilidad desconocida | “Disponibilidad no confirmada.” + enlace a la fuente. |
| Vencido | Estado “Vencido el [fecha]”; sin alerta de vencimiento; historial conservado. |
| Fuente caída | Aviso de antigüedad; “Tasa a la fecha de la última captura”. |
| Calculadora bloqueada | “Calculadora no disponible: falta definir la convención de cálculo.” (V-05) |
| Riesgo/liquidez no declarados | “La fuente no declara este dato.” (sin rating propio) |

### 5.7 Criterios de aceptación

- **AC-FC-I-01** Dado un instrumento, cuando se muestra una tasa, entonces siempre lleva su tipo (`indicative`/`awarded`/`effective`), fecha y fuente.
- **AC-FC-I-02** Dado un instrumento sin confirmación de disponibilidad, cuando se abre, entonces no existe CTA de compra y se muestra “Disponibilidad no confirmada”.
- **AC-FC-I-03** Dadas tasas de tipos distintos, cuando se grafican, entonces se dibujan en series separadas, distinguibles sin color.
- **AC-FC-I-04** Dados instrumentos en monedas distintas, cuando se comparan, entonces no se suman ni convierten sin tipo de cambio con fuente.
- **AC-FC-I-05** Dado un rendimiento calculado, cuando se muestra, entonces se acompaña de fórmula y supuestos, y está etiquetado como estimación (y, si D-08 se aprueba, como `Cálculo`).

**Dependencias A:** fuentes BCRD/Hacienda/SIMV/BVRD (no verificadas), taxonomía de instrumentos, reglas de tasa, motor de cálculo determinista.

---

## 6. Matriz de cumplimiento de reglas por ficha

| Regla | Evento | Oportunidad | Proyecto/permiso | Licitación | Instrumento |
|---|---|---|---|---|---|
| FC-01 Cifra con fuente | Sí | Sí | Sí (monto) | Sí (presupuesto) | Sí (tasa, plazo) |
| FC-02 Capa visible | Sí | Sí | Sí | Sí | Sí |
| FC-03 Fuente original | Sí | Vía evento | Sí | Sí | Sí |
| FC-04 Tres fechas | Sí | Sí | Sí | Sí | Sí |
| FC-05 Verificación | Sí | Del evento | Sí | Sí | Sí |
| FC-06 Historial | Sí | Versiones | Versiones | Adendas | Tasas |
| FC-08 Sin recomendación | Sí | Sí | Sí | Sí | Sí (clave) |
| Estado “No disponible” | Sí | Sí | Sí | Sí | Sí |
| Inferencia presente | Oportunidades derivadas | Núcleo | Oportunidades potenciales | Subcontratación | No (ninguna) |

---

## 7. Vacíos, dependencias y riesgos

| ID | Elemento | Estado |
|---|---|---|
| FK-01 | Esquemas de campos finales de las 5 entidades | `[PENDIENTE A]` |
| FK-02 | Taxonomía de estados de permiso y estados de construcción (qué documento acredita cada uno) | `[PENDIENTE A + SRS]` |
| FK-03 | Definición de “tasa efectiva” y convención de cálculo | `[PENDIENTE SRS V-05]` |
| FK-04 | Umbral de “confianza baja” y metodología de la puntuación | `[PENDIENTE]` |
| FK-05 | Política de conservación de documentos originales (licencia) para mostrar copia capturada | `[PENDIENTE A / LEGAL]` |
| FK-06 | Redacción legal de `DisclaimerNote` | `[PENDIENTE LEGAL]` |
| FK-07 | Etiqueta `Cálculo` (D-08) | **Post-MVP (G0 #9)**: no se implementa |
| FK-08 | Criterios de “oportunidad para PyME” | `[PENDIENTE SRS V-06]` |
| FK-R1 | Riesgo: la ficha de oportunidad se percibe como recomendación | Mitigación: capa `Inferencia`, riesgos primero, sin CTA financiero. |
| FK-R2 | Riesgo: estado de proyecto inflado por un registro | Mitigación: regla dura RF-B-04 + componente que exige documento. |
| FK-R3 | Riesgo: fuentes retrasadas dan una cuenta atrás falsa | Mitigación: “Estado a la fecha de la última captura” + `FreshnessBanner`. |

---

## 8. Registro de cambios

| Versión | Fecha | Cambio | Autor |
|---|---|---|---|
| 0.4.0 | 2026-11-15 | Ronda 5: política P0 en la ficha de evento (visibilidad de `disputed`/`partially_verified`, AC-FC-E-05); `released_at` en FC-04. | Ventana B |
| 0.3.0 | 2026-11-15 | Ronda 3 (G0): `opportunity_evidence` → `evidence` (G0 #10); comparador, calculadora y capa `Cálculo` marcados post-MVP en la ficha de instrumento (G0 #9). | Ventana B |
| 0.2.0 | 2026-11-15 | Ronda 2: FC-06 historial por rol; FC-13 sin contenido íntegro de fuentes (de MODELO-DATOS §7.1). | Ventana B |
| 0.1.0 | 2026-11-15 | Creación: 5 fichas (evento, oportunidad, proyecto/permiso, licitación, instrumento) con campos, jerarquía, fuente, evidencia, historial, verificación, CTA, estados vacíos y criterios de aceptación. | Ventana B |
