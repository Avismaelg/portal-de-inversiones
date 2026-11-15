# Requisitos y matriz de trazabilidad — AviTech Investment Intelligence

| Campo | Valor |
|---|---|
| Documento | `docs/producto/REQUISITOS-Y-TRAZABILIDAD.md` |
| Versión | 0.4.0 (Sprint 0, Ronda 3) |
| Fecha | 2026-11-15 |
| Autor | Ventana B — Producto, UX, Requisitos y QA |
| Estado | **BORRADOR PARA APROBACIÓN** — no sustituye a la SRS |
| Fuente principal | `docs/prompts/PROMPT-MAESTRO.md` (en adelante **PM**) |
| Fuentes ausentes | SRS IEEE-830 y Plan Maestro `.docx` — **no encontrados** en `docs/requisitos/` (ver B-001 y B-002) |

> **Advertencia de alcance.** La SRS y el Plan Maestro no existen en el repositorio. Este documento **deriva** requisitos del Prompt Maestro y **no inventa** contenido de la SRS. Todo requisito que el PM no define con precisión queda marcado `[PENDIENTE SRS]`. Los identificadores son provisionales; cuando llegue la SRS se añadirá una tabla de equivalencias y se revalidará la matriz.

---

## 1. Convenciones

### 1.1 Identificadores

| Prefijo | Significado | Ejemplo |
|---|---|---|
| `RF-A-nn` … `RF-F-nn` | Requisito funcional de los módulos A–F del PM | `RF-C-07` |
| `RF-G-nn` | Requisito funcional transversal de plataforma (cuenta, búsqueda, alertas, admin) | `RF-G-04` |
| `RNF-nn` | Requisito no funcional medible | `RNF-01` |
| `US-…` | Historia de usuario (detalle en `docs/sprint-0/backlog-producto.md`) | `US-F-03` |
| `SCR-nn` | Pantalla del inventario (detalle en `docs/ux/INVENTARIO-PANTALLAS.md`) | `SCR-07` |
| `T-…` | Prueba planificada (detalle en `docs/qa/ESTRATEGIA-PRUEBAS.md`) | `T-RF-A-04` |
| `C-nn` | Contradicción o decisión pendiente | `C-04` |

### 1.2 Prioridad (MoSCoW)

- **Must** — sin ello el MVP no cumple los criterios de terminación del PM §16.
- **Should** — importante, admite degradación controlada en el MVP.
- **Could** — deseable, fuera del camino crítico.
- **Won't (esta versión)** — explícitamente fuera del MVP; documentado para evitar alcance implícito.

### 1.3 Estado de la evidencia

| Estado | Significado |
|---|---|
| `Derivado PM` | El PM lo enuncia de forma explícita; redacción y detalle son de la Ventana B. |
| `Propuesto` | Decisión de producto de la Ventana B necesaria para poder construir; requiere aprobación. |
| `[PENDIENTE SRS]` | El PM no lo define o lo deja ambiguo; no se puede cerrar sin SRS o decisión del usuario. |

### 1.4 Reglas de evidencia aplicadas

1. Ningún requisito se declara cubierto sin historia, criterio de aceptación verificable y prueba planificada (Contrato §5).
2. Ningún objetivo no funcional se declara cumplido en Sprint 0; solo se define métrica y método de medición.
3. Toda cifra mostrada al usuario debe tener fuente y fecha, o mostrar “No disponible”.
4. Se distingue siempre `confirmed` (hecho documentado), `ai_analysis` (análisis generado) e `inference` (hipótesis comercial).

---

## 2. Alcance del producto y supuestos

### 2.1 Alcance MVP (derivado del PM §16)

1. Registro e inicio de sesión.
2. Radar de acontecimientos económicos con evidencia consultable.
3. Fuentes oficiales verificadas e integradas.
4. Proyectos y permisos identificados y consultables.
5. Licitaciones consultables.
6. Instrumentos financieros consultables.
7. Búsqueda y filtrado.
8. Análisis de oportunidades fundamentado en evidencia.
9. Guardado de oportunidades (watchlist).
10. Alertas configurables.
11. Controles de seguridad.
12. Pruebas críticas aprobadas y documentación de despliegue.
13. Operación sin intervención manual constante en los procesos aprobados.

### 2.2 Supuestos (a validar; no son hechos)

| ID | Supuesto | Impacto si es falso | Validación |
|---|---|---|---|
| S-01 | El mercado inicial es República Dominicana y el idioma primario es español (es-DO). | Cambia la prioridad de fuentes, normativa y formatos. | PM §1, §6. Confirmado por el PM. |
| S-02 | Los usuarios acceden mayoritariamente por navegador; no se requiere app nativa en el MVP. | Habría que añadir alcance móvil nativo. | `[PENDIENTE SRS]` / decisión del usuario. |
| S-03 | El modelo de negocio será suscripción SaaS, pero planes y precios no están definidos. | Afecta límites, onboarding y panel admin. | `[PENDIENTE COMERCIAL]` (C-06). |
| S-04 | Se opera con una sola organización propietaria de los datos y usuarios invitados; el multi-tenant B2B no es requisito del MVP. | Cambia RLS, roles y facturación. | `[PENDIENTE ALCANCE]` (C-12). |
| S-05 | Las fuentes oficiales permitirán acceso automatizado o, en su defecto, carga manual asistida. | Sin fuente no hay dato; la pantalla debe declarar cobertura parcial. | Ventana A (`docs/fuentes/FUENTES-RD.md`) — pendiente. |
| S-06 | La IA se usa para extraer, verificar y proponer; la publicación de oportunidades requiere revisión humana en el MVP. | Si se automatiza, cambia el riesgo legal y operativo. | PM §5; decisión de producto (C-09). |
| S-07 | Los datos geográficos estarán disponibles al menos a nivel de provincia/municipio. | El mapa y los filtros geográficos se degradan. | Ventana A — pendiente. |
| S-08 | El producto no ejecuta operaciones financieras ni custodia fondos. | Cambiaría el marco regulatorio aplicable. | PM §3, §4-C, §10. |

### 2.3 Fuera de alcance del MVP (Won't, esta versión)

| Elemento | Motivo |
|---|---|
| Ejecución de compras/ventas de instrumentos o transferencias | El PM prohíbe presentar instrumentos como disponibles sin confirmación; no es un broker. |
| Asesoramiento financiero personalizado o recomendaciones individualizadas | Requiere salvaguardas regulatorias y revisión legal (PM §5, §10). |
| Chat conversacional con IA | No figura entre las 14 pantallas ni en los criterios del PM; evitarlo impide alcance implícito. |
| App móvil nativa (iOS/Android) | No requerida; la web debe ser responsive. |
| Fuentes internacionales (SEC, USAspending, Fed) | El PM las sitúa en expansión posterior. |
| Facturación, planes y cobro | `[PENDIENTE COMERCIAL]`; no bloquea el MVP técnico. |
| API pública para terceros | No requerida por el PM. |
| SSO/SAML empresarial | No requerido; se reevalúa si aparece un cliente B2B. |
| Traducción completa al inglés | El PM exige español para documentación; la UI nace es-DO. |

---

### 2.4 Efecto de G0 (`G0-ACTA.md`, 2026-11-15)

