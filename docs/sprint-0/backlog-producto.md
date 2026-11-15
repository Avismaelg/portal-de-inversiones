# Backlog de producto — AviTech Investment Intelligence

| Campo | Valor |
|---|---|
| Documento | `docs/sprint-0/backlog-producto.md` |
| Versión | 0.2.0 (Sprint 0, Ronda 2) |
| Fecha | 2026-11-15 |
| Autor | Ventana B |
| Estado | **BORRADOR PARA APROBACIÓN** |
| Fuentes | `docs/producto/REQUISITOS-Y-TRAZABILIDAD.md` v0.2.0 (prioridades y IDs), `docs/ux/INVENTARIO-PANTALLAS.md`, `docs/qa/ESTRATEGIA-PRUEBAS.md`, Prompt Maestro §12–§16 |
| Backlog técnico | `docs/sprint-0/backlog-tecnico.md` (Ventana A, 61 tareas, 168,5 días-persona) — **leído completo en la Ronda 2**; las dependencias usan sus IDs `T-*` |

> **Honestidad sobre las estimaciones.** No hay equipo definido, velocidad medida ni historial. Los **puntos de historia** son una escala **relativa** (Fibonacci: 1, 2, 3, 5, 8, 13) asignada por la Ventana B para ordenar el esfuerzo; **no son horas ni días**, y no se han calibrado con nadie que vaya a construir. El roadmap de 16 semanas (§4) es un **escenario** cuya viabilidad depende de la capacidad real, hoy `[PENDIENTE]`. Cuando exista un backlog técnico de la Ventana A, las estimaciones se reconcilian y prevalecen las del equipo que construye.

> **Fuente de la prioridad.** La columna “Pri.” se lee de la matriz de requisitos (una sola fuente); si cambia allí, este documento se regenera. Cada historia tiene un requisito `RF-*` y una prueba `T-RF-*` (Anexo B de REQUISITOS).

---

## 1. Cómo se leen las historias

- **ID:** `US-<módulo>-<nn>` (mismo identificador que la matriz). **Req.:** requisito del que deriva.
- **Pri.:** MoSCoW (Must/Should/Could). *Won’t* se lista en §3.
- **Pts:** puntos relativos (§0). **Sprint:** sprint de entrega propuesto (S1–S8, 2 semanas cada uno; §4).
- **Dep. técnicas:** IDs de tareas de `backlog-tecnico.md` que la historia necesita (T-INF, T-SRC, T-ING, T-WEB, T-AI), o `EN-xx` (habilitadores de B). **BRECHA** = la historia no tiene tarea en A. `*` = condicional. Una historia con dependencia **no empieza** hasta que A entregue y el usuario apruebe esa pieza.
- **Aceptación:** criterio verificable resumido (dado/cuando/entonces). El detalle por pantalla está en `INVENTARIO-PANTALLAS.md` y `FICHAS-CLAVE.md`; las pruebas en `ESTRATEGIA-PRUEBAS.md`.
- **Definición de “hecha” (DoD) común:** código revisado, pruebas unitarias/integración añadidas y **ejecutadas con resultado archivado**, criterio de aceptación comprobado, sin errores de lint/tipos, A11Y básica comprobada si hay UI, documentación actualizada y trazabilidad al día. Una historia no está “hecha” si sus pruebas no se ejecutaron (Contrato §5).

---

## 2. Historias por módulo

### A — Radar de inteligencia económica

Subtotal: **13 historias · 73 pts**.

| ID | Req. | Pri. | Historia | Pts | Sprint | Dep. técnicas (IDs de A) | Aceptación |
|---|---|---|---|---|---|---|---|
| US-A-01 | RF-A-01 | Must | Como administrador quiero que las fuentes autorizadas se ingieran de forma programada y registren cada documento, para tener datos frescos y trazables. | 8 | S2 | T-INF-09, T-ING-01, T-ING-02, T-ING-03, T-ING-08 | Dada una fuente configurada, cuando corre el job, entonces se crea `source_document` con URL, hash y `captured_at`; re-ejecutar no duplica. |
| US-A-02 | RF-A-02 | Must | Como analista quiero que los eventos se clasifiquen en las 11 categorías con confianza, para filtrar por sector. | 8 | S3 | T-AI-03, T-AI-05 | Dado un evento, cuando se clasifica, entonces tiene sector y confianza; una corrección manual queda auditada. |
| US-A-03 | RF-A-03 | Must | Como usuario quiero que varios documentos formen un mismo evento, para ver una visión consolidada. | 5 | S2 | T-ING-09, T-WEB-03 | Dados 2 documentos del mismo hecho, cuando se agrupan, entonces hay 1 evento con 2 fuentes. |
| US-A-04 | RF-A-04 | Must | Como administrador quiero deduplicar documentos y eventos con posibilidad de deshacer, para evitar ruido. | 8 | S2 | T-ING-02, T-ING-09 | Dado el mismo hash, cuando se reingesta, entonces no hay evento nuevo; una fusión se puede deshacer. |
| US-A-05 | RF-A-05 | Must | Como analista quiero abrir la evidencia (cita, documento original) de un evento, para verificar el dato. | 5 | S2 | T-AI-02, T-WEB-03 | Dado un evento publicado, cuando abro la evidencia, entonces veo cita, página, URL, hash y el original en pestaña nueva. |
| US-A-06 | RF-A-06 | Must | Como usuario quiero ver publicación, detección y actualización, para saber qué tan fresco es. | 2 | S2 | T-WEB-03 | Dado un evento, cuando lo abro, entonces veo las 3 fechas en `America/Santo_Domingo` con UTC en tooltip. |
| US-A-07 | RF-A-07 | Must | Como analista quiero ver organizaciones, sectores y ubicaciones vinculados y si son confirmados o inferidos, para entender el contexto. | 5 | S3 | T-AI-04, T-ING-09 | Dado un vínculo, cuando se muestra, entonces declara `confirmed` o `inferred`. |
| US-A-08 | RF-A-08 | Must | Como usuario quiero buscar y filtrar eventos por sector, organización, lugar, fecha, fuente y verificación, para encontrar lo relevante. | 8 | S2 | T-WEB-02 | Dados 3 filtros, cuando recargo, entonces se conservan en la URL y los resultados coinciden. |
| US-A-09 | RF-A-09 | Must | Como usuario quiero recibir una alerta por evento relevante sin duplicados, para no perder novedades. | 8 | S6 | T-AI-10, T-WEB-08 | Dada una preferencia coincidente, cuando se publica un evento, entonces recibo 1 alerta y no se duplica al recargar. |
| US-A-10 | RF-A-10 | Must | Como usuario quiero un detalle de evento con resumen, hechos, evidencia y cronología, para decidir si profundizar. | 5 | S2 | T-WEB-03 | Dado un evento, cuando lo abro, entonces veo resumen, hechos con cita, documentos y organizaciones (ver FICHAS-CLAVE §1). |
| US-A-11 | RF-A-11 | Must | Como analista quiero un estado de verificación con motivo y fecha, para distinguir lo confirmado de lo dudoso. | 5 | S4 | T-AI-06 | Dado un evento, cuando se verifica, entonces tiene estado, motivo y fecha; `disputed` muestra ambas fuentes. |
| US-A-12 | RF-A-12 | Should | Como analista quiero el historial de cambios de un evento, para auditar correcciones. | 3 | S9+ | **BRECHA**: vista de lectura del historial (el trigger de auditoría ya existe en el SQL) | Dado un cambio, cuando lo consulto, entonces veo quién, cuándo, campo, antes y después. |
| US-A-13 | RF-A-13 | Must | Como usuario quiero ver una etiqueta DEMO en todo contenido de demostración, para no confundirlo con datos reales. | 3 | S1 | T-INF-02, T-INF-08, EN-03 | Dado un registro `is_demo`, cuando se muestra, entonces lleva “DEMO” y no cuenta en KPIs. |

### B — Permisos y proyectos

Subtotal: **11 historias · 48 pts**.

| ID | Req. | Pri. | Historia | Pts | Sprint | Dep. técnicas (IDs de A) | Aceptación |
|---|---|---|---|---|---|---|---|
| US-B-01 | RF-B-01 | Must | Como usuario quiero saber qué tipos de permiso/proyecto tienen cobertura, para no asumir que no hay datos. | 3 | S3 | T-SRC-04, T-SRC-05, T-SRC-06, T-ING-06, T-WEB-04 | Dado un tipo sin fuente validada, cuando abro la pantalla, entonces veo “cobertura pendiente”, no un vacío. |
| US-B-02 | RF-B-02 | Must | Como analista quiero una ficha de proyecto con los 12 campos, para consultar el proyecto completo. | 8 | S3 | T-WEB-04, T-ING-06, T-ING-07* | Dado un proyecto, cuando abro la ficha, entonces aparecen los 12 campos del PM o “No disponible” con motivo. |
| US-B-03 | RF-B-03 | Must | Como analista quiero una taxonomía de estados con documento por transición, para no inflar el estado. | 5 | S3 | T-WEB-04 | Dada una transición, cuando se guarda, entonces exige documento y fecha. |
| US-B-04 | RF-B-04 | Must | Como usuario quiero que un registro nunca se muestre como aprobación, para no tomar decisiones sobre un dato falso. | 5 | S3 | T-WEB-04 | Dado un proyecto sin documento de aprobación, cuando se intenta `permit_approved`, entonces se rechaza (CC-06). |
| US-B-05 | RF-B-05 | Must | Como analista quiero ver institución, expediente y documento oficial de cada permiso, para citarlos. | 3 | S3 | T-WEB-04 | Dado un permiso, cuando lo abro, entonces veo institución, expediente (si existe) y enlace oficial. |
| US-B-06 | RF-B-06 | Must | Como analista quiero el historial de versiones del proyecto, para ver su evolución. | 5 | S4 | T-WEB-04, **BRECHA**: vista de lectura del historial | Dado un cambio de estado, cuando consulto el historial, entonces veo anterior, nuevo, documento y fecha. |
| US-B-07 | RF-B-07 | Should | Como usuario quiero ubicación normalizada a provincia/municipio, para filtrar por zona. | 5 | S7 | T-ING-10 | Dado un proyecto, cuando se ubica, entonces tiene provincia/municipio; sin geocodificación inventada. |
| US-B-08 | RF-B-08 | Must | Como usuario quiero ver el monto anunciado solo si la fuente lo publica, para no ver cifras inventadas. | 3 | S3 | T-WEB-04 | Dado un monto sin fuente, cuando se renderiza, entonces se muestra “No disponible”. |
| US-B-09 | RF-B-09 | Must | Como gestor quiero ver oportunidades potenciales de un proyecto como inferencia, para priorizar. | 3 | S4 | T-AI-08 | Dada una oportunidad vinculada, cuando se muestra, entonces lleva la etiqueta `Inferencia` y su confianza. |
| US-B-10 | RF-B-10 | Must | Como usuario quiero filtrar proyectos y alertar cambios de estado, para seguirlos. | 5 | S4 | T-WEB-04, T-WEB-08 | Dado un proyecto seguido, cuando cambia de estado, entonces recibo 1 alerta. |
| US-B-11 | RF-B-11 | Should | Como analista quiero ver proyectos relacionados sin fusionarlos, para detectar patrones. | 3 | S9+ | T-WEB-04 | Dado un promotor común, cuando abro la ficha, entonces veo “Relacionados” y no se fusionan. |

### C — Instrumentos financieros

Subtotal: **13 historias · 74 pts**.

| ID | Req. | Pri. | Historia | Pts | Sprint | Dep. técnicas (IDs de A) | Aceptación |
|---|---|---|---|---|---|---|---|
| US-C-01 | RF-C-01 | Must | Como inversor quiero seguir subastas y resultados del Banco Central, para conocer tasas publicadas. | 8 | S3 | T-SRC-02, T-SRC-03, T-ING-04, T-ING-05, T-WEB-06 | Dada una subasta publicada, cuando se ingiere, entonces aparece con plazo y tasa y su fuente. |
| US-C-02 | RF-C-02 | Must | Como inversor quiero seguir títulos del Ministerio de Hacienda, para ver emisiones. | 8 | S4 | T-SRC-03, T-ING-04, T-WEB-06 | Dado un título publicado, cuando se ingiere, entonces aparece con sus campos mínimos. |
| US-C-03 | RF-C-03 | Should | Como inversor quiero ver emisiones de renta fija del mercado de valores, para ampliar la comparación. | 8 | S9+ | T-SRC-06, T-SRC-07, T-ING-06 | Dada una emisión publicada, cuando se ingiere, entonces aparece con emisor, plazo y tasa. |
| US-C-04 | RF-C-04 | Must | Como inversor quiero los campos mínimos de cada instrumento, para entenderlo. | 5 | S4 | T-ING-04, T-WEB-06 | Dado un instrumento, cuando lo abro, entonces veo emisor, tipo, moneda, plazo, emisión, vencimiento, tasa, tipo de tasa y fuente. |
| US-C-05 | RF-C-05 | Must | Como inversor quiero distinguir tasa indicativa, adjudicada y efectiva, para no confundirlas. | 5 | S4 | T-WEB-06 | Dada una tasa, cuando se muestra, entonces lleva su tipo y nunca se mezcla en una serie. |
| US-C-06 | RF-C-06 | Should | Como inversor quiero comparar hasta 4 instrumentos, para decidir con contexto. | 8 | S9+ | T-WEB-06, L-02 (abogado) | Dados 4 instrumentos en monedas distintas, cuando comparo, entonces no se suman ni convierten sin tipo de cambio con fuente. |
| US-C-07 | RF-C-07 | Should | Como inversor quiero una calculadora de rendimiento con supuestos, para estimar un resultado. | 8 | S9+ | T-AI-09, V-05 (SRS), L-02 (abogado) | Dado un cálculo, cuando se muestra, entonces trae fórmula y supuestos y se etiqueta como estimación (bloqueada hasta cerrar V-05). |
| US-C-08 | RF-C-08 | Must | Como analista quiero el historial de tasas con fuente y fecha, para ver tendencias. | 5 | S4 | T-ING-04, T-WEB-06 | Dada una serie, cuando la consulto, entonces cada punto tiene fuente y fecha y una serie por tipo de tasa. |
| US-C-09 | RF-C-09 | Must | Como inversor quiero un calendario de subastas y vencimientos con hora y zona, para planificar. | 5 | S5 | T-WEB-06, **BRECHA parcial**: el calendario no está nombrado en T-WEB-06 | Dado un evento de calendario, cuando se muestra, entonces incluye hora y zona. |
| US-C-10 | RF-C-10 | Must | Como inversor quiero alertas de nuevas emisiones y vencimientos, para no perderlos. | 5 | S6 | T-AI-10 | Dada una emisión nueva, cuando coincide con mi preferencia, entonces recibo 1 alerta. |
| US-C-11 | RF-C-11 | Should | Como inversor quiero ver requisitos de participación y enlace oficial, para saber cómo continuar. | 3 | S7 | T-WEB-06 | Dado un instrumento, cuando lo abro, entonces veo el extracto y el enlace oficial sin interpretación legal. |
| US-C-12 | RF-C-12 | Must | Como usuario quiero que nunca se me ofrezca “comprar” sin confirmación, para no ser inducido a error. | 3 | S3 | T-WEB-06 | Dado un instrumento no confirmado, cuando abro la ficha, entonces no hay CTA de compra y dice “Disponibilidad no confirmada” (CC-08). |
| US-C-13 | RF-C-13 | Must | Como inversor quiero ver riesgos y liquidez solo si la fuente los declara, para no recibir ratings propios. | 3 | S5 | T-WEB-06 | Dado un instrumento sin dato, cuando se muestra, entonces dice “La fuente no declara este dato”. |

### D — Licitaciones y contrataciones