La matriz de §3 y el Anexo B **no se renumeran**: conservan los 86 RF provisionales (G0 #1, `[PENDIENTE SRS]`). El acta cambia el **estado de alcance** de estos requisitos y las reglas con las que se ejecutan los demás:

| Requisito | Efecto | Decisión |
|---|---|---|
| RF-C-06 (comparador de instrumentos), RF-C-07 (calculadora), RF-G-05 (vistas guardadas), RF-G-16 (exportación CSV) | **Post-MVP**: no cuentan para el cierre del MVP; sus pruebas `T-RF-*` no se ejecutan | G0 #9, #13 |
| Capa visual `Cálculo` (D-08) | **Post-MVP**; `trust_layer` no cambia | G0 #9 |
| RF-B-* (todos), RF-C-03, RF-E-* | **Cobertura manual / “cobertura pendiente”** visible en la UI; solo se automatiza lo que verifiquen `T-SRC-04…06` | G0 #7 |
| RF-C-01 (BCRD) y RF-C-02 (Crédito Público) | BCRD fuera del corte vertical; automatizar Crédito Público exige opinión legal (G0 #5); mientras, carga manual | G0 #5, #7 |
| RF-D-01 (histórico) | Últimos **N** años, N definido en `T-SRC-01` | G0 #8 |
| RF-A-11, RF-F-11 | Puerta P0: todo evento no verificado al 100 % pasa por cola de revisión (caso crítico CC-23) | G0 #11 |
| RF-G-03, RF-G-08 | Una sola organización; alertas solo in-app; sin facturación | G0 #13 |

Recuento del MVP tras G0: 82 historias (Must 65, Should 15, Could 2). El Anexo A se mantiene como recuento **antes de G0**.

## 3. Requisitos funcionales

> **Lectura de las tablas.** “Prueba” indica el ID canónico de la prueba planificada; el nivel (unitaria, integración, E2E, datos, IA, seguridad, carga) y el procedimiento se especifican en `docs/qa/ESTRATEGIA-PRUEBAS.md`. “Estado” usa la escala de §1.3.

### 3.1 Módulo A — Radar de inteligencia económica

Objetivo: convertir publicaciones oficiales dispersas en acontecimientos verificables, con evidencia y fecha, sin perder el documento original.

| ID | Requisito | Fuente | Pri. | Historia | Pantalla | Prueba | Estado |
|---|---|---|---|---|---|---|---|
| RF-A-01 | Ingesta programada de fuentes autorizadas. Cada ejecución registra `source`, `source_document`, URL canónica, hash de contenido y `captured_at`. | PM §4-A, §6 | Must | US-A-01 | SCR-02, SCR-14 | T-RF-A-01 | Derivado PM |
| RF-A-02 | Clasificación sectorial automática en las 11 categorías iniciales (energía, construcción, turismo, industria, infraestructura, tecnología, finanzas, comercio, agricultura, transporte, inversiones extranjeras), con puntuación de confianza y corrección manual auditada. | PM §4-A | Must | US-A-02 | SCR-02 | T-RF-A-02 | Derivado PM |
| RF-A-03 | Creación de `economic_event` a partir de uno o más documentos; un evento puede tener varias fuentes y un documento puede alimentar varios eventos. | PM §4-A | Must | US-A-03 | SCR-02 | T-RF-A-03 | Derivado PM |
| RF-A-04 | Deduplicación de documentos (hash exacto) y de eventos (reglas + similitud), con registro de la decisión y posibilidad de deshacer una fusión. | PM §4-A, §5 | Must | US-A-04 | SCR-02, SCR-14 | T-RF-A-04 | Derivado PM |
| RF-A-05 | Evidencia consultable por evento: fragmento textual, página/sección, documento original, URL oficial, fecha de captura y hash. | PM §4-A, §9 | Must | US-A-05 | SCR-02 | T-RF-A-05 | Derivado PM |
| RF-A-06 | Registro de tres fechas: `published_at` (fuente), `detected_at` (sistema) y `updated_at` (última modificación). Almacenamiento en UTC y visualización en `America/Santo_Domingo`. | PM §4-A | Must | US-A-06 | SCR-02 | T-RF-A-06 | Derivado PM |
| RF-A-07 | Vinculación de cada evento con organización(es), sector(es) y ubicación(es); una relación puede ser `confirmed` o `inferred` y debe declararlo. | PM §4-A | Must | US-A-07 | SCR-02, SCR-08 | T-RF-A-07 | Derivado PM |
| RF-A-08 | Búsqueda de texto completo y filtros combinables por sector, organización, ubicación, rango de fechas, fuente y estado de verificación. | PM §4-A, §9 | Must | US-A-08 | SCR-02, SCR-10 | T-RF-A-08 | Derivado PM |
| RF-A-09 | Alertas de eventos relevantes según preferencias del usuario; una misma combinación evento–usuario no genera más de una alerta. | PM §4-A, §5 | Must | US-A-09 | SCR-12 | T-RF-A-09 | Derivado PM |
| RF-A-10 | Detalle de evento con resumen, hechos clave, evidencia, documentos vinculados, organizaciones y cronología. | PM §9 | Must | US-A-10 | SCR-02 | T-RF-A-10 | Derivado PM |
| RF-A-11 | Estado de verificación explícito por evento: `verified`, `partially_verified`, `disputed`, `unverifiable`, con motivo y fecha. | PM §5 | Must | US-A-11 | SCR-02 | T-RF-A-11 | Derivado PM |
| RF-A-12 | Historial de cambios del evento: quién, cuándo, campo, valor anterior y valor nuevo; incluye correcciones humanas. | PM §4-B, §5 | Should | US-A-12 | SCR-02 | T-RF-A-12 | Derivado PM |
| RF-A-13 | Todo contenido de demostración se marca `is_demo = true` y se muestra con la etiqueta visible “DEMO”. | PM §9 | Must | US-A-13 | Todas | T-RF-A-13 | Derivado PM |

### 3.2 Módulo B — Permisos y proyectos

Objetivo: saber qué se está autorizando, en qué estado real está y con qué documento se acredita, sin convertir un registro en una aprobación.

| ID | Requisito | Fuente | Pri. | Historia | Pantalla | Prueba | Estado |
|---|---|---|---|---|---|---|---|
| RF-B-01 | Cobertura de los 7 tipos de proyecto/permiso del PM. La cobertura se declara por fuente y por tipo; un tipo sin fuente validada se muestra como “cobertura pendiente”, nunca vacío silencioso. | PM §4-B | Must | US-B-01 | SCR-03, SCR-04 | T-RF-B-01 | Derivado PM |
| RF-B-02 | Ficha de proyecto con los 12 campos del PM: nombre, promotor, ubicación, sector, descripción, monto anunciado, estado administrativo, fecha de autorización, institución responsable, documento oficial, historial y oportunidades potenciales. | PM §4-B | Must | US-B-02 | SCR-03, SCR-04 | T-RF-B-02 | Derivado PM |
| RF-B-03 | Taxonomía de estados administrativos: `announced`, `permit_applied`, `permit_approved`, `under_construction`, `operating`, `suspended`, `cancelled`, `unknown`; cada transición exige documento y fecha. | PM §4-B | Must | US-B-03 | SCR-03, SCR-04 | T-RF-B-03 | Propuesto (detalle) |
| RF-B-04 | Regla dura: la aparición en un registro **no** implica aprobación. Sin documento de aprobación, el estado máximo permitido es `permit_applied` o `announced`. | PM §4-B | Must | US-B-04 | SCR-03, SCR-04 | T-RF-B-04 | Derivado PM |
| RF-B-05 | Cada permiso muestra institución responsable, número de expediente (si existe), documento oficial y enlace a la fuente. | PM §4-B | Must | US-B-05 | SCR-04 | T-RF-B-05 | Derivado PM |
| RF-B-06 | Historial de versiones del proyecto/permiso: estado, monto, descripción y documentos, con fecha y origen del cambio. | PM §4-B | Must | US-B-06 | SCR-03, SCR-04 | T-RF-B-06 | Derivado PM |
| RF-B-07 | Ubicación normalizada a provincia y municipio; coordenadas solo si la fuente las publica. Sin geocodificación inventada. | PM §4-B, §9 | Should | US-B-07 | SCR-03, SCR-09 | T-RF-B-07 | Derivado PM |
| RF-B-08 | Monto anunciado solo si la fuente lo publica; se muestra moneda, año de referencia y cita. Si no existe, se muestra “No disponible” y el motivo. | PM §4-B, §9 | Must | US-B-08 | SCR-03, SCR-04 | T-RF-B-08 | Derivado PM |
| RF-B-09 | Vínculo con oportunidades comerciales potenciales, etiquetadas como inferencia y con su nivel de confianza. | PM §4-B, §4-F | Must | US-B-09 | SCR-03, SCR-07 | T-RF-B-09 | Derivado PM |
| RF-B-10 | Filtros por tipo, estado, sector, institución, provincia, monto (rango) y fecha; alertas de cambio de estado. | PM §4-B | Must | US-B-10 | SCR-03, SCR-04 | T-RF-B-10 | Derivado PM |
| RF-B-11 | Proyectos y permisos relacionados por promotor, ubicación o expediente, mostrados como “relacionados”, no como el mismo proyecto. | PM §4-B | Should | US-B-11 | SCR-03, SCR-04 | T-RF-B-11 | Derivado PM |

### 3.3 Módulo C — Instrumentos financieros

Objetivo: consultar instrumentos, tasas y vencimientos con la naturaleza de cada tasa explícita, sin sugerir disponibilidad de compra.

| ID | Requisito | Fuente | Pri. | Historia | Pantalla | Prueba | Estado |
|---|---|---|---|---|---|---|---|
| RF-C-01 | Seguimiento de instrumentos del Banco Central: subastas, resultados, plazos y tasas publicadas. | PM §4-C | Must | US-C-01 | SCR-06 | T-RF-C-01 | Derivado PM |
| RF-C-02 | Seguimiento de títulos del Ministerio de Hacienda. | PM §4-C | Must | US-C-02 | SCR-06 | T-RF-C-02 | Derivado PM |
| RF-C-03 | Seguimiento de emisiones del mercado de valores dominicano (renta fija). | PM §4-C | Should | US-C-03 | SCR-06 | T-RF-C-03 | Derivado PM |
| RF-C-04 | Campos mínimos por instrumento: emisor, tipo, moneda, plazo, fecha de emisión, fecha de vencimiento, tasa, tipo de tasa y fuente. | PM §4-C | Must | US-C-04 | SCR-06 | T-RF-C-04 | Derivado PM |
| RF-C-05 | Distinguir de forma explícita y visual `indicative`, `awarded` y `effective`; nunca mezclarlas en una misma serie sin etiqueta. | PM §4-C | Must | US-C-05 | SCR-06 | T-RF-C-05 | Derivado PM |
| RF-C-06 | Comparador de hasta 4 instrumentos, con alineación de plazos y moneda; si las monedas difieren, no se suma ni se convierte sin tipo de cambio con fuente. | PM §4-C | Should | US-C-06 | SCR-06 | T-RF-C-06 | Propuesto (límite 4) |
| RF-C-07 | Calculadora de rendimiento con supuestos explícitos (monto, plazo, tasa, reinversión, comisión si existe), fórmula visible y resultado etiquetado como estimación. | PM §4-C, §5 | Should | US-C-07 | SCR-06 | T-RF-C-07 | `[PENDIENTE SRS]` (fórmulas y alcance) |
| RF-C-08 | Historial de tasas por instrumento/emisor, con fuente y fecha de cada observación. | PM §4-C | Must | US-C-08 | SCR-06 | T-RF-C-08 | Derivado PM |
| RF-C-09 | Calendario de subastas y vencimientos con hora y zona horaria. | PM §4-C | Must | US-C-09 | SCR-06, SCR-01 | T-RF-C-09 | Derivado PM |
| RF-C-10 | Alertas de nuevas emisiones y de vencimientos próximos, según preferencias. | PM §4-C | Must | US-C-10 | SCR-12 | T-RF-C-10 | Derivado PM |
| RF-C-11 | Requisitos de participación e información de contacto/enlace oficial; sin interpretar requisitos legales por cuenta propia. | PM §4-C | Should | US-C-11 | SCR-06 | T-RF-C-11 | Derivado PM |
| RF-C-12 | Prohibido mostrar “Comprar” o equivalente. El CTA es “Ver requisitos en la fuente” y el estado de disponibilidad es “No confirmada” salvo que la fuente lo acredite. | PM §4-C | Must | US-C-12 | SCR-06 | T-RF-C-12 | Derivado PM |
| RF-C-13 | Riesgos y liquidez: mostrar solo lo que la fuente declare; si no hay dato, “No disponible”. No emitir ratings propios. | PM §4-C, §4-F | Must | US-C-13 | SCR-06 | T-RF-C-13 | Derivado PM |

### 3.4 Módulo D — Licitaciones y contrataciones

Objetivo: detectar oportunidades de contratación pública a tiempo y con documentos oficiales, separando el hecho (licitación/adjudicación) de la inferencia (subcontratación).

| ID | Requisito | Fuente | Pri. | Historia | Pantalla | Prueba | Estado |
|---|---|---|---|---|---|---|---|
| RF-D-01 | Detección de licitaciones nuevas y actualizadas desde la fuente oficial, con identificador de proceso y enlace. | PM §4-D | Must | US-D-01 | SCR-05 | T-RF-D-01 | Derivado PM |
| RF-D-02 | Fecha y hora límite con zona horaria, cuenta atrás y estado (`open`, `closing_soon`, `closed`). `closing_soon` = cierre en ≤ 72 h por defecto `[PROPUESTO]`, configurable. | PM §4-D | Must | US-D-02 | SCR-05 | T-RF-D-02 | Derivado PM |
| RF-D-03 | Presupuesto con moneda, fuente y fecha; si no está publicado, “No disponible”. | PM §4-D | Must | US-D-03 | SCR-05 | T-RF-D-03 | Derivado PM |
| RF-D-04 | Adjudicaciones y contratos resultantes, con monto adjudicado y documento. | PM §4-D | Must | US-D-04 | SCR-05 | T-RF-D-04 | Derivado PM |
| RF-D-05 | Proveedores adjudicados vinculados a la ficha de empresa. | PM §4-D, §4-E | Should | US-D-05 | SCR-05, SCR-08 | T-RF-D-05 | Derivado PM |
| RF-D-06 | Clasificación por sector y por institución convocante. | PM §4-D | Must | US-D-06 | SCR-05 | T-RF-D-06 | Derivado PM |
| RF-D-07 | Filtro “oportunidad para PyME” basado en criterios explícitos y configurables (monto, requisitos, plazo); no es una recomendación. | PM §4-D | Should | US-D-07 | SCR-05 | T-RF-D-07 | `[PENDIENTE SRS]` (criterios) |
| RF-D-08 | Oportunidades de subcontratación mostradas como **inferencia comercial**, con base, confianza y advertencia de que no es un contrato. | PM §4-D | Should | US-D-08 | SCR-05, SCR-07 | T-RF-D-08 | Derivado PM |
| RF-D-09 | Alertas de vencimiento configurables (p. ej. 7/3/1 días) con deduplicación. | PM §4-D | Must | US-D-09 | SCR-12 | T-RF-D-09 | Propuesto (ventanas) |
| RF-D-10 | Acceso a pliegos y documentos oficiales desde la ficha, sin copiar su contenido íntegro si la licencia no lo permite. | PM §4-D, §6 | Must | US-D-10 | SCR-05 | T-RF-D-10 | Derivado PM |

### 3.5 Módulo E — Expansión empresarial

Objetivo: detectar señales de crecimiento empresarial y conectarlas con necesidades comerciales, siempre como vínculo inferido cuando no esté documentado.

| ID | Requisito | Fuente | Pri. | Historia | Pantalla | Prueba | Estado |
|---|---|---|---|---|---|---|---|
| RF-E-01 | Detección de las 9 señales del PM: fábricas, sucursales, expansión industrial, inversión extranjera, parques energéticos, infraestructura privada, contratación, alianzas e inversión en maquinaria/tecnología. La cobertura se declara por señal. | PM §4-E | Should | US-E-01 | SCR-02, SCR-08 | T-RF-E-01 | Derivado PM |
| RF-E-02 | Cada señal se vincula a empresa, sector, ubicación y necesidad potencial; el vínculo documentado y el inferido se distinguen. | PM §4-E | Must | US-E-02 | SCR-08 | T-RF-E-02 | Derivado PM |
| RF-E-03 | Ficha de empresa agregada: identificación, sector, ubicación, eventos, proyectos, licitaciones, contratos y oportunidades. | PM §4-E, §9 | Must | US-E-03 | SCR-08 | T-RF-E-03 | Derivado PM |
| RF-E-04 | Historial cronológico de actividad de la empresa con enlace a la evidencia de cada hito. | PM §4-E | Should | US-E-04 | SCR-08 | T-RF-E-04 | Derivado PM |
| RF-E-05 | Inversión extranjera: país de origen y monto solo si la fuente lo publica; etiqueta “anunciado” vs “ejecutado” cuando el documento lo permita. | PM §4-E | Should | US-E-05 | SCR-08 | T-RF-E-05 | `[PENDIENTE SRS]` |
| RF-E-06 | Anuncios de contratación tratados como señal de expansión, no como prueba de inversión; se muestra la fuente y la fecha. | PM §4-E | Could | US-E-06 | SCR-08 | T-RF-E-06 | `[PENDIENTE SRS]` |
| RF-E-07 | Seguimiento de empresa (watchlist) y alertas de nuevos eventos de esa empresa. | PM §4-E, §9 | Should | US-E-07 | SCR-08, SCR-11 | T-RF-E-07 | Derivado PM |
| RF-E-08 | Deduplicación de empresas por razón social, identificador fiscal (si existe) y variantes; fusiones reversibles y auditadas. | PM §4-E, §5 | Must | US-E-08 | SCR-14 | T-RF-E-08 | Derivado PM |
| RF-E-09 | Las “necesidades comerciales” se muestran como inferencia, con explicación y sin cifras inventadas. | PM §4-E, §4-F | Must | US-E-09 | SCR-08, SCR-07 | T-RF-E-09 | Derivado PM |

### 3.6 Módulo F — Motor de oportunidades

Objetivo: generar hipótesis de oportunidad trazables a un hecho verificado, con evidencia, confianza, riesgos y próximos pasos, sin inventar nada.

| ID | Requisito | Fuente | Pri. | Historia | Pantalla | Prueba | Estado |
|---|---|---|---|---|---|---|---|
| RF-F-01 | Solo se genera una oportunidad a partir de un `economic_event` con estado `verified` o `partially_verified`; un evento `disputed`/`unverifiable` no puede publicar oportunidad. | PM §4-F, §5 | Must | US-F-01 | SCR-07 | T-RF-F-01 | Derivado PM |
| RF-F-02 | Soporte de los 11 tipos de oportunidad del PM (inversión, servicios, suministro, licitación, subcontratación, creación de empresa, expansión, consultoría, automatización, eficiencia energética, tecnología). | PM §4-F | Must | US-F-02 | SCR-07 | T-RF-F-02 | Derivado PM |
| RF-F-03 | Campos obligatorios: descripción, hecho originador, evidencia, sector beneficiado, ubicación, capital estimado (si aplica), requisitos, riesgos, horizonte, confianza y próximos pasos. | PM §4-F | Must | US-F-03 | SCR-07 | T-RF-F-03 | Derivado PM |
| RF-F-04 | Evidencia obligatoria: al menos una cita que resuelva a un documento almacenado; sin evidencia no se publica. | PM §4-F, §5, §9 | Must | US-F-04 | SCR-07 | T-RF-F-04 | Derivado PM |
| RF-F-05 | Capital estimado solo con base justificable (monto documentado o cálculo con supuestos visibles). Si no, “No disponible”. | PM §4-F | Must | US-F-05 | SCR-07 | T-RF-F-05 | Derivado PM |
| RF-F-06 | Nivel de confianza (0–100) con metodología documentada y explicación en lenguaje natural; no es una probabilidad de éxito. | PM §4-F | Must | US-F-06 | SCR-07 | T-RF-F-06 | Propuesto (escala) |
| RF-F-07 | Riesgos y condiciones de participación visibles antes de cualquier CTA. | PM §4-F | Must | US-F-07 | SCR-07 | T-RF-F-07 | Derivado PM |
| RF-F-08 | Horizonte temporal estimado con unidad (días/semanas/meses) y nota de incertidumbre. | PM §4-F | Should | US-F-08 | SCR-07 | T-RF-F-08 | Derivado PM |
| RF-F-09 | Próximos pasos accionables y enlaces a la fuente/requisitos oficiales. | PM §4-F | Must | US-F-09 | SCR-07 | T-RF-F-09 | Derivado PM |
| RF-F-10 | Prohibición dura de cifras, proveedores, contratos o rendimientos inventados; validación automática bloquea la publicación si una cifra no tiene cita. | PM §4-F, §5 | Must | US-F-10 | SCR-07, SCR-14 | T-RF-F-10 | Derivado PM |
| RF-F-11 | Flujo de revisión humana: `draft` → `in_review` → `published`/`rejected`; toda publicación registra revisor, fecha y versión del modelo. | PM §5, §9 | Must | US-F-11 | SCR-07, SCR-14 | T-RF-F-11 | Derivado PM |
| RF-F-12 | Guardar oportunidad en watchlist y añadir nota privada; el estado guardado es por usuario. | PM §9, §16 | Must | US-F-12 | SCR-07, SCR-11 | T-RF-F-12 | Derivado PM |
| RF-F-13 | Feedback “útil / no útil” con motivo opcional, para evaluación del motor. | PM §5 | Should | US-F-13 | SCR-07 | T-RF-F-13 | Propuesto |
| RF-F-14 | Recalcular una oportunidad cuando cambia el evento originador; conservar versión anterior e indicar “actualizada”. | PM §5 | Should | US-F-14 | SCR-07 | T-RF-F-14 | Propuesto |

### 3.7 Plataforma — requisitos transversales (G)

| ID | Requisito | Fuente | Pri. | Historia | Pantalla | Prueba | Estado |
|---|---|---|---|---|---|---|---|
| RF-G-01 | Registro, inicio de sesión, verificación de correo y recuperación de contraseña. Sesiones seguras y cierre de sesión. | PM §16 | Must | US-G-01 | Auxiliar AUTH | T-RF-G-01 | Derivado PM |
| RF-G-02 | Roles y permisos con mínimo privilegio: `viewer`, `analyst`, `opportunity_manager`, `org_admin`, `platform_admin`. Toda acción sensible se autoriza en servidor y en base de datos (RLS). | PM §10 | Must | US-G-02 | SCR-14 | T-RF-G-02 | Propuesto (roles) |
| RF-G-03 | Organizaciones y pertenencia de usuarios. Si el MVP es de una sola organización, se implementa igualmente el aislamiento por `organization_id`. | PM §8 | Must | US-G-03 | SCR-14 | T-RF-G-03 | `[PENDIENTE ALCANCE]` (C-12) |
| RF-G-04 | Búsqueda global y avanzada con facetas (tipo de entidad, sector, ubicación, fecha, estado, fuente) y resaltado de coincidencias. | PM §9 | Must | US-G-04 | SCR-10 | T-RF-G-04 | Derivado PM |
| RF-G-05 | Filtros guardables como vistas privadas con nombre; se puede compartir dentro de la organización solo si el rol lo permite. | PM §4-A | Should | US-G-05 | SCR-10 | T-RF-G-05 | Propuesto |
| RF-G-06 | Watchlist multi-entidad: empresas, proyectos, permisos, licitaciones, instrumentos y oportunidades; con estado y notas. | PM §9 | Must | US-G-06 | SCR-11 | T-RF-G-06 | Derivado PM |
| RF-G-07 | Preferencias de alerta por tipo de entidad, sector, ubicación, palabra clave y frecuencia; con opción de pausar. | PM §5, §9 | Must | US-G-07 | SCR-13 | T-RF-G-07 | Derivado PM |
| RF-G-08 | Notificaciones in-app en el MVP; correo electrónico como canal adicional `[PENDIENTE SRS]`. Registro de entrega y error. | PM §5 | Must | US-G-08 | SCR-12 | T-RF-G-08 | `[PENDIENTE SRS]` (canales) |
| RF-G-09 | Configuración de usuario: nombre, tema claro/oscuro/sistema, zona horaria, idioma, resumen de alertas y eliminación de cuenta. | PM §9 | Must | US-G-09 | SCR-13 | T-RF-G-09 | Derivado PM |
| RF-G-10 | Dashboard con KPIs de actividad, novedades priorizadas, vencimientos próximos y estado de frescura de datos. | PM §9 | Must | US-G-10 | SCR-01 | T-RF-G-10 | Derivado PM |
| RF-G-11 | Mapa de proyectos con filtros y agrupación; si no hay coordenadas, agrupa por provincia y lo indica. | PM §9 | Could | US-G-11 | SCR-09 | T-RF-G-11 | Derivado PM |
| RF-G-12 | Panel administrativo: fuentes y estado de ingesta, cola de revisión de IA, usuarios y roles, incidencias y auditoría. | PM §9, §10 | Must | US-G-12 | SCR-14 | T-RF-G-12 | Derivado PM |
| RF-G-13 | Auditoría de acciones sensibles: inicio de sesión administrativo, cambios de rol, publicación/rechazo, edición de entidades y cambios de fuente. | PM §10 | Must | US-G-13 | SCR-14 | T-RF-G-13 | Derivado PM |
| RF-G-14 | Etiquetado visible de datos demo en cualquier pantalla y exclusión de demo en métricas de producción. | PM §9 | Must | US-G-14 | Todas | T-RF-G-14 | Derivado PM |
| RF-G-15 | Aviso legal y de limitación de responsabilidad accesible; consentimiento en el registro y enlace a privacidad. | PM §10 | Must | US-G-15 | AUTH, SCR-13 | T-RF-G-15 | `[PENDIENTE LEGAL]` |
| RF-G-16 | Exportación de resultados filtrados a CSV `[PENDIENTE ALCANCE]`; PDF solo para fichas concretas. | — | Could | US-G-16 | SCR-10, SCR-07 | T-RF-G-16 | `[PENDIENTE ALCANCE]` |

---

## 4. Requisitos no funcionales medibles

> **Importante.** El PM §11 exige objetivos medibles, pero **no publica cifras**. Todas las metas de esta tabla son **propuestas de la Ventana B** para discusión y aprobación; no son requisitos de la SRS. Ninguna se declara cumplida sin medición registrada (Contrato §5). La columna “Evidencia” indica el artefacto que probará el cumplimiento.

### 4.1 Rendimiento y capacidad

| ID | Objetivo medible (propuesto) | Método de medición | Evidencia | Pri. | Estado |
|---|---|---|---|---|---|
| RNF-01 | Web: LCP p75 ≤ 2,5 s, INP p75 ≤ 200 ms, CLS ≤ 0,1 en 4G/equipo medio, en las 5 rutas más usadas. | Lighthouse CI en cada PR + RUM tras el piloto. | Informe Lighthouse archivado por build. | Must | Propuesto |
| RNF-02 | API de lectura: p95 ≤ 500 ms; escrituras p95 ≤ 2 s; listados de 50 filas p95 ≤ 800 ms, con un **dataset de prueba sintético** de 100 000 eventos y 10 000 proyectos (**no** es el volumen real esperado, que se desconoce). Si se carga el histórico completo de DGCP, el dataset debe incluir además licitaciones/adjudicaciones/contratos del orden de 10⁶ filas (cifras de la ficha OCP citadas en FUENTES-RD §2) `[PENDIENTE: decisión G0 sobre profundidad histórica]`. | Prueba de carga k6/Artillery contra staging con dataset sembrado. | Resumen k6 (p50/p95/p99, errores). | Must | Propuesto |
| RNF-03 | Búsqueda: p95 ≤ 1 s para consultas de 1–3 términos sobre 100 000 eventos. | Benchmark de búsqueda + EXPLAIN de las 10 consultas más frecuentes, sobre el mismo dataset sintético de RNF-02. | Informe de consultas y plan de ejecución. | Must | Propuesto |
| RNF-04 | Capacidad inicial: 50 usuarios concurrentes y 20 ingestas simultáneas sin degradar RNF-02. | Prueba de carga escalonada hasta 2× el objetivo. | Curva de latencia vs usuarios. | Should | Propuesto |

### 4.2 Disponibilidad, fiabilidad y recuperación

| ID | Objetivo medible (propuesto) | Método de medición | Evidencia | Pri. | Estado |
|---|---|---|---|---|---|
| RNF-05 | Disponibilidad mensual ≥ 99,5 % para la aplicación (fuera de mantenimientos anunciados). | Monitor sintético cada 5 min + registro de incidentes. | Informe mensual de uptime y post-mortems. | Must | Propuesto |
| RNF-06 | Cero pérdida de documentos aceptados; reprocesamiento idempotente (mismo documento no duplica evento ni evidencia). | Prueba de reejecución + reconciliación semanal de conteos. | Informe de reconciliación. | Must | Propuesto |
| RNF-07 | Tasa de fallo de jobs de ingesta < 1 % diario; reintentos con backoff y alerta tras 3 fallos. | Métricas del worker + alertas. | Panel de jobs y registro de reintentos. | Must | Propuesto |
| RNF-08 | Entrega de alertas ≥ 99 % en 5 minutos desde la publicación del evento. | Prueba sintética de alerta + medición `delivered_at - published_at`. | Informe de latencia de alertas. | Must | Propuesto |
| RNF-09 | RPO ≤ 24 h y RTO ≤ 4 h; restauración probada al menos una vez antes del lanzamiento. | Simulacro de restauración documentado. | Acta del simulacro con tiempos reales. | Must | Propuesto |

### 4.3 Calidad de datos y frescura

| ID | Objetivo medible (propuesto) | Método de medición | Evidencia | Pri. | Estado |
|---|---|---|---|---|---|
| RNF-10 | 100 % de eventos publicados con al menos una evidencia y URL oficial resoluble. | Consulta SQL de integridad + prueba E2E de enlace. | Informe DQ-01. | Must | Propuesto |
| RNF-11 | ≥ 95 % de eventos con sector asignado y ≥ 90 % con ubicación a provincia (cuando la fuente la publique). | Perfilado mensual por fuente. | Informe DQ-02. | Must | Propuesto |
| RNF-12 | Duplicados ≤ 2 % en una muestra auditada de 100 registros por módulo y mes. | Muestreo manual + reglas automáticas. | Informe DQ-03 con casos revisados. | Must | Propuesto |
| RNF-13 | 100 % de fechas en ISO 8601 UTC en almacenamiento y 0 fechas futuras fuera de tolerancia (±5 min) salvo programadas. | Validación en ingesta + consulta de anomalías. | Informe DQ-04. | Must | Propuesto |
| RNF-14 | 100 % de montos con código ISO 4217; 0 montos sin moneda publicados; 0 sumas entre monedas distintas. | Validación de esquema + revisión de consultas de agregación. | Informe DQ-05. | Must | Propuesto |
| RNF-15 | Frescura: p95 `detected_at − published_at` ≤ 60 min para fuentes con API/RSS y ≤ 24 h para carga manual. | Medición por fuente y percentiles diarios. | Informe de frescura por fuente. | Must | Propuesto |

### 4.4 IA: precisión, seguridad y costo

| ID | Objetivo medible (propuesto) | Método de medición | Evidencia | Pri. | Estado |
|---|---|---|---|---|---|
| RNF-16 | Extracción de campos críticos (entidad, monto, moneda, fecha, estado): ≥ 90 % de coincidencia exacta (límite **inferior** del IC 95 % de Wilson) en un golden set de ≥ 300 campos por tipo. | Evaluación automática contra anotación humana. | Informe de evals con matriz de confusión. | Must | Propuesto |
| RNF-17 | Clasificación sectorial: macro-F1 ≥ 0,85 en el golden set; ninguna categoría con recall < 0,70. | Evaluación por clase. | Informe de evals. | Should | Propuesto |
| RNF-18 | Grounding: 100 % de oportunidades publicadas con ≥ 1 cita que resuelve a un documento almacenado; 0 cifras sin cita. | Verificador automático + muestreo humano. | Informe AI-GROUND. | Must | Propuesto |
| RNF-19 | Errores materiales en oportunidades publicadas ≤ 2 % (límite superior del IC 95 % de Wilson), con muestra revisada por humano de ≥ 50 al mes y **acumulado móvil ≥ 200** para poder demostrarlo (0 errores en 50 solo acota el error a ≤ 7,1 %). | Revisión ciega con rúbrica + cálculo de IC. | Informe de auditoría de calidad IA. | Must | Propuesto |
| RNF-20 | Resistencia a prompt injection: 100 % de ataques del corpus de prueba no ejecutan instrucciones ni alteran el esquema de salida. | Suite adversarial con ≥ 30 casos. | Informe AI-SEC. | Must | Propuesto |
| RNF-21 | Costo IA ≤ US$0,05 por evento procesado y ≤ US$0,75 por oportunidad publicada; tope mensual definido antes del piloto. | Medición de tokens/costo por ejecución y agregado mensual. | Informe de costo por tarea y por mes. | Must | `[PENDIENTE]` tope mensual |
| RNF-22 | Latencia de análisis IA: p95 ≤ 90 s por evento; p95 ≤ 5 min por lote de 10 eventos. | Trazas de `ai_analysis_runs`. | Informe de latencia IA. | Should | Propuesto |

### 4.5 Seguridad, privacidad y cumplimiento

| ID | Objetivo medible (propuesto) | Método de medición | Evidencia | Pri. | Estado |
|---|---|---|---|---|---|
| RNF-23 | 100 % de endpoints no públicos exigen autenticación y autorización; 0 hallazgos críticos/altos abiertos > 7 días. | Revisión de rutas + `npm audit` + escaneo DAST. | Informe SEC-01 y registro de vulnerabilidades. | Must | Propuesto |
| RNF-24 | RLS: 100 % de tablas con datos de usuario/organización cubiertas por políticas; 0 fugas en la matriz rol × entidad. | Suite de pruebas RLS con usuarios de cada rol. | Informe SEC-RLS con casos. | Must | Propuesto |
| RNF-25 | 100 % de acciones administrativas y publicaciones IA registradas en auditoría con actor, fecha y antes/después. | Revisión de tabla de auditoría y pruebas. | Informe SEC-AUDIT. | Must | Propuesto |
| RNF-26 | Secretos: 0 credenciales en repo; escaneo en CI bloqueante. | `gitleaks`/similar en CI (herramienta a aprobar). | Log de CI. | Must | Propuesto |
| RNF-27 | Revisión legal de RD completada antes de mostrar recomendaciones personalizadas o comercializar instrumentos. | Checklist legal firmado. | Acta de aprobación legal. | Must | `[PENDIENTE LEGAL]` |
| RNF-28 | Datos personales: minimización, consentimiento y borrado de cuenta en ≤ 30 días. | Revisión de flujo + prueba de borrado. | Informe PRIV-01. | Must | `[PENDIENTE LEGAL]` |

### 4.6 Accesibilidad, usabilidad y compatibilidad

| ID | Objetivo medible (propuesto) | Método de medición | Evidencia | Pri. | Estado |
|---|---|---|---|---|---|
| RNF-29 | WCAG 2.2 nivel AA: 0 violaciones `critical`/`serious` de axe en las 14 pantallas; contraste de texto ≥ 4,5:1 y de componentes ≥ 3:1. | axe-core en Playwright + revisión manual de teclado y lector. | Informe A11Y por pantalla. | Must | Propuesto |
| RNF-30 | 100 % de flujos críticos operables solo con teclado (login, radar, detalle, guardar, alertas, admin). | Recorrido manual guiado + prueba Playwright de teclado. | Grabación/checklist A11Y-KEY. | Must | Propuesto |
| RNF-31 | Responsive sin recortes ni scroll horizontal en 375, 768, 1024 y 1440 px; tablas densas con alternativa en móvil. | Capturas automatizadas en 4 anchos por pantalla. | Carpeta de capturas por build. | Must | Propuesto |
| RNF-32 | Navegadores: últimas 2 versiones de Chrome, Edge, Firefox y Safari; 0 errores de consola en flujos críticos. | Matriz de pruebas E2E (Chromium/WebKit; Firefox a evaluar). | Informe de matriz. | Should | Propuesto |
| RNF-33 | Time to first insight: un usuario nuevo guarda su primera oportunidad en ≤ 10 min en prueba de usabilidad con ≥ 5 participantes. | Test moderado, medición de tarea. | Informe de usabilidad (piloto). | Should | Propuesto |

### 4.7 Mantenibilidad, observabilidad y operación

| ID | Objetivo medible (propuesto) | Método de medición | Evidencia | Pri. | Estado |
|---|---|---|---|---|---|
| RNF-34 | Cobertura de pruebas ≥ 70 % en lógica de dominio (no se exige en UI presentacional); 0 errores de tipos y lint en `main`. | Vitest coverage + CI. | Reporte de cobertura y log de CI. | Must | Propuesto |
| RNF-35 | Observabilidad: logs estructurados con `request_id`, trazas de ingesta/IA y 4 alertas mínimas (fuente caída, error rate, cola atascada, costo IA). | Revisión de paneles y simulación de fallo. | Captura del panel + acta de simulacro. | Must | Propuesto |
| RNF-36 | Documentación operativa: runbook de ingesta, IA, alertas, backups y rollback probado en staging. | Ensayo de rollback. | Acta de despliegue/rollback. | Must | Propuesto |
| RNF-37 | Deuda técnica: 0 `TODO` sin issue asociado en código de dominio al cerrar el MVP. | Revisión de repositorio. | Informe de cierre. | Should | Propuesto |

---

## 5. Reglas de negocio transversales (invariantes del producto)

Estas reglas no son “features”: son restricciones que toda pantalla y todo servicio deben respetar.

| ID | Regla | Verificación |
|---|---|---|
| RN-01 | **Fuente primero.** Ningún dato de negocio se muestra sin `source_document_id` o `source_url`; si falta, se muestra “No disponible” y el motivo. | Prueba de contrato de datos + revisión de UI. |
| RN-02 | **Hecho ≠ análisis ≠ inferencia.** Cada bloque de contenido declara su capa de confianza (`confirmed`, `ai_analysis`, `inference`) y usa el patrón visual definido en `docs/ux/SISTEMA-DISENO.md`. | Revisión visual + prueba de componente `TrustLayerBadge`. |
| RN-03 | **Registro ≠ aprobación.** Un permiso solo alcanza `permit_approved` con documento de aprobación. | Prueba de transición de estado (T-RF-B-04). |
| RN-04 | **No recomendación.** No se emite consejo personalizado ni se promete rendimiento. | Revisión de textos + checklist legal. |
| RN-05 | **No disponibilidad supuesta.** Un instrumento no se muestra como comprable sin confirmación de la fuente. | Prueba E2E de ficha de instrumento. |
| RN-06 | **Cifra con cita.** Toda cifra (monto, tasa, plazo) tiene cita y moneda/unidad; el publicador bloquea si falta. | Verificador AI-GROUND + prueba de publicación. |
| RN-07 | **Revisión humana.** Una oportunidad no se publica sin revisor identificado en el MVP. | Prueba de flujo `in_review`. |
| RN-08 | **Demo etiquetado.** `is_demo` visible y excluido de métricas. | Prueba de datos + revisión de dashboard. |
| RN-09 | **Zona horaria.** Almacenamiento UTC; visualización `America/Santo_Domingo` (UTC−4, sin horario de verano). Las fechas límite muestran zona. | Prueba de formato y de cuenta atrás. |
| RN-10 | **Moneda.** Nunca se suman montos de monedas distintas sin conversión con fuente y fecha. | Prueba de agregaciones. |
| RN-11 | **Borrado y retención.** Los documentos fuente se conservan según política de la Ventana A; las notas privadas se borran con la cuenta. | Prueba de borrado + revisión de políticas. |
| RN-12 | **Trazabilidad de IA.** Cada salida generada registra modelo, versión, prompt, fecha y evidencia usada. | Inspección de `ai_analysis_runs` + prueba. |

---

## 6. Cobertura por pantalla

> Comprueba que ninguna pantalla queda huérfana y que ningún requisito queda sin superficie de uso. El detalle funcional está en `docs/ux/INVENTARIO-PANTALLAS.md`.

| Pantalla | Requisitos principales | Prioridad |
|---|---|---|
| SCR-01 Dashboard | RF-G-10, RF-A-09, RF-C-09, RF-D-02, RF-F-03 | Must |
| SCR-02 Radar de acontecimientos | RF-A-01 … RF-A-13, RF-G-04 | Must |
| SCR-03 Explorador de proyectos | RF-B-01 … RF-B-11, RF-E-02 | Must |
| SCR-04 Permisos y autorizaciones | RF-B-01, RF-B-03 … RF-B-08, RF-B-10, RF-B-11 | Must |
| SCR-05 Licitaciones | RF-D-01 … RF-D-10 | Must |
| SCR-06 Instrumentos financieros | RF-C-01 … RF-C-13 | Must |
| SCR-07 Explorador de oportunidades | RF-F-01 … RF-F-14, RF-B-09, RF-D-08 | Must |
| SCR-08 Detalle de empresas | RF-E-02 … RF-E-09, RF-D-05 | Must (mínimo) |
| SCR-09 Mapa de proyectos | RF-B-07, RF-G-11 | Could |
| SCR-10 Buscador avanzado | RF-G-04, RF-G-05, RF-A-08, RF-B-10, RF-D-06 | Must |
| SCR-11 Watchlist | RF-G-06, RF-F-12, RF-E-07 | Must |
| SCR-12 Centro de alertas | RF-A-09, RF-C-10, RF-D-09, RF-G-07, RF-G-08 | Must |
| SCR-13 Configuración de usuario | RF-G-01, RF-G-07, RF-G-09, RF-G-15 | Must |
| SCR-14 Panel administrativo | RF-G-02, RF-G-03, RF-G-12, RF-G-13, RF-A-11, RF-F-11 | Must |
| Auxiliar AUTH (login/registro/recuperación) | RF-G-01, RF-G-15 | Must |

---

## 7. Vacíos declarados `[PENDIENTE SRS]`

| ID | Vacío | Qué falta exactamente | Consecuencia actual |
|---|---|---|---|
| V-01 | Requisitos funcionales formales | La SRS no existe; no hay numeración, priorización ni criterios oficiales. | Los RF de este documento son derivados del PM y provisionales. |
| V-02 | Requisitos no funcionales oficiales | El PM exige métricas pero no fija valores. | Todas las metas de §4 son propuestas. |
| V-03 | Modelo de negocio y planes | No hay precios, límites por plan ni definición de suscripción. | SCR-13/SCR-14 no pueden mostrar plan ni límites reales. |
| V-04 | Canales de alerta | El PM dice “notificaciones” sin especificar in-app, correo, push o SMS. | MVP asume in-app; correo marcado pendiente. |
| V-05 | Fórmulas de la calculadora financiera | No se define convención (nominal/efectiva, 30/360, reinversión). | RF-C-07 queda en Should y bloqueado hasta decisión. |
| V-06 | Criterios “oportunidad para PyME” | No se define tamaño, monto ni requisitos. | RF-D-07 queda Should y configurable. |
| V-07 | Multi-tenant / organizaciones | No se define si hay varias empresas clientes. | RF-G-03 marcado pendiente de alcance. |
| V-08 | Política de exportación | No se menciona exportar datos. | RF-G-16 marcado pendiente de alcance. |
| V-09 | Requisitos legales y disclaimer | No hay texto legal ni revisión jurídica. | RF-G-15 y RNF-27 bloqueados por revisión legal. |
| V-10 | Fuentes y cobertura real | La Ventana A no ha validado APIs, licencias ni formatos. | La cobertura por fuente es desconocida; las pantallas deben declarar “cobertura pendiente”. |
| V-11 | Precisión objetivo de IA | El PM pide medir precisión, no fija umbrales. | RNF-16…RNF-22 son propuestas. |
| V-12 | Marca y tono oficiales | Solo hay referencias visuales previas de AviTech, no un manual de este producto. | El sistema de diseño es una propuesta. |

---

## 8. Contradicciones y decisiones pendientes

> Formato: hecho → opciones → recomendación. **Ninguna se resuelve unilateralmente**; las aprueba el usuario (Contrato §7).

| ID | Contradicción / ambigüedad | Opciones | Recomendación de la Ventana B | Impacto si no se decide |
|---|---|---|---|---|
| C-01 | La SRS y el Plan Maestro no existen, pero el Contrato los exige como fuente de verdad. | (a) Esperar; (b) avanzar con PM y marcar vacíos. | (b), ya aplicado en este documento. | Trazabilidad incompleta; riesgo de retrabajo. |
| C-02 | El PM lista 14 pantallas, pero el criterio de MVP exige registro/login y no incluye pantalla de autenticación. | (a) Añadir AUTH como pantalla auxiliar; (b) embeber login en otra pantalla. | (a), fuera del conteo de 14. | Sin flujo de acceso no hay MVP. |
| C-03 | El Módulo E (expansión empresarial) no tiene pantalla propia en la lista de 14. | (a) Ficha de empresa (SCR-08) como superficie; (b) añadir pantalla 15. | (a). | Si no, el módulo E queda sin UI. |
| C-04 | El Módulo C incluye comparador y calculadora, pero los criterios de terminación del MVP solo exigen “visualizar instrumentos”. | (a) Must; (b) Should; (c) Won't. | (b): comparador y calculadora valiosos pero no bloquean MVP. | Alcance ambiguo y estimaciones divergentes. |
| C-05 | “Alertas configurables” sin canal definido. | (a) In-app; (b) in-app + correo; (c) push. | (a) MVP, (b) post-MVP. | Infraestructura de correo y plantillas no presupuestadas. |
| C-06 | Producto SaaS sin planes, precios ni límites definidos. | (a) MVP sin facturación; (b) definir planes ahora. | (a), con campos `plan` reservados. | Panel admin y onboarding incompletos. |
| C-07 | Se pide “detalle de empresas”, pero el modelo del PM usa `organizations`, no `companies`. | (a) `organizations` con `type='company'`; (b) entidad `companies` separada. | (a), alineado con la Ventana A; confirmar. | Duplicidad de entidades y joins inconsistentes. |
| C-08 | El PM dice “hecho que la origina” (singular), pero un evento puede tener varias fuentes y una oportunidad varios eventos. | (a) 1 evento principal + eventos secundarios; (b) N:M. | (a) con `primary_event_id` y tabla de vínculos. | Modelo de datos y ficha inconsistentes. |
| C-09 | Se exige revisión humana y a la vez “operar sin intervención manual constante”. | (a) Revisión humana solo de oportunidades; (b) revisión por muestreo. | (a) en MVP; (b) cuando RNF-19 se cumpla 3 meses. | Cuello de botella operativo o riesgo de publicación errónea. |
| C-10 | El mapa requiere geodatos que las fuentes pueden no publicar. | (a) Mapa solo si hay coordenadas; (b) geocodificar direcciones. | (a) + agrupación por provincia; geocodificación post-MVP. | Pantalla SCR-09 podría quedar vacía. |
| C-11 | “No usar datos ficticios en producción” vs. necesidad de datos para demo y pruebas. | (a) `is_demo` visible; (b) entorno separado. | Ambas: `is_demo` en cualquier entorno y datos de prueba solo en staging. | Riesgo de confundir demo con realidad. |
| C-12 | El modelo incluye `organizations`, pero no se define multi-tenant ni facturación B2B. | (a) Una organización; (b) multi-tenant completo. | (a) MVP con `organization_id` desde el día 1. | RLS y permisos habría que rehacerlos. |
| C-13 | “Instrumentos disponibles” vs. prohibición de presentarlos como comprables. | (a) Estado “No confirmada” + enlace a fuente; (b) ocultar instrumentos no confirmados. | (a). | Fricción comercial o riesgo regulatorio. |
| C-14 | Accesibilidad AA vs. tablas financieras densas y gráficos. | (a) Tabla alternativa + resumen textual; (b) solo versión simplificada. | (a). | Incumplimiento AA y mala experiencia en lector de pantalla. |
| C-15 | El prompt de Ventana B pide esperar `ADELANTE`. | (a) Esperar; (b) ejecutar. | **Resuelta:** el usuario respondió `ADELANTE` con opción (a) (revisar y completar) y el orquestador emitió D-001/D-002. | — |

---

## 9. Criterios de aceptación globales del MVP (verificables)

Estos criterios resumen la definición de “MVP técnicamente terminado”; el detalle por prueba está en `docs/qa/ESTRATEGIA-PRUEBAS.md`.

| ID | Criterio | Verificación (dado/cuando/entonces) |
|---|---|---|
| AC-MVP-01 | Acceso | Dado un visitante, cuando se registra y verifica su correo, entonces puede iniciar sesión y ve el dashboard sin errores de consola. |
| AC-MVP-02 | Radar con evidencia | Dado un evento publicado, cuando el usuario abre su detalle, entonces ve al menos una cita, el documento original y las tres fechas. |
| AC-MVP-03 | Proyectos y permisos | Dado un proyecto en estado `permit_applied`, cuando se abre su ficha, entonces **no** aparece como “aprobado” y se muestra la institución y el expediente si existen. |
| AC-MVP-04 | Licitaciones | Dada una licitación con fecha límite, cuando el usuario la consulta, entonces ve fecha, hora y zona horaria, y el estado `closing_soon` se activa dentro de la ventana configurada. |
| AC-MVP-05 | Instrumentos | Dado un instrumento sin confirmación de disponibilidad, cuando se abre su ficha, entonces no existe CTA de compra y se muestra “Disponibilidad no confirmada”. |
| AC-MVP-06 | Oportunidades | Dada una oportunidad en `draft`, cuando un `opportunity_manager` (o superior) la publica, entonces queda `published` con revisor, fecha, modelo y al menos una cita; si no hay cita, la publicación se bloquea. |
| AC-MVP-07 | Búsqueda | Dado un usuario, cuando busca por texto y aplica dos filtros, entonces obtiene resultados en ≤ 1 s p95 y los filtros quedan en la URL (guardar la vista depende de RF-G-05, Should). |
| AC-MVP-08 | Watchlist | Dado un usuario, cuando guarda una oportunidad, entonces aparece en su watchlist y persiste tras cerrar sesión. |
| AC-MVP-09 | Alertas | Dado un usuario con preferencia de sector energía, cuando se publica un evento de energía, entonces recibe una sola alerta in-app y no se duplica al reabrir. |
| AC-MVP-10 | Permisos | Dado un usuario `viewer`, cuando intenta abrir el panel admin por URL directa, entonces recibe 403 y no ve datos. |
| AC-MVP-11 | Datos demo | Dado un registro `is_demo`, cuando se muestra en cualquier pantalla, entonces lleva la etiqueta “DEMO” y no cuenta en KPIs. |
| AC-MVP-12 | Accesibilidad | Dada cualquier pantalla del inventario, cuando se ejecuta axe y se navega con teclado, entonces hay 0 violaciones críticas/serias y todos los controles son alcanzables. |
| AC-MVP-13 | Seguridad | Dada la matriz rol × entidad, cuando se ejecuta la suite RLS, entonces 0 casos permiten lectura/escritura indebida. |
| AC-MVP-14 | Operación | Dado un fallo simulado de una fuente, cuando ocurre, entonces se genera una alerta operativa y la ingesta se reintenta sin duplicar datos. |
| AC-MVP-15 | Rendimiento | Dado el dataset de prueba, cuando se ejecuta la prueba de carga, entonces se cumplen RNF-01…RNF-03 en staging. |

---

## 10. Decisiones de producto candidatas a ADR

La Ventana B puede registrar ADRs de producto/UX (Contrato §2). Estas decisiones se documentan aquí y se convertirán en ADR si el usuario las aprueba:

| ID | Decisión | Alternativas descartadas | Motivo |
|---|---|---|---|
| D-01 | Tres capas de confianza visuales (`confirmed`, `ai_analysis`, `inference`) con icono + etiqueta + patrón, no solo color. | Badge de color único; texto al pie. | Accesibilidad y confianza; el PM exige distinguir dato de IA e inferencia. |
| D-02 | Revisión humana obligatoria de oportunidades en el MVP. | Publicación automática con muestreo. | PM §5 y riesgo reputacional; se relaja solo con evidencia (RNF-19). |
| D-03 | Sin chat de IA en el MVP. | Añadir asistente conversacional. | No está en las 14 pantallas; evita alcance y costo no presupuestados. |
| D-04 | Mapa como Could; ficha de empresa como Must mínimo. | Ambas Must; ambas Could. | El mapa depende de geodatos no garantizados; la empresa es necesaria para el Módulo E. |
| D-05 | Alertas in-app en MVP; correo post-MVP. | Correo desde el día 1. | Menor infraestructura y riesgo; el PM no especifica canal. |
| D-06 | `organizations` como entidad de empresa (`type='company'`) hasta que la Ventana A confirme el modelo. | Crear `companies` ahora. | Evita duplicar entidades antes del modelo de datos. |
| D-07 | Calculadora financiera en Should, bloqueada hasta definir fórmulas. | Must con fórmula improvisada. | Regla 6 del PM: no publicar información financiera sin trazabilidad. |

---

## 11. Registro de cambios

| Versión | Fecha | Cambio | Autor |
|---|---|---|---|
| 0.1.0 | 2026-11-15 | Creación: 86 requisitos funcionales, 37 RNF, 12 reglas de negocio, 15 criterios de MVP, 15 contradicciones y 12 vacíos. | Ventana B |
| 0.4.0 | 2026-11-15 | Ronda 3 (G0): §2.4 con el efecto del acta (Post-MVP, cobertura manual, histórico de N años, puerta P0); sin renumerar requisitos. | Ventana B |
| 0.3.0 | 2026-11-15 | Ronda 2: RNF-02/03 aclaran que 100 000 eventos es dataset de prueba y que el histórico de DGCP puede multiplicarlo; sin otros cambios de alcance. | Ventana B |
| 0.2.0 | 2026-11-15 | Revisión D-002: RF-B-04 pasa a US-B-04 (antes duplicaba US-B-03); AC-MVP-06 alineado con la matriz de roles (publica el gestor, no el analista); `closing_soon` definido (≤ 72 h, propuesto); C-15 cerrada. AC-MVP-07 desacoplado de RF-G-05 (Should). Conteos de Anexo A verificados por script (86 RF; 65/18/3). RNF-16 y RNF-19 reformulados con intervalo de confianza y tamaño de muestra (ver `docs/qa/ESTRATEGIA-PRUEBAS.md` §8.3). | Ventana B |

---

## Anexo A — Conteo de cobertura

| Módulo | Requisitos | Must | Should | Could |
|---|---|---|---|---|
| A — Radar | 13 | 12 | 1 | 0 |
| B — Permisos y proyectos | 11 | 9 | 2 | 0 |
| C — Instrumentos | 13 | 9 | 4 | 0 |
| D — Licitaciones | 10 | 7 | 3 | 0 |
| E — Expansión | 9 | 4 | 4 | 1 |
| F — Oportunidades | 14 | 11 | 3 | 0 |
| G — Plataforma | 16 | 13 | 1 | 2 |
| **Total RF** | **86** | **65** | **18** | **3** |
| **Total RNF** | **37** | **31** | **6** | **0** |

> Este conteo se verifica con el script de control del repositorio (ver `docs/qa/ESTRATEGIA-PRUEBAS.md` §12). Si la SRS cambia la numeración, se actualiza el anexo y la tabla de equivalencias.

## Anexo B — Trazabilidad requisito → historia → pantalla → prueba (resumen)

| Requisito | Historia | Pantalla | Prueba | Nivel principal |
|---|---|---|---|---|
| RF-A-01 | US-A-01 | SCR-02, SCR-14 | T-RF-A-01 | Integración |
| RF-A-02 | US-A-02 | SCR-02 | T-RF-A-02 | IA + integración |
| RF-A-03 | US-A-03 | SCR-02 | T-RF-A-03 | Integración |
| RF-A-04 | US-A-04 | SCR-02, SCR-14 | T-RF-A-04 | Integración + datos |
| RF-A-05 | US-A-05 | SCR-02 | T-RF-A-05 | E2E |
| RF-A-06 | US-A-06 | SCR-02 | T-RF-A-06 | Unitaria + datos |
| RF-A-07 | US-A-07 | SCR-02, SCR-08 | T-RF-A-07 | Integración |
| RF-A-08 | US-A-08 | SCR-02, SCR-10 | T-RF-A-08 | E2E + carga |
| RF-A-09 | US-A-09 | SCR-12 | T-RF-A-09 | Integración |
| RF-A-10 | US-A-10 | SCR-02 | T-RF-A-10 | E2E |
| RF-A-11 | US-A-11 | SCR-02 | T-RF-A-11 | Unitaria + E2E |
| RF-A-12 | US-A-12 | SCR-02 | T-RF-A-12 | Integración |
| RF-A-13 | US-A-13 | Todas | T-RF-A-13 | E2E |
| RF-B-01 | US-B-01 | SCR-03, SCR-04 | T-RF-B-01 | Datos |
| RF-B-02 | US-B-02 | SCR-03, SCR-04 | T-RF-B-02 | E2E |
| RF-B-03 | US-B-03 | SCR-03, SCR-04 | T-RF-B-03 | Unitaria |
| RF-B-04 | US-B-04 | SCR-03, SCR-04 | T-RF-B-04 | Unitaria + E2E |
| RF-B-05 | US-B-05 | SCR-04 | T-RF-B-05 | E2E |
| RF-B-06 | US-B-06 | SCR-03, SCR-04 | T-RF-B-06 | Integración |
| RF-B-07 | US-B-07 | SCR-03, SCR-09 | T-RF-B-07 | Datos |
| RF-B-08 | US-B-08 | SCR-03, SCR-04 | T-RF-B-08 | Unitaria + E2E |
| RF-B-09 | US-B-09 | SCR-03, SCR-07 | T-RF-B-09 | Integración |
| RF-B-10 | US-B-10 | SCR-03, SCR-04 | T-RF-B-10 | E2E |
| RF-B-11 | US-B-11 | SCR-03, SCR-04 | T-RF-B-11 | Integración |
| RF-C-01 | US-C-01 | SCR-06 | T-RF-C-01 | Integración |
| RF-C-02 | US-C-02 | SCR-06 | T-RF-C-02 | Integración |
| RF-C-03 | US-C-03 | SCR-06 | T-RF-C-03 | Integración |
| RF-C-04 | US-C-04 | SCR-06 | T-RF-C-04 | Unitaria + E2E |
| RF-C-05 | US-C-05 | SCR-06 | T-RF-C-05 | Unitaria + E2E |
| RF-C-06 | US-C-06 | SCR-06 | T-RF-C-06 | E2E |
| RF-C-07 | US-C-07 | SCR-06 | T-RF-C-07 | Unitaria |
| RF-C-08 | US-C-08 | SCR-06 | T-RF-C-08 | Integración |
| RF-C-09 | US-C-09 | SCR-06, SCR-01 | T-RF-C-09 | E2E |
| RF-C-10 | US-C-10 | SCR-12 | T-RF-C-10 | Integración |
| RF-C-11 | US-C-11 | SCR-06 | T-RF-C-11 | E2E |
| RF-C-12 | US-C-12 | SCR-06 | T-RF-C-12 | E2E + revisión de textos |
| RF-C-13 | US-C-13 | SCR-06 | T-RF-C-13 | E2E |
| RF-D-01 | US-D-01 | SCR-05 | T-RF-D-01 | Integración |
| RF-D-02 | US-D-02 | SCR-05 | T-RF-D-02 | Unitaria + E2E |
| RF-D-03 | US-D-03 | SCR-05 | T-RF-D-03 | Unitaria |
| RF-D-04 | US-D-04 | SCR-05 | T-RF-D-04 | Integración |
| RF-D-05 | US-D-05 | SCR-05, SCR-08 | T-RF-D-05 | Integración |
| RF-D-06 | US-D-06 | SCR-05 | T-RF-D-06 | Integración |
| RF-D-07 | US-D-07 | SCR-05 | T-RF-D-07 | E2E |
| RF-D-08 | US-D-08 | SCR-05, SCR-07 | T-RF-D-08 | E2E + revisión |
| RF-D-09 | US-D-09 | SCR-12 | T-RF-D-09 | Integración |
| RF-D-10 | US-D-10 | SCR-05 | T-RF-D-10 | E2E |
| RF-E-01 | US-E-01 | SCR-02, SCR-08 | T-RF-E-01 | Datos |
| RF-E-02 | US-E-02 | SCR-08 | T-RF-E-02 | Integración |
| RF-E-03 | US-E-03 | SCR-08 | T-RF-E-03 | E2E |
| RF-E-04 | US-E-04 | SCR-08 | T-RF-E-04 | E2E |
| RF-E-05 | US-E-05 | SCR-08 | T-RF-E-05 | Datos |
| RF-E-06 | US-E-06 | SCR-08 | T-RF-E-06 | Datos |
| RF-E-07 | US-E-07 | SCR-08, SCR-11 | T-RF-E-07 | Integración |
| RF-E-08 | US-E-08 | SCR-14 | T-RF-E-08 | Integración + datos |
| RF-E-09 | US-E-09 | SCR-08, SCR-07 | T-RF-E-09 | Revisión + E2E |
| RF-F-01 | US-F-01 | SCR-07 | T-RF-F-01 | Unitaria + integración |
| RF-F-02 | US-F-02 | SCR-07 | T-RF-F-02 | Unitaria |
| RF-F-03 | US-F-03 | SCR-07 | T-RF-F-03 | E2E |
| RF-F-04 | US-F-04 | SCR-07 | T-RF-F-04 | Unitaria + E2E |
| RF-F-05 | US-F-05 | SCR-07 | T-RF-F-05 | Unitaria |
| RF-F-06 | US-F-06 | SCR-07 | T-RF-F-06 | Unitaria + E2E |
| RF-F-07 | US-F-07 | SCR-07 | T-RF-F-07 | E2E |
| RF-F-08 | US-F-08 | SCR-07 | T-RF-F-08 | Unitaria |
| RF-F-09 | US-F-09 | SCR-07 | T-RF-F-09 | E2E |
| RF-F-10 | US-F-10 | SCR-07, SCR-14 | T-RF-F-10 | IA + revisión |
| RF-F-11 | US-F-11 | SCR-07, SCR-14 | T-RF-F-11 | E2E + seguridad |
| RF-F-12 | US-F-12 | SCR-07, SCR-11 | T-RF-F-12 | E2E |
| RF-F-13 | US-F-13 | SCR-07 | T-RF-F-13 | Integración |
| RF-F-14 | US-F-14 | SCR-07 | T-RF-F-14 | Integración |
| RF-G-01 | US-G-01 | AUTH | T-RF-G-01 | E2E + seguridad |
| RF-G-02 | US-G-02 | SCR-14 | T-RF-G-02 | Seguridad (RLS) |
| RF-G-03 | US-G-03 | SCR-14 | T-RF-G-03 | Seguridad (RLS) |
| RF-G-04 | US-G-04 | SCR-10 | T-RF-G-04 | E2E + carga |
| RF-G-05 | US-G-05 | SCR-10 | T-RF-G-05 | E2E |
| RF-G-06 | US-G-06 | SCR-11 | T-RF-G-06 | E2E |
| RF-G-07 | US-G-07 | SCR-13 | T-RF-G-07 | E2E |
| RF-G-08 | US-G-08 | SCR-12 | T-RF-G-08 | Integración |
| RF-G-09 | US-G-09 | SCR-13 | T-RF-G-09 | E2E |
| RF-G-10 | US-G-10 | SCR-01 | T-RF-G-10 | E2E |
| RF-G-11 | US-G-11 | SCR-09 | T-RF-G-11 | E2E |
| RF-G-12 | US-G-12 | SCR-14 | T-RF-G-12 | E2E + seguridad |
| RF-G-13 | US-G-13 | SCR-14 | T-RF-G-13 | Seguridad |
| RF-G-14 | US-G-14 | Todas | T-RF-G-14 | E2E |
| RF-G-15 | US-G-15 | AUTH, SCR-13 | T-RF-G-15 | Revisión legal + E2E |
| RF-G-16 | US-G-16 | SCR-10, SCR-07 | T-RF-G-16 | E2E (si se aprueba) |

> Las pruebas RNF se identifican como `T-RNF-nn` en la estrategia de pruebas. La matriz completa RNF → método → evidencia está en §4.