Subtotal: **10 historias · 47 pts**.

| ID | Req. | Pri. | Historia | Pts | Sprint | Dep. técnicas (IDs de A) | Aceptación |
|---|---|---|---|---|---|---|---|
| US-D-01 | RF-D-01 | Must | Como PyME quiero detectar licitaciones nuevas y actualizadas, para actuar a tiempo. | 8 | S4 | T-SRC-01, T-ING-03, T-WEB-05 | Dada una licitación nueva, cuando se ingiere, entonces aparece con identificador y enlace. |
| US-D-02 | RF-D-02 | Must | Como PyME quiero la fecha y hora límite con zona y cuenta atrás, para no perder el plazo. | 5 | S4 | T-WEB-05 | Dado `deadline_at`, cuando se muestra, entonces incluye fecha, hora y zona y `closing_soon` ≤ 72 h (CC-07). |
| US-D-03 | RF-D-03 | Must | Como PyME quiero el presupuesto con moneda y fuente, para evaluar tamaño. | 3 | S4 | T-ING-03, T-WEB-05 | Dado un presupuesto sin publicar, cuando se muestra, entonces dice “No disponible”. |
| US-D-04 | RF-D-04 | Must | Como analista quiero adjudicaciones y contratos con monto y documento, para ver quién ganó. | 5 | S5 | T-ING-03, T-WEB-05 | Dada una adjudicación, cuando la abro, entonces veo proveedor, monto, fecha y documento. |
| US-D-05 | RF-D-05 | Should | Como gestor quiero vincular proveedores adjudicados a la ficha de empresa, para seguir su actividad. | 5 | S9+ | T-ING-09, T-WEB-07 | Dado un proveedor, cuando se vincula, entonces la ficha de empresa lista el contrato. |
| US-D-06 | RF-D-06 | Must | Como PyME quiero clasificar licitaciones por sector e institución, para filtrar. | 3 | S5 | T-ING-03, T-AI-05 | Dada una licitación, cuando se lista, entonces tiene sector e institución. |
| US-D-07 | RF-D-07 | Should | Como PyME quiero un filtro “oportunidad para PyME” con criterios explícitos, para priorizar. | 5 | S9+ | **BRECHA**: criterios PyME configurables (V-06) | Dados criterios configurados, cuando filtro, entonces el resultado es reproducible y no se presenta como recomendación. |
| US-D-08 | RF-D-08 | Should | Como gestor quiero ver hipótesis de subcontratación como inferencia, para explorar mercado. | 5 | S9+ | T-AI-08 | Dada una hipótesis, cuando se muestra, entonces lleva `Inferencia` y “no es un contrato”. |
| US-D-09 | RF-D-09 | Must | Como PyME quiero alertas de vencimiento (7/3/1 días) sin duplicados, para preparar mi oferta. | 5 | S6 | T-AI-10 | Dada una licitación guardada, cuando faltan 7/3/1 días, entonces recibo 1 alerta por umbral. |
| US-D-10 | RF-D-10 | Must | Como PyME quiero acceder al pliego oficial desde la ficha, para leer los requisitos. | 3 | S4 | T-WEB-05 | Dada una licitación, cuando abro el pliego, entonces se abre el documento oficial en pestaña nueva. |

### E — Expansión empresarial

Subtotal: **9 historias · 45 pts**.

| ID | Req. | Pri. | Historia | Pts | Sprint | Dep. técnicas (IDs de A) | Aceptación |
|---|---|---|---|---|---|---|---|
| US-E-01 | RF-E-01 | Should | Como gestor quiero detectar las 9 señales de expansión, para anticipar necesidades. | 8 | S9+ | T-SRC-08, T-AI-04 | Dada una señal, cuando se detecta, entonces se registra su tipo y la cobertura se declara por señal. |
| US-E-02 | RF-E-02 | Must | Como gestor quiero vincular cada señal a empresa, sector, lugar y necesidad, para entender el impacto. | 5 | S7 | T-ING-09, T-AI-04 | Dado un vínculo, cuando se muestra, entonces distingue documentado vs inferido. |
| US-E-03 | RF-E-03 | Must | Como gestor quiero una ficha de empresa agregada, para ver todo en un lugar. | 8 | S5 | T-WEB-07 | Dada una empresa, cuando abro la ficha, entonces veo eventos, proyectos, licitaciones, contratos y oportunidades. |
| US-E-04 | RF-E-04 | Should | Como analista quiero el historial cronológico de la empresa con evidencia, para auditar hitos. | 5 | S9+ | T-WEB-07 | Dado un hito, cuando lo abro, entonces enlaza a su evidencia. |
| US-E-05 | RF-E-05 | Should | Como analista quiero país y monto de inversión extranjera solo si se publican, para no inferir. | 3 | S9+ | T-AI-04 | Dado un monto no publicado, cuando se muestra, entonces dice “No disponible”. |
| US-E-06 | RF-E-06 | Could | Como gestor quiero ver anuncios de contratación como señal, no como prueba, para contextualizar. | 2 | S9+ | T-AI-04 | Dado un anuncio, cuando se muestra, entonces se etiqueta “señal” con fuente y fecha. |
| US-E-07 | RF-E-07 | Should | Como gestor quiero seguir una empresa y recibir alertas, para no perder cambios. | 3 | S9+ | T-WEB-08 | Dada una empresa seguida, cuando hay un evento nuevo, entonces recibo 1 alerta. |
| US-E-08 | RF-E-08 | Must | Como administrador quiero deduplicar empresas con fusiones reversibles, para tener una entidad por empresa. | 8 | S5 | T-ING-09 | Dadas 2 variantes de razón social, cuando se fusionan, entonces la fusión es reversible y auditada. |
| US-E-09 | RF-E-09 | Must | Como gestor quiero ver necesidades comerciales como inferencia explicada, para priorizar. | 3 | S7 | T-AI-08 | Dada una necesidad, cuando se muestra, entonces lleva `Inferencia` y su explicación sin cifras inventadas. |

### F — Motor de oportunidades

Subtotal: **14 historias · 65 pts**.

| ID | Req. | Pri. | Historia | Pts | Sprint | Dep. técnicas (IDs de A) | Aceptación |
|---|---|---|---|---|---|---|---|
| US-F-01 | RF-F-01 | Must | Como analista quiero que solo eventos verificados originen oportunidades, para no publicar sobre dudas. | 5 | S5 | T-AI-08 | Dado un evento `disputed`/`unverifiable`, cuando se intenta generar, entonces se rechaza (CC-11). |
| US-F-02 | RF-F-02 | Must | Como gestor quiero los 11 tipos de oportunidad, para cubrir el alcance del PM. | 3 | S5 | T-AI-08 | Dada una oportunidad, cuando se clasifica, entonces tiene uno de los 11 tipos. |
| US-F-03 | RF-F-03 | Must | Como gestor quiero los campos obligatorios completos, para evaluar con criterio. | 8 | S5 | T-AI-08 | Dada una oportunidad publicada, cuando se abre, entonces tiene los campos del PM o “No disponible”. |
| US-F-04 | RF-F-04 | Must | Como analista quiero que toda oportunidad tenga ≥ 1 cita almacenada, para garantizar fundamento. | 5 | S5 | T-AI-02, T-AI-08 | Dada una oportunidad sin cita, cuando se intenta publicar, entonces se bloquea (CC-10). |
| US-F-05 | RF-F-05 | Must | Como gestor quiero capital estimado solo con base justificable, para no ver cifras inventadas. | 5 | S7 | T-AI-08 | Dado un capital sin base, cuando se renderiza, entonces dice “No disponible”. |
| US-F-06 | RF-F-06 | Must | Como gestor quiero un nivel de confianza explicado, para calibrar mi decisión. | 5 | S7 | T-AI-08 | Dado un nivel, cuando se muestra, entonces trae explicación y “No es una probabilidad de éxito”. |
| US-F-07 | RF-F-07 | Must | Como usuario quiero ver los riesgos antes de cualquier acción, para decidir con prudencia. | 3 | S5 | T-AI-08 | Dada una ficha, cuando se renderiza, entonces los riesgos aparecen antes de los CTA. |
| US-F-08 | RF-F-08 | Should | Como gestor quiero un horizonte temporal con incertidumbre, para planificar. | 2 | S9+ | T-AI-08 | Dado un horizonte, cuando se muestra, entonces tiene unidad y nota de incertidumbre. |
| US-F-09 | RF-F-09 | Must | Como gestor quiero próximos pasos accionables con enlaces oficiales, para avanzar. | 3 | S6 | T-AI-08 | Dada una oportunidad, cuando se abre, entonces los pasos enlazan a fuentes oficiales. |
| US-F-10 | RF-F-10 | Must | Como administrador quiero que una cifra sin cita bloquee la publicación, para evitar invenciones. | 8 | S6 | T-AI-02, T-AI-08 | Dada una cifra sin cita, cuando se publica, entonces se bloquea e indica la cifra (CC-10). |
| US-F-11 | RF-F-11 | Must | Como gestor quiero un flujo borrador → revisión → publicación con revisor registrado, para tener control humano. | 8 | S6 | T-AI-08, T-AI-11, T-WEB-09 | Dado `analyst`, cuando intenta publicar, entonces recibe 403; `opportunity_manager` publica con revisor, fecha y modelo registrados (CC-12). |
| US-F-12 | RF-F-12 | Must | Como usuario quiero guardar una oportunidad con una nota privada, para dar seguimiento. | 3 | S7 | T-WEB-08 | Dada una oportunidad guardada, cuando cierro sesión y vuelvo, entonces persiste y solo yo la veo (CC-13). |
| US-F-13 | RF-F-13 | Should | Como usuario quiero marcar una oportunidad como útil o no útil, para mejorar el motor. | 2 | S9+ | **BRECHA**: feedback útil/no útil | Dado un feedback, cuando se envía, entonces queda asociado a la versión del modelo. |
| US-F-14 | RF-F-14 | Should | Como gestor quiero que una oportunidad se actualice cuando cambia su evento, para no usar información vieja. | 5 | S9+ | T-AI-08 | Dado un evento modificado, cuando se recalcula, entonces se conserva la versión anterior y se marca “actualizada”. |

### G — Plataforma transversal

Subtotal: **16 historias · 98 pts**.

| ID | Req. | Pri. | Historia | Pts | Sprint | Dep. técnicas (IDs de A) | Aceptación |
|---|---|---|---|---|---|---|---|
| US-G-01 | RF-G-01 | Must | Como visitante quiero registrarme, verificar mi correo e iniciar sesión, para acceder. | 8 | S1 | T-INF-06, T-INF-10 | Dado un registro, cuando verifico el correo, entonces puedo iniciar sesión (CC-01). |
| US-G-02 | RF-G-02 | Must | Como administrador quiero roles con mínimo privilegio y RLS, para proteger los datos. | 8 | S1 | T-INF-03, T-INF-10 | Dado un `viewer`, cuando intenta acceder a `/admin`, entonces recibe 403 sin datos (CC-02/03). |
| US-G-03 | RF-G-03 | Must | Como administrador quiero organizaciones y pertenencia con `organization_id`, para aislar datos. | 5 | S1 | T-INF-02, T-INF-03 | Dado un usuario, cuando consulta, entonces solo ve datos de su organización. |
| US-G-04 | RF-G-04 | Must | Como usuario quiero una búsqueda avanzada con facetas, para encontrar cualquier entidad. | 8 | S2 | T-WEB-02 | Dada una búsqueda con 2 filtros, cuando se ejecuta, entonces p95 ≤ 1 s (CC-15). |
| US-G-05 | RF-G-05 | Should | Como analista quiero guardar vistas de filtros, para repetir búsquedas. | 3 | S9+ | **BRECHA**: sin tabla (DM-06) | Dada una vista guardada, cuando la abro, entonces aplica los mismos filtros. |
| US-G-06 | RF-G-06 | Must | Como usuario quiero una watchlist multi-entidad con notas, para seguir lo que me importa. | 5 | S7 | T-WEB-08 | Dada una entidad guardada, cuando abro la watchlist, entonces aparece con su estado. |
| US-G-07 | RF-G-07 | Must | Como usuario quiero preferencias de alerta por tipo, sector, lugar, palabra y frecuencia, para recibir lo relevante. | 5 | S6 | T-WEB-08 | Dada una preferencia, cuando la pauso, entonces deja de notificar sin borrarse. |
| US-G-08 | RF-G-08 | Must | Como usuario quiero notificaciones in-app con registro de entrega, para no perder avisos. | 8 | S6 | T-WEB-08, T-AI-10 | Dada una notificación, cuando se entrega, entonces queda registrada con `delivered_at` (RNF-08). |
| US-G-09 | RF-G-09 | Must | Como usuario quiero configurar tema, zona, idioma y borrar mi cuenta, para controlar mi experiencia. | 5 | S7 | **BRECHA**: ajustes de cuenta y borrado de cuenta (CC-20) | Dado el borrado, cuando lo confirmo, entonces se eliminan mis datos personales (CC-20). |
| US-G-10 | RF-G-10 | Must | Como usuario quiero un dashboard con KPIs, novedades y frescura, para orientarme en 10 segundos. | 8 | S7 | T-WEB-11 | Dado un usuario con datos, cuando abro `/dashboard`, entonces veo 4 KPIs con fecha de corte. |
| US-G-11 | RF-G-11 | Could | Como analista quiero un mapa de proyectos, para ver la distribución geográfica. | 8 | S9+ | T-WEB-12 | Dados proyectos sin coordenadas, cuando abro el mapa, entonces se agrupan por provincia y se indica. |
| US-G-12 | RF-G-12 | Must | Como administrador quiero un panel de fuentes, cola de revisión, usuarios y auditoría, para operar la plataforma. | 13 | S6 | T-WEB-09, T-ING-11, T-AI-11 | Dada una fuente caída, cuando abro el panel, entonces veo error, último documento válido y acciones. |
| US-G-13 | RF-G-13 | Must | Como administrador quiero auditoría de acciones sensibles, para responder ante revisiones. | 5 | S1 | T-INF-02 | Dado un cambio de rol, cuando ocurre, entonces se registra actor, fecha y antes/después (RNF-25). |
| US-G-14 | RF-G-14 | Must | Como usuario quiero que los datos demo se identifiquen y excluyan de métricas, para no confundirme. | 3 | S1 | T-INF-08, EN-03 | Dado un registro demo, cuando se cuenta, entonces queda excluido y etiquetado. |
| US-G-15 | RF-G-15 | Must | Como usuario quiero un aviso legal y consentimiento en el registro, para conocer los límites del servicio. | 3 | S1 | **BRECHA**: consentimiento y aviso legal (L-03) | Dado el registro, cuando acepto, entonces se guarda el consentimiento con fecha y versión del texto (`[PENDIENTE LEGAL]`). |
| US-G-16 | RF-G-16 | Could | Como analista quiero exportar resultados filtrados a CSV, para trabajarlos fuera. | 3 | S9+ | **BRECHA**: exportación CSV | Dado un listado filtrado, cuando exporto, entonces el CSV incluye `source_url` e `is_demo` y respeta permisos. |

---

## 3. Fuera del MVP (Won’t, esta versión)

Heredado de REQUISITOS §2.3; no se estima.

| Elemento | Motivo |
|---|---|
| Ejecución de compras/ventas o transferencias | No es un broker (PM §4-C). |
| Asesoramiento financiero personalizado | Requiere salvaguardas regulatorias y revisión legal (PM §5, §10). |
| Chat conversacional con IA | No está en las 14 pantallas (D-03). |
| App móvil nativa | Web responsive suficiente. |
| Fuentes internacionales (SEC, USAspending, Fed) | Expansión posterior (PM §6). |
| Facturación, planes y cobro | `[PENDIENTE COMERCIAL]` (C-06). |
| API pública para terceros | No requerida. |
| SSO/SAML | No requerido. |
| Correo/push como canal de alerta | Post-MVP (D-05, C-05). |
| Traducción completa al inglés | UI nace es-DO. |

### 3.1 Historias habilitadoras (no mapean a un RF, pero son necesarias)

> Piezas implícitas en el PM (§12 Fase 2, §14, §16) sin RF propio. **Rangos en días-persona, por juicio de B, sin datos históricos** (misma incertidumbre ×0,6–×2 que declara A). Se indica si A ya las cubre con una tarea `T-*`.

| ID | Habilitador | Cubierto en A por | Esfuerzo adicional de B (d-p) | Pri. |
|---|---|---|---|---|
| EN-01 | Sistema de diseño implementado (tokens, `TrustLayerBadge`, `MetricValue`, `EvidencePanel`, `DataTable`) | Nada (`T-WEB-*` dicen “UI por B”) | **10–20** | Must |
| EN-02 | Vitest, CI (lint + tipos + pruebas), escaneo de secretos | `T-INF-04` (1,5) | 0,5–1,5 (configurar Vitest y primeras pruebas de dominio) | Must |
| EN-03 | Datos sintéticos `is_demo` y dataset de carga (RNF-02/03) | Nada (`T-WEB-02` lo usa, no lo construye) | **4–8** | Must |
| EN-04 | Golden sets etiquetados y arnés de evals | `T-AI-03` (8) + `T-AI-12` (3) | 0 en desarrollo; **requiere anotadores humanos (B-015)** | Must |
| EN-05 | Observabilidad: logs con `request_id` y 4 alertas | `T-INF-07` (2) | 0 | Must |
| EN-06 | Runbooks, despliegue y ensayo de rollback (RNF-36) | Nada (A lo lista como dependencia de Fase 6/7) | 4–6 | Must |
| EN-07 | Simulacro de backup/restauración (RNF-09) | Nada (idem) | 1–2 (+ plan de Supabase por verificar) | Must |
| EN-08 | Documentos raíz del PM §14 como índices (D-001) | — | 0,5–1 | Should |

**Suma de habilitadores adicionales: 20 a 38,5 d-p** (EN-01, 02, 03, 06, 07, 08). Usada en §4.4.

---

## 4. Totales y capacidad

### 4.1 Totales de esfuerzo relativo

| Prioridad | Historias | Puntos |
|---|---|---|
| Must | 65 | 353 |
| Should | 18 | 84 |
| Could | 3 | 13 |
| **Total** | **86** | **450** |

Habilitadores EN-01…EN-08: **sin estimar** (no incluidos en los totales).

### 4.2 Carga propuesta por sprint

| Sprint | Semanas | Puntos propuestos |
|---|---|---|
| S1 | 1–2 | 35 |
| S2 | 3–4 | 49 |
| S3 | 5–6 | 51 |
| S4 | 7–8 | 60 |
| S5 | 9–10 | 56 |
| S6 | 11–12 | 63 |
| S7 | 13–14 | 47 |
| S8 | 15–16 | 0 |
| **Dentro de las 16 semanas** | 16 | **361** |
| S9+ (fuera de las 16 semanas) | — | 89 |
| **Total backlog** | — | **450** |

> **Lectura crítica (hallazgo del reparto).** Con un tope de planificación de ≈ 56–63 pts por sprint (450 pts ÷ 8 sprints; **es un supuesto, no una velocidad medida**), las 65 historias **Must (353 pts)** ocupan S1–S7, junto con 8 pts de Should que sí caben, y dejan S8 libre para endurecimiento, piloto y cierre. Las demás Should y las 3 Could (19 historias, 89 pts) **no caben dentro de las 16 semanas** sin comprimir QA, seguridad o revisión humana, así que quedan en “S9+”. Para incluirlas habría que (a) ampliar el calendario, (b) ampliar el equipo o (c) aceptar riesgo de calidad — **decisiones del usuario**. No se debe recortar QA para cuadrar el calendario (R-B05). Si la velocidad real resulta menor, los Must tampoco caben y habrá que recortar alcance o ampliar plazo.

> **Sprints ligeros al inicio (S1, S2)** es deliberado: absorben la puesta en marcha (CI, entorno, primera fuente real, anotación de golden sets) que no está estimada en los puntos (habilitadores EN-01…EN-08).

### 4.3 Camino crítico y dependencias con la Ventana A (IDs de `backlog-tecnico.md`)

Cálculo propio sobre las 61 tareas y dependencias de A (CPM sin límite de personas, con los `T-PRE-*` resueltos el día 0): **suelo teórico = 43,5 días hábiles ≈ 8,7 semanas**, aunque hubiera personas ilimitadas y ninguna espera. Es un **mínimo**, no una predicción.

`T-PRE-03 → T-INF-01 → T-INF-02 → T-INF-09 → T-ING-01 → T-ING-03 → T-AI-03 → T-AI-04 → T-AI-06 → T-AI-08 → T-AI-11` (coincide con el camino crítico que declara A).

| Entrega de A (ID) | Necesaria para | Fin teórico (día hábil) | Sprint más temprano posible |
|---|---|---|---|
| T-INF-02 | Esquema ejecutado: todas las historias con datos | 2,5 | S1 |
| T-INF-03 | RLS probada: US-G-02/03 y toda pantalla autenticada | 5,5 | S1 |
| T-INF-10 | Autenticación: US-G-01, G-02 | 5,5 | S1 |
| T-ING-03 | Primer conector (DGCP): US-A-01, D-01…D-06 | 14,5 | S2 |
| T-ING-04 | Conector Crédito Público: US-C-01/02/04/08 | 13,5 | S2 |
| T-ING-09 | Deduplicación: US-A-03/04/07, E-02/08 | 18,5 | S2 |
| T-AI-03 | Golden sets: todas las evaluaciones de IA | 22,5 | S3 |
| T-AI-04 | Extracción: US-A-07, E-05/06 | 28,5 | S3 |
| T-AI-06 | Verificación: US-A-11 | 33,5 | S4 |
| T-AI-08 | Motor de oportunidades: US-F-01…F-10, B-09, D-08, E-09 | 39,5 | S4 |
| T-AI-11 | Cola de revisión: US-F-11, G-12 | 43,5 | S5 |

> **Las decisiones `T-PRE-01…07` (usuario) no están en el cálculo**: cada día de espera desplaza todo el camino. `T-PRE-05` (abogado) es externa y sin duración conocida.

### 4.4 Reconciliación de calendario: roadmap de B ↔ estimación técnica de A

**No se pueden convertir puntos en días.** Los 353 pts Must de este documento son una escala relativa de ordenación; los 168,5 días-persona de A son una estimación de una persona con dominio (A: ×0,6 a ×2 de incertidumbre, sin velocidad histórica). Se comparan **por alcance** (historia ↔ tarea `T-*`) y por aritmética de días, **sin inventar velocidad de equipo**.

| Concepto | Días-persona | Fuente / nota |
|---|---|---|
| Backlog técnico de A, total (F2–F5) | **168,5** | `backlog-tecnico.md` §7 (verificado sumando las 61 tareas) |
| – tareas que solo sirven a Should/Could (`T-WEB-12`, `T-AI-09`, `T-SRC-07/08/09`) | −9,0 | Fuera de las 16 semanas en mi plan (S9+) |
| **A solo para el alcance Must** | **159,5** | El comparador (parte de `T-WEB-06`) no se puede separar: no resta |
| + habilitadores de B sin tarea en A (EN-01, 02, 03, 06, 07, 08; §3.1) | +20 a +38,5 | Juicio de B, ×0,6–×2 como A |
| + brechas Must sin tarea en A (§4.5) | +6 a +13 | Juicio de B |
| + QA (implementar y ejecutar ESTRATEGIA-PRUEBAS) | +25 a +45 | **Orden de magnitud por juicio, sin datos**; A lo excluye |
| + UX (prototipos, test de comprensión, revisión de A11Y) | +10 a +20 | **Orden de magnitud por juicio, sin datos**; A lo excluye |
| **Total orientativo** | **220 a 276** | Sin legal (externo), sin piloto, sin la UI si `T-WEB-03…09` no la incluyen (ver abajo) |

**Pregunta abierta a A que puede mover el total mucho:** `T-WEB-03…09` dicen “consumo de contratos de datos; UI por B”, pero **B no implementa**. Si esos 51 d de F4 no incluyen los componentes y las 14 pantallas, falta una partida de implementación de UI de orden comparable al subtotal F4 (no se estima aquí: sin base).

**Aritmética de calendario (no es velocidad medida).** Semanas = días ÷ (personas × 5 días), con dedicación plena, sin vacaciones ni sobrecoste, paralelismo perfecto y nunca por debajo del suelo de 8,7 semanas del camino crítico.

| Personas a dedicación plena | Semanas con total bajo (220 d) | Semanas con total alto (276 d) | ¿Cabe en 16 semanas? |
|---|---|---|---|
| 1 | 44,1 | 55,2 | No |
| 2 | 22,1 | 27,6 | No |
| 3 | 14,7 | 18,4 | Solo en el escenario bajo |
| 4 | 11,0 | 13,8 | Sí |

**Conclusión del conflicto.** Con el alcance Must actual, **16 semanas exigen ≈ 2,8–3,5 personas a dedicación plena** (aritmética de arriba) y cero esperas por decisiones. Con 1–2 personas, el plan de 16 semanas **no se sostiene** sin recortar alcance; el roadmap de §5 es un escenario condicionado a esa capacidad, no una previsión.

#### Qué se recorta primero si el calendario se mantiene (orden propuesto)

| # | Recorte | Ahorro bruto en A | Efecto en criterios del PM §16 | Decide |
|---|---|---|---|---|
| 1 | Mantener Should/Could fuera (ya aplicado en §4.2) | 9,0 d + comparador | Ninguno de los 15 criterios exige comparador/calculadora/mapa | — |
| 2 | Módulos B/E por **carga manual** (`T-ING-06`) en vez de conector `T-ING-07` | 4 d | “El sistema identifique proyectos y permisos”: se cumple solo con cobertura manual y declarada | Usuario |
| 3 | Conector BCRD `T-ING-05` → carga manual | 5 d (−3 de `T-ING-06`) | “Se visualicen instrumentos”: cubiertos por Crédito Público; BCRD parcial | Usuario |
| 4 | Ficha de empresa mínima (`T-WEB-07`) y dedup de empresas diferida (`T-ING-09` parcial) | ≈ 2–4 d `[juicio]` | Módulo E queda mínimo (ya “Must (mínimo)” en INVENTARIO) | Usuario |
| 5 | Dashboard (`T-WEB-11`) reducido a lista de novedades | 3 d | Una de las 14 pantallas queda mínima; no es criterio §16 | Usuario |

**No se recorta** (riesgo irreversible o criterio duro del PM): RLS y su suite (`T-INF-03`), anti-SSRF (`T-ING-01`), verificador de citas e injection (`T-AI-02`, `T-AI-07`), revisión humana (`T-AI-11`), regla de estados de permiso, QA, legal. Los recortes 2–5 suman ≈ 14–16 d: **no bastan** para pasar de 2 a 3 personas; el efecto real es reducir riesgo, no tiempo.

#### Qué pasa si se amplía el calendario

| Escenario | Qué cambia | Condición |
|---|---|---|
| 16 semanas, ≥ 3 personas, sin esperas | Plan de §5 con riesgo alto; sin holgura para rehacer | Decisiones T-PRE resueltas en G0; fuentes verificadas |
| ≈ 20–24 semanas, 2–3 personas | Entran Should clave (historial público, vistas) y holgura de QA; piloto con datos reales | Ampliar plazo (decisión del usuario) |
| ≈ 30–55 semanas, 1 persona | El alcance Must es viable solo en serie; el piloto llega muy tarde | Ver tabla de aritmética |
| 16 semanas, 2 personas, MVP recortado | Solo el corte vertical D + C (DGCP + Crédito Público) con revisión humana y B/E “cobertura pendiente” | Aceptar cumplimiento parcial de PM §16 |

#### Decisiones de alcance que cambian el resultado (resumen; ver `G0-DECISIONES.md`)

1. Cobertura de fuentes B/E/SIMV: automática vs manual declarada (`T-SRC-04…06`, `T-ING-06/07`).
2. Profundidad histórica de DGCP: la ficha OCP cita 583 549 licitaciones, 566 151 adjudicaciones y 646 180 contratos; cargar todo vs. los últimos N años cambia almacenamiento, tiempos de carga y datasets de prueba (RNF-02/03).
3. Comparador, calculadora y vistas guardadas fuera hasta opinión legal (L-02) y V-05.
4. Lenguaje de los workers (ADR-0002): un solo runtime ahorra CI y duplicación; no medido.
5. Tamaño del equipo y quién implementa la UI.
6. Anotadores y revisores humanos (sin ellos, G-09 queda NO CONCLUYENTE).

### 4.5 Verificación de dependencias técnicas (historias Must)

Resultado de cruzar las 86 historias con las 61 tareas de A (columna “Dep. técnicas” de §2):

- **Historias Must sin dependencia técnica resuelta (brecha en A): 4** → US-B-06, US-C-09, US-G-09, US-G-15.
  - US-B-06: vista de lectura del historial.
  - US-C-09: (parcial) el calendario no está nombrado en T-WEB-06.
  - US-G-09: ajustes de cuenta y borrado de cuenta (CC-20).
  - US-G-15: consentimiento y aviso legal (L-03).
- Brechas en Should/Could (no bloquean el MVP): US-A-12, US-D-07, US-F-13, US-G-05, US-G-16.
- Historias con dependencia **externa a A** (decisión del usuario o legal): US-C-06/07 (L-02, V-05), US-G-15 (L-03), US-D-07 (V-06).
- **Conflictos de secuencia** (sprint asignado antes del suelo teórico de la tarea de A): 0 → ninguno. Esta comprobación es necesaria, no suficiente: asume personas ilimitadas.
- **Ambigüedad a resolver con A:** `T-WEB-03…09` no aclaran si incluyen componentes de interfaz (ver §4.4).
- **Dependencias de decisión del usuario** que bloquean tareas Must de A: `T-PRE-01…07`, `SG-04` (herramientas CI → `T-INF-04`) y `SG-05` (contacto del `User-Agent` → `T-ING-01`).

---

## 5. Roadmap de 16 semanas

> **Escenario, no compromiso.** 8 sprints de 2 semanas que empiezan **solo después de la aprobación explícita del usuario** (Gate G0). El calendario asume un equipo cuya capacidad es `[PENDIENTE]`. Mapea a las 7 fases del Prompt Maestro §12 (algunas se solapan). Las semanas cuentan desde el inicio de Sprint 1, no desde hoy.

### 5.1 Vista general

```
Sem   1  2 | 3  4 | 5  6 | 7  8 | 9 10 |11 12 |13 14 |15 16
Sprint  S1    S2     S3     S4     S5     S6     S7     S8
F1 Descubrimiento  ██
F2 Arquitectura/base  ████
F3 Integración fuentes     ██████████████
F4 Plataforma web              ██████████████████████
F5 IA                              ██████████████████████
F6 Calidad y seguridad (continua desde S2)  ··········██████████
F7 Piloto y lanzamiento                                       ██
Gates   G0      G1            G2     G3     G4     G5
```

(Las barras son indicativas; el detalle está en la tabla.)

### 5.2 Sprints, hitos y contenido propuesto

| Sprint | Semanas | Fase PM | Objetivo | Historias (puntos) | Hito de salida verificable |
|---|---|---|---|---|---|
| **S1** Fundamentos y acceso | 1–2 | F1–F2 | Cuenta, roles, RLS, organización, auditoría y datos demo operativos sobre la arquitectura aprobada; arranque de la ingesta; sistema de diseño base y CI con pruebas (habilitadores). | US-A-13, US-G-01, US-G-02, US-G-03, US-G-13, US-G-14, US-G-15 (35 pts) | Un usuario se registra e inicia sesión y un `viewer` es rechazado en `/admin` (CC-01/02/03). |
| **S2** Primera fuente y radar base | 3–4 | F2–F3 | Primer conector **verificado** (el que A confirme), ingesta idempotente, agrupación y deduplicación, evidencia, búsqueda. | US-A-01, US-A-03, US-A-04, US-A-05, US-A-06, US-A-08, US-A-10, US-G-04 (49 pts) | Un documento oficial real se ingiere con hash y no se duplica al reingestar (CC-05); su evidencia es consultable (CC-04). |
| **S3** Radar con IA y primeras fichas | 5–6 | F3–F5 | Clasificación sectorial, fichas de proyecto/permiso con regla de estados, primeros instrumentos. | US-A-02, US-A-07, US-B-01, US-B-02, US-B-03, US-B-04, US-B-05, US-B-08, US-C-01, US-C-12 (51 pts) | Un permiso solicitado nunca aparece como aprobado (CC-06); un instrumento sin confirmación no tiene CTA de compra (CC-08). |
| **S4** Licitaciones, instrumentos y proyectos | 7–8 | F3–F4 | Verificación (agente 3), licitaciones con fecha/zona, instrumentos con tipos de tasa, historial de proyectos, subastas. | US-A-11, US-B-06, US-B-09, US-B-10, US-C-02, US-C-04, US-C-05, US-C-08, US-D-01, US-D-02, US-D-03, US-D-10 (60 pts) | Fecha límite correcta (CC-07); tasas siempre con su tipo (CC-08). |
| **S5** Oportunidades fundamentadas | 9–10 | F4–F5 | Motor de oportunidades con evidencia obligatoria, adjudicaciones, ficha de empresa y deduplicación de empresas. | US-C-09, US-C-13, US-D-04, US-D-06, US-E-03, US-E-08, US-F-01, US-F-02, US-F-03, US-F-04, US-F-07 (56 pts) | Una oportunidad no se genera desde un evento disputado (CC-11) y exige cita (CC-10, primera parte; el bloqueo de cifras sin cita llega en S6). |
| **S6** Revisión humana, alertas y administración | 11–12 | F4–F5 | Flujo borrador→revisión→publicación, panel de administración (cola de revisión), notificaciones in-app, preferencias y alertas de eventos, instrumentos y licitaciones. | US-A-09, US-C-10, US-D-09, US-F-09, US-F-10, US-F-11, US-G-07, US-G-08, US-G-12 (63 pts) | Solo `opportunity_manager`+ publica y se registran revisor y modelo (CC-12); una alerta por evento y usuario (CC-14). |
| **S7** Cierre de Must | 13–14 | F4–F6 | Dashboard, watchlist, borrado de cuenta, confianza explicada, capital estimado con base, necesidades comerciales como inferencia. | US-B-07, US-C-11, US-E-02, US-E-09, US-F-05, US-F-06, US-F-12, US-G-06, US-G-09, US-G-10 (47 pts) | Persistencia de watchlist (CC-13); borrado de cuenta (CC-20); todos los Must `hechos` según DoD. |
| **S8** Endurecimiento, piloto y cierre | 15–16 | F6–F7 | Sin historias nuevas: carga, seguridad, A11Y, evals sobre retención ciega, backup, runbooks, rollback, entorno beta, informe de cierre. | Sin historias nuevas | Informe de cierre del MVP (ESTRATEGIA §13) revisado por el usuario y decisión go/no-go del piloto. |
| **S9+** Fuera de las 16 semanas | — | — | Should y Could que no caben sin comprimir QA (§4.2) | US-A-12, US-B-11, US-C-03, US-C-06, US-C-07, US-D-05, US-D-07, US-D-08, US-E-01, US-E-04, US-E-05, US-E-06, US-E-07, US-F-08, US-F-13, US-F-14, US-G-05, US-G-11, US-G-16 (89 pts) | Se replanifica con la velocidad medida |

> Los habilitadores EN-01…EN-08 (§3.1) se reparten en S1–S7 según avance A; en particular EN-02 y EN-03 en S1, EN-04 antes de S5 y EN-06/07 en S7–S8.

### 5.3 Gates de aprobación

Un gate **no se supera por calendario**: se supera cuando el usuario revisa la **evidencia** indicada y aprueba por escrito. Si un gate falla, el siguiente sprint se ajusta; no se declara cumplido.

| Gate | Cuándo | Criterios (todos) | Evidencia que se presenta | Decide |
|---|---|---|---|---|
| **G0 — Inicio de Sprint 1** | Fin de Sprint 0 | Cumple el DoD de Sprint 0 (Contrato §6): arquitectura + ADRs, modelo de datos con RLS, registro de fuentes verificado, IA, seguridad, ambos backlogs, trazabilidad, inventario y diseño. Contradicciones C-01…C-15 resueltas o aceptadas. SRS y Plan Maestro recibidos **o** decisión explícita de proceder sin ellos. B-003/B-004/B-005 resueltos o con plan. Responsables de anotación y revisión definidos (QA-D5). | Documentos de A y B; lista de contradicciones con decisión; acta del usuario | Usuario |
| **G1 — Primera fuente** | Fin S2 (sem. 4) | Un conector verificado funciona; CC-04/05 y DQ-04/05/09/10 `PASA` en staging; auditoría activa; CI ejecutando pruebas. | Informes CC-04/05 y DQ; log de ingesta de ≥ 7 días `[PROPUESTO]` | Usuario |
| **G2 — Vertical slice** | Fin S4 (sem. 8) | Radar con evidencia, proyectos, licitaciones e instrumentos visibles con datos reales de ≥ 1 fuente por módulo; CC-04/06/07/08/15; primer eval de extracción con IC; primer test de comprensión de capas (USA-01). | Informes E2E y evals; capturas; informe USA-01 | Usuario |
| **G3 — Núcleo de IA fundamentada** | Fin S6 (sem. 12) | Oportunidades con evidencia obligatoria, bloqueo por cifra sin cita, flujo de revisión humana y panel de administración; CC-10/11/12 `PASA`; evals sobre retención ciega con IC (o `NO CONCLUYENTE` con plan); GS-INJ sin fallos (CC-18). | Informes CC-10/11/12/18 y evals | Usuario |
| **G4 — Must completo** | Fin S7 (sem. 14) | Las 65 historias Must `hechas` según DoD; CC-01…CC-17 `PASA`; ninguna pantalla sin estados vacío/carga/error/permisos (AC-UX-01). | Matriz de trazabilidad actualizada; informe parcial de cierre | Usuario |
| **G5 — Cierre del MVP y go/no-go del piloto** | Fin S8 (sem. 16) | Informe de cierre (ESTRATEGIA §13) con G-01…G-22 en estado explícito; 0 hallazgos críticos/altos de seguridad; revisión legal de RD completada para lo que se muestre (RNF-27); tope de costo IA aprobado; runbooks y rollback ensayados; backup restaurado. | Informe de cierre revisado por persona distinta a quien escribió las pruebas | Usuario |
| **G6 — Ampliación del piloto** | Después de S8 `[FUERA DE LAS 16 SEMANAS]` | ≥ 4 semanas de piloto con métricas M-01…M-12 medidas; RNF-19 concluyente (acumulado ≥ 200) o plan; decisión sobre relajar revisión humana (C-09). | Métricas reales de piloto | Usuario |
| **G7 — Lanzamiento controlado** | Después de G6 `[PENDIENTE]` | Todos los Must cerrados, sin pendientes legales, modelo de negocio definido (C-06). | Acta de lanzamiento | Usuario |

> **Observación honesta.** El Prompt Maestro pide piloto y lanzamiento controlado dentro de las 16 semanas, pero el piloto con usuarios reales y la medición de RNF-19 (acumulado ≥ 200 oportunidades revisadas) **probablemente no caben** en S8 si el volumen de datos es bajo; además, los Should/Could que no caben quedan en S9+ (§4.2). Por eso G6 y G7 se sitúan **después** de la semana 16; es una decisión del usuario aceptar este recorte o ampliar el calendario (R-B02).

### 5.4 Reglas del roadmap

1. Ninguna historia con dependencia `A:` empieza sin la entrega de A **y** aprobación del usuario.
2. Primero el **corte vertical** (S2–S4): una fuente real de extremo a extremo antes de ampliar horizontalmente.
3. Las historias **Should** y **Could** entran solo si todas las Must están `hechas` y hay capacidad; S8 **no recibe historias nuevas** (endurecimiento y piloto).
4. QA y seguridad **no se recortan** para ganar tiempo; si falta capacidad, se recorta alcance (§4.2).
5. Cada sprint cierra con el bloque `ESTADO`, la matriz de trazabilidad al día y las pruebas ejecutadas con resultado archivado.
6. Los cambios de alcance los aprueba el usuario (Contrato §7).

---

## 6. Riesgos del producto y del plan

| ID | Riesgo | Prob. | Impacto | Mitigación | Dueño |
|---|---|---|---|---|---|
| R-B01 | SRS y Plan Maestro no llegan; los requisitos derivados del PM son incompletos o divergentes | Media | Alto | Gate G0 exige decisión explícita; tabla de equivalencias cuando lleguen; revalidar la matriz | Usuario |
| R-B02 | 16 semanas insuficientes para Must + QA + piloto con evidencia; Should/Could fuera de plazo (§4.2, §5.3) | Alta | Alto | Medir velocidad en S1–S2 y recalibrar; recortar Should/Could, no QA; G6/G7 fuera de las 16 semanas | Usuario |
| R-B03 | Fuentes oficiales sin API, con licencia restrictiva o formato inestable | Alta | Alto | Cobertura declarada por fuente; modo manual asistido; no evadir controles (PM §6); verificar con A antes de comprometer pantallas | Ventana A |
| R-B04 | El motor de oportunidades genera volumen sin precisión; el equipo deja de confiar | Media | Alto | Revisión humana obligatoria (D-02); métricas M-08/M-09; evals con IC; umbral de confianza | B + A |
| R-B05 | Presión de calendario recorta pruebas, seguridad o revisión humana | Media | Crítico | Gates por evidencia; informe de cierre revisado por persona distinta; sin cambio de umbrales sin acta | Usuario |
| R-B06 | Estados de permiso inflados por datos ambiguos | Media | Alto | Regla dura RF-B-04 + CC-06 + DQ-07 | B + A |
| R-B07 | Riesgo regulatorio: la plataforma se percibe como asesoría o recomendación | Media | Crítico | Sin recomendaciones personalizadas; textos revisados; revisión legal RD antes de G5 (RNF-27) | Usuario + abogado |
| R-B08 | Costo de IA supera lo sostenible | Media | Alto | Tope mensual antes del piloto (RNF-21); caché; medición por tarea | A + usuario |
| R-B09 | Personas basadas en supuestos, no en usuarios reales | Alta | Medio | 5 entrevistas + test de comprensión en S1–S2 (PERSONAS §7.3); no cerrar UX antes | B |
| R-B10 | Supabase vinculado no accesible o equivocado (B-003) bloquea RLS y pruebas de BD | Alta | Alto | Resolver antes de G0; plan alternativo con proyecto nuevo | Usuario |
| R-B11 | Dependencia de A: A entrega tarde o con otro modelo de datos | Media | Alto | Reconciliación vía BANDEJA; las pantallas se ajustan al esquema, no al revés | A + B |
| R-B12 | Accesibilidad AA tratada como fase final | Media | Medio | A11Y en DoD de cada historia con UI; axe en CI desde Sprint 1 | B |
| R-B13 | Datos demo confundidos con reales | Baja | Alto | `is_demo` obligatorio; etiqueta visible; excluir de KPIs (CC-16) | B + A |
| R-B15 | Las fichas y pantallas especifican elementos de historias Should que quedan en S9+ (historial de eventos US-A-12, relacionados US-B-11, vistas guardadas US-G-05, comparador US-C-06, calculadora US-C-07, mapa US-G-11) | Alta | Medio | El MVP implementa la versión mínima; el inventario y las fichas marcan lo que es post-MVP; revisar al aprobar G0 | B |
| R-B14 | Sin analistas/anotadores para golden sets y revisión humana | Media | Alto | Definir responsables en G0 (QA-D5); sin ellos G-09 queda `NO CONCLUYENTE` | Usuario |

---

## 7. Decisiones pendientes del usuario

| # | Decisión | Opciones | Recomendación B | Afecta |
|---|---|---|---|---|
| 1 | ¿Se procede sin SRS/Plan Maestro? | (a) esperar; (b) proceder con PM y marcas | (b), con revalidación al llegar los documentos | G0, toda la matriz |
| 2 | Modelo de negocio y planes (C-06) | (a) MVP sin facturación; (b) definir ahora | (a) | US-G-12, onboarding |
| 3 | Alcance de organizaciones (C-12) | (a) una organización; (b) multi-tenant | (a) con `organization_id` | US-G-02/03 |
| 4 | Canal de alertas (C-05) | (a) in-app; (b) +correo | (a) | US-G-08 |
| 5 | Comparador y calculadora (C-04, V-05) | (a) Must; (b) Should; (c) Won’t | (b) | US-C-06/07 |
| 6 | Etiqueta `Cálculo` (D-08) | (a) sí; (b) no | (a) | FICHAS-CLAVE §5, US-C-07 |
| 7 | Aprobar Playwright, k6, gitleaks, ZAP, Lighthouse CI | Sí / No / otras | Sí, instalando fuera de OneDrive | EN-02, ESTRATEGIA |
| 8 | Capacidad y tamaño del equipo | `[PENDIENTE]` | Medir velocidad en S1–S2 | §4.2, §5 |
| 9 | Calendario: ¿se acepta G6/G7 fuera de las 16 semanas? | (a) sí; (b) ampliar | (a) | Roadmap |
| 10 | Exportación CSV (V-08) | (a) Could; (b) fuera | (a) | US-G-16 |
| 11 | Revisión humana: ¿cuándo relajarla? (C-09) | (a) tras 3 meses con RNF-19 concluyente; (b) nunca en MVP | (a) | US-F-11 |
| 12 | Responsable de anotación de golden sets (QA-D5) | `[PENDIENTE]` | Definir en G0 | EN-04 |

---

## 8. Trazabilidad e integridad de este documento

- **86 historias** = 86 requisitos funcionales (1:1 con la matriz de REQUISITOS, Anexo B; US-B-04 corregida en v0.2.0).
- La prioridad y el número de historia se **leen** de `REQUISITOS-Y-TRAZABILIDAD.md`; la comprobación `RF → US → T-RF` se hizo por script y no halló huérfanos ni duplicados.
- No se ha estimado nada con el equipo que construirá ni con datos de velocidad real.
- Todas las pruebas asociadas están `PLANIFICADA` (ESTRATEGIA §12); **ninguna se ha ejecutado**.

---

## 9. Registro de cambios

| Versión | Fecha | Cambio | Autor |
|---|---|---|---|
| 0.2.0 | 2026-11-15 | Ronda 2: dependencias con IDs `T-*` de A; rangos para EN-01…EN-08; camino crítico calculado (43,5 d); reconciliación de calendario (§4.4); verificación de dependencias (§4.5); US-A-11 pasa a S4 (suelo de `T-AI-06`); US-G-02/13 sin dependencia de `T-WEB-09`. | Ventana B |
| 0.1.0 | 2026-11-15 | Creación: 86 historias con estimación relativa, dependencias con A y criterios de aceptación; habilitadores; roadmap de 16 semanas con 8 sprints y 8 gates; riesgos y decisiones pendientes. | Ventana B |
