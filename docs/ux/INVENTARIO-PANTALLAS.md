# Inventario de pantallas — AviTech Investment Intelligence

| Campo | Valor |
|---|---|
| Documento | `docs/ux/INVENTARIO-PANTALLAS.md` |
| Versión | 0.3.0 (Sprint 0, Ronda 5) |
| Fecha | 2026-11-15 |
| Autor | Ventana B |
| Estado | **BORRADOR PARA APROBACIÓN** |
| Base | Prompt Maestro §9 (14 pantallas) + §16 (criterios de MVP) |
| Dependencias | Ventana A (fuentes, modelo de datos, IA) — **ninguna validada aún** |

> **Regla de honestidad.** Ninguna pantalla asume que un dato existirá. Si la Ventana A no confirma una fuente o un campo, la pantalla debe declarar cobertura parcial o estado vacío con motivo. Las rutas son una **propuesta** de información; no son código ni compromiso de implementación.

---

## 1. Convenciones

### 1.1 Navegación principal (propuesta)

```
Dashboard
Radar            → Acontecimientos
Proyectos        → Proyectos | Permisos
Licitaciones
Instrumentos
Oportunidades
Empresas         (acceso desde fichas y búsqueda; no en nav primaria)
Mapa             (Could)
Watchlist
Alertas
—— pie ——
Configuración
Administración   (solo roles autorizados)
```

- **Buscador global** siempre accesible (`/` o `Ctrl/Cmd + K`).
- **Barra lateral** en escritorio (≥ 1024 px), **barra superior + hoja** en móvil.
- **Ruta activa** visible y anunciada a lectores de pantalla.
- **Migas de pan** en fichas de detalle.

### 1.2 Breakpoints

| Nombre | Rango | Comportamiento |
|---|---|---|
| `mobile` | 375–767 px | Una columna; tablas → tarjetas; filtros en hoja modal; acciones primarias fijas al pie cuando aplique. |
| `tablet` | 768–1023 px | Dos columnas cuando aporta; sidebar colapsada a iconos. |
| `desktop` | 1024–1439 px | Sidebar 240 px; tablas densas; panel de detalle lateral en listas. |
| `wide` | ≥ 1440 px | Contenido máximo 1440 px; panel de evidencia a 420 px. |

### 1.3 Estados estándar (definición común)

| Estado | Comportamiento | Regla |
|---|---|---|
| **Vacío inicial** | Explica qué es la pantalla, por qué está vacía y qué hacer. | Nunca un espacio en blanco; una acción primaria. |
| **Vacío por filtros** | “No hay resultados con estos filtros” + “Quitar filtros” + resumen de filtros activos. | Conserva los filtros en la URL. |
| **Carga** | Esqueleto con la forma del contenido (filas/tarjetas), sin spinner de página completa. | Si tarda > 5 s, mensaje “Sigue cargando…” con opción de cancelar. |
| **Error** | Mensaje claro, `request_id` copiable y botón “Reintentar”. | No mostrar trazas ni datos internos. |
| **Sin permisos** | 403 con explicación y enlace seguro (“Volver al dashboard”). | No revelar la existencia de datos. |
| **Sesión expirada** | Redirige a login conservando `returnTo`. | No perder filtros ni borrador de nota. |
| **Cobertura parcial** | Aviso junto al dato: “Esta fuente no publica X”. | Visible, no letra pequeña. |
| **Demo** | Etiqueta “DEMO” en la ficha y en las filas. | Excluido de KPIs. |

### 1.4 Capas de confianza en pantalla

Todo contenido debe declarar una de estas capas (detalle en `docs/ux/SISTEMA-DISENO.md` §6):

| Capa | Etiqueta | Icono | Tratamiento |
|---|---|---|---|
| Dato confirmado | `Confirmado` | escudo con check | Fondo neutro, borde sólido. |
| Análisis IA | `Análisis IA` | destellos | Borde izquierdo azul, modelo y fecha visibles. |
| Inferencia comercial | `Inferencia` | flecha diagonal | Fondo ámbar suave, borde punteado, confianza visible. |

### 1.5 Índice de pantallas

| ID | Pantalla | Ruta propuesta | Módulo | Prioridad | Persona principal |
|---|---|---|---|---|---|
| SCR-01 | Dashboard | `/dashboard` | A, C, D, F, G | Must | P1, P2 |
| SCR-02 | Radar de acontecimientos | `/radar` | A | Must | P2 |
| SCR-03 | Explorador de proyectos | `/proyectos` | B, E | Must | P2, P4 |
| SCR-04 | Permisos y autorizaciones | `/permisos` | B | Must | P2, P3 |
| SCR-05 | Licitaciones | `/licitaciones` | D | Must | P3 |
| SCR-06 | Instrumentos financieros | `/instrumentos` | C | Must | P1 |
| SCR-07 | Explorador de oportunidades | `/oportunidades` | F | Must | P1, P4 |
| SCR-08 | Detalle de empresas | `/empresas/[organizationId]` | E | Must (mínimo) | P4 |
| SCR-09 | Mapa de proyectos | `/mapa` | B, G | Could | P2, P4 |
| SCR-10 | Buscador avanzado | `/buscar` | G | Must | P2 |
| SCR-11 | Watchlist | `/watchlist` | G | Must | P1, P4 |
| SCR-12 | Centro de alertas | `/alertas` | G | Must | Todos |
| SCR-13 | Configuración de usuario | `/configuracion` | G | Must | Todos |
| SCR-14 | Panel administrativo | `/admin` | G, A, F | Must | P5 |
| AUX-01 | Autenticación | `/login`, `/registro`, `/recuperar` | G | Must | P6 |

---

## 2. Fichas de pantalla

### SCR-01 — Dashboard

**Propósito.** Responder en 10 segundos “¿qué ha cambiado y qué me importa hoy?”. Es una pantalla de orientación, no un panel de vanidad.

| Atributo | Definición |
|---|---|
| Usuario principal | P1 Inversor, P2 Analista |
| Módulos | A (eventos), C (vencimientos), D (cierres), F (oportunidades), G (estado del sistema) |
| Prioridad | **Must** |
| Alcance MVP | KPIs de actividad, novedades priorizadas, cierres próximos, frescura de datos y accesos rápidos. Sin personalización avanzada. |

**Datos que muestra**

- `KpiStat` × 4: eventos publicados (7 días), oportunidades publicadas (7 días), licitaciones que cierran en 7 días, instrumentos con vencimiento en 30 días. Cada KPI con fecha de corte y enlace al listado filtrado.
- `FreshnessBanner`: última ingesta correcta por fuente crítica; si una fuente lleva > 2× su frecuencia esperada sin actualizar, aviso ámbar.
- “Para ti” (si hay preferencias): 3–5 novedades de sectores/provincias seguidos, con etiqueta de capa.
- “Cierres próximos”: licitaciones y vencimientos ordenados por fecha, con hora y zona.
- “Oportunidades recientes”: 3 tarjetas con confianza, sector y evidencia.
- Accesos rápidos: “Explorar radar”, “Buscar”, “Mi watchlist”.
- Estado del sistema (solo si hay incidencia visible al usuario): “Datos de la fuente X retrasados”.

**Acciones**

| Acción | Rol | Resultado |
|---|---|---|
| Abrir KPI | Todos | Va al listado con el filtro aplicado. |
| Abrir novedad | Todos | Ficha de evento/oportunidad. |
| Guardar | `viewer`+ | Añade a watchlist (1 clic). |
| Configurar intereses | `viewer`+ | Va a SCR-13. |
| Ver incidencia | Todos | Explica qué dato está retrasado y desde cuándo. |

**Filtros.** Rango temporal (7/30/90 días) y “solo mis intereses”. No hay filtros complejos; el dashboard debe seguir siendo legible.

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | “Aún no hay actividad para mostrar” + “Explorar el radar” + “Configurar intereses”. No mostrar gráficos vacíos. |
| Carga | 4 esqueletos de KPI + 5 filas de novedades. |
| Error | “No pudimos cargar tu resumen” + `request_id` + “Reintentar”; los KPIs que sí cargaron se muestran con aviso. |
| Sin permisos | No aplica (todo autenticado). Si no hay sesión, redirige a login. |
| Cobertura parcial | Banner: “X de Y fuentes actualizadas”; enlace a detalle. |

**Responsive.** Desktop: 4 KPIs en fila, dos columnas (novedades 2/3, cierres 1/3). Tablet: 2×2 KPIs. Mobile: KPIs en carrusel horizontal con scroll snap; novedades en tarjetas; cierres como lista compacta.

**Accesibilidad.** Los KPIs son enlaces con nombre accesible completo (“Eventos publicados en los últimos 7 días: 42”). Los gráficos, si existen, tienen tabla alternativa y resumen textual. El orden de tabulación sigue la jerarquía visual.

**Criterios de aceptación**

- **AC-01-01** Dado un usuario con datos, cuando abre `/dashboard`, entonces ve 4 KPIs con fecha de corte y cada uno enlaza al listado filtrado correspondiente.
- **AC-01-02** Dado un usuario sin watchlist ni intereses, cuando abre el dashboard, entonces ve un estado vacío con al menos una acción para empezar, no un panel en blanco.
- **AC-01-03** Dada una fuente retrasada, cuando se abre el dashboard, entonces aparece un aviso que nombra la fuente y la antigüedad del último dato.
- **AC-01-04** Dado un registro demo, cuando se cuenta en un KPI, entonces el KPI lo excluye y la interfaz lo indica.

**Dependencias Ventana A.** Contrato de métricas agregadas, frescura por fuente, definición de “evento publicado”. `[PENDIENTE A]`

---

### SCR-02 — Radar de acontecimientos

**Propósito.** Ser la superficie principal de descubrimiento: una lista densa, filtrable y trazable de acontecimientos económicos, con evidencia a un clic.

| Atributo | Definición |
|---|---|
| Usuario principal | P2 Analista; P1 Inversor |
| Módulos | A |
| Prioridad | **Must** |
| Alcance MVP | Lista + filtros + detalle con evidencia + guardar + crear alerta. Sin mapa de calor ni clustering avanzado. |

**Datos que muestra**

- `EventCard` / fila de tabla: titular resumido, `published_at` (relativa + absoluta en tooltip), sector, organización(es), ubicación, fuente, `verification_status`, etiqueta `Confirmado`/`Análisis IA`/`Inferencia` cuando aplique, `is_demo`.
- Contador de resultados y “actualizado hace X”.
- Panel de detalle (desktop) o página completa (móvil): resumen, hechos clave, evidencia, organizaciones, sectores, cronología, oportunidades relacionadas, acciones.
- Filtros: texto, sector (multi), organización, provincia, rango de fechas, fuente, estado de verificación, “solo con evidencia”.
- Orden: más reciente, más relevante, más antiguo.

**Acciones**

| Acción | Rol | Resultado |
|---|---|---|
| Abrir evento | Todos | Detalle con evidencia. |
| Guardar | `viewer`+ | Watchlist. |
| Crear alerta | `viewer`+ | Preferencia basada en el filtro o el evento. |
| Corregir clasificación | `analyst`+ | Modal con motivo; auditoría. |
| Marcar duplicado | `analyst`+ | Propone fusión; la confirma un admin. |
| Exportar (CSV) | `[PENDIENTE]` | Descarga filtrada. |

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | “El radar se está alimentando” + estado de fuentes + “Ver últimos 30 días”. |
| Vacío por filtros | “No hay acontecimientos con estos filtros” + chips de filtros + “Quitar todos”. |
| Carga | 10 filas esqueleto; el panel de detalle muestra su propio esqueleto. |
| Error | “No pudimos cargar el radar” + `request_id` + “Reintentar”; conserva filtros. |
| Sin permisos | Visitante → login con `returnTo`. `viewer` puede leer todo lo publicado. |
| Cobertura parcial | “Esta fuente no publica montos” o “Solo titulares” junto al dato afectado. |

**Responsive.** Desktop: tabla 60 % + panel de detalle 40 % (o drawer). Tablet: tabla completa; detalle en drawer. Mobile: tarjetas apiladas; filtros en hoja; detalle a pantalla completa; “volver” conserva scroll y filtros.

**Accesibilidad.** Tabla con `caption`, encabezados `th` y `scope`; filas navegables con teclado; el estado de verificación no depende solo del color; `aria-live="polite"` al actualizar resultados.

**Criterios de aceptación**

- **AC-02-01** Dado un evento publicado, cuando el usuario lo abre, entonces la evidencia está a un clic y el documento original se abre en pestaña nueva.
- **AC-02-02** Dado un evento sin evidencia almacenada, cuando se abre, entonces muestra “Sin evidencia verificable” y no permite generar oportunidad desde él.
- **AC-02-03** Dados tres filtros aplicados, cuando el usuario recarga la página, entonces los filtros se conservan en la URL y los resultados coinciden.
- **AC-02-04** Dado un evento `disputed` **publicado deliberadamente por una persona con rol `opportunity_manager+`** (política P0), cuando se muestra en la lista a un `viewer`, entonces lleva la etiqueta “En disputa” y un tooltip con las fuentes en conflicto. Mientras el evento está en cola de revisión **no aparece** en la lista, la búsqueda ni las alertas.
- **AC-02-05** Dado un evento publicado cuya verificación empeora (p. ej. de `verified` a `disputed`), cuando el sistema lo detecta, entonces vuelve a la cola, desaparece del radar para `viewer` y solo reaparece tras una nueva publicación humana. Un evento `pending` nunca se muestra.

**Dependencias Ventana A.** Esquema de `economic_events`, deduplicación, contrato de evidencia, taxonomía sectorial. `[PENDIENTE A]`

---

### SCR-03 — Explorador de proyectos

**Propósito.** Ver el pipeline real de proyectos (anunciados, en permiso, aprobados, en construcción, operando) sin confundir registro con aprobación.

| Atributo | Definición |
|---|---|
| Usuario principal | P2 Analista, P4 Gestor |
| Módulos | B, E |
| Prioridad | **Must** |
| Alcance MVP | Lista + filtros + ficha + historial + oportunidades relacionadas. Sin edición masiva. |

**Datos que muestra**

- Tabla/tarjetas: nombre, promotor, sector, ubicación (provincia/municipio), estado administrativo, monto anunciado (o “No disponible”), fecha de última actualización, fuente, `verification_status`.
- Resumen superior: total por estado (sin sumar montos de monedas distintas).
- Ficha: los 12 campos del PM, documento oficial, historial de cambios, permisos asociados, oportunidades potenciales (inferencia), empresas relacionadas.
- Filtros: tipo de proyecto, estado, sector, provincia, institución, rango de monto (con moneda), fecha, “solo con documento oficial”.

**Acciones**

| Acción | Rol | Resultado |
|---|---|---|
| Abrir ficha | Todos | Detalle. |
| Guardar / seguir | `viewer`+ | Watchlist. |
| Crear alerta de estado | `viewer`+ | Aviso al cambiar de estado. |
| Editar ficha | `analyst`+ | Formulario con validación y motivo. |
| Añadir documento | `analyst`+ | Adjunta referencia oficial; auditoría. |
| Ver oportunidades | Todos | SCR-07 filtrado por proyecto. |

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | “Aún no hay proyectos para este filtro” + “Ver todos” + estado de cobertura por tipo. |
| Vacío por filtros | Chips + limpiar. |
| Carga | Esqueleto de tabla + resumen. |
| Error | Mensaje + reintento; no perder filtros. |
| Sin permisos | `viewer` no ve el botón editar; acceso directo a edición → 403. |
| Cobertura parcial | “Solo proyectos con permiso ambiental” si falta otra fuente. |

**Responsive.** Desktop: tabla con columnas fijas (nombre, estado, ubicación, monto, actualización). Mobile: tarjeta con nombre, estado, ubicación y monto; el resto en detalle.

**Accesibilidad.** El estado se muestra con texto + icono; los montos usan `tabular-nums`; la tabla permite navegación por filas y anuncio de orden.

**Criterios de aceptación**

- **AC-03-01** Dado un proyecto en estado `permit_applied`, cuando se abre su ficha, entonces no aparece como “Aprobado” en ningún lugar.
- **AC-03-02** Dado un proyecto sin monto publicado, cuando se muestra, entonces dice “No disponible” y no “RD$0”.
- **AC-03-03** Dado un proyecto con historial, cuando se abre la pestaña de historial, entonces cada cambio tiene fecha, fuente y valor anterior/nuevo.
- **AC-03-04** Dado un usuario `viewer`, cuando intenta abrir `/proyectos/[id]/editar`, entonces recibe 403 y no se muestran campos editables.

**Dependencias Ventana A.** Taxonomía de estados, esquema de `projects`/`permits`, fuente de montos y ubicación. `[PENDIENTE A]` y `[PENDIENTE SRS]` (estados exactos).

---

### SCR-04 — Permisos y autorizaciones

**Propósito.** Consultar permisos ambientales, energéticos, turísticos, industriales y concesiones como objetos auditables, con institución, expediente y documento.

| Atributo | Definición |
|---|---|
| Usuario principal | P2 Analista, P3 PyME |
| Módulos | B |
| Prioridad | **Must** |
| Alcance MVP | Lista y ficha de permiso con documento, estado e historial. Sin flujo de solicitud (no somos la autoridad). |

**Datos que muestra**

- Tabla: tipo de permiso, solicitante/promotor, institución, número de expediente, estado, fecha de solicitud, fecha de resolución, ubicación, documento.
- Ficha: resumen, estado con explicación (“Aprobado según Resolución X del …”), documento embebido/enlazado, historial de versiones, proyectos relacionados, condiciones/restricciones si la fuente las publica.
- Filtros: tipo, institución, estado, provincia, año, “con resolución”.

**Acciones**

| Acción | Rol | Resultado |
|---|---|---|
| Abrir documento | Todos | Fuente oficial en pestaña nueva. |
| Guardar / alerta | `viewer`+ | Watchlist / alerta de resolución. |
| Vincular a proyecto | `analyst`+ | Relación auditada. |
| Corregir estado | `analyst`+ | Exige documento y motivo. |
| Ver proyecto | Todos | Navegación cruzada. |

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | “No hay permisos cargados para este tipo” + cobertura por institución. |
| Vacío por filtros | Chips + limpiar. |
| Carga | Esqueleto. |
| Error | Reintento + `request_id`. |
| Sin permisos | Solo lectura para `viewer`; edición oculta y protegida. |
| Cobertura parcial | “Esta institución no publica número de expediente”. |

**Responsive.** Igual que SCR-03. En móvil, el documento se abre fuera de la app para evitar PDFs incrustados pesados.

**Accesibilidad.** El número de expediente se muestra en texto seleccionable; el documento tiene nombre accesible (“Abrir Resolución 012-2026 en PDF, fuente oficial”).

**Criterios de aceptación**

- **AC-04-01** Dado un permiso aprobado, cuando se abre, entonces muestra la resolución o documento que lo acredita y la fecha.
- **AC-04-02** Dado un permiso solo registrado, cuando se abre, entonces el estado es “Solicitado” o “Anunciado”, nunca “Aprobado”.
- **AC-04-03** Dado un cambio de estado, cuando se consulta el historial, entonces aparecen fecha, documento y responsable del cambio.
- **AC-04-04** Dado un usuario sin sesión, cuando abre un permiso, entonces se le pide iniciar sesión y, tras hacerlo, vuelve al mismo permiso.

**Dependencias Ventana A.** Fuentes por institución, formatos de expediente, disponibilidad de documentos. `[PENDIENTE A]`

---

### SCR-05 — Licitaciones

**Propósito.** Detectar oportunidades de contratación pública con plazo, presupuesto y documento, y distinguir el hecho (licitación/adjudicación) de la inferencia (subcontratación).

| Atributo | Definición |
|---|---|
| Usuario principal | P3 PyME, P2 Analista |
| Módulos | D |
| Prioridad | **Must** |
| Alcance MVP | Lista, ficha, plazo, presupuesto, adjudicación, alertas y enlace al pliego. Subcontratación como inferencia (Should). |

**Datos que muestra**

- Lista: código de proceso, título, institución, sector, provincia, presupuesto (moneda), fecha/hora límite, estado (`open`, `closing_soon`, `closed`, `awarded`), etiqueta “PyME” si cumple criterios configurables.
- Ficha: objeto, requisitos, plazos, documentos, adjudicatario y monto (si existe), contratos relacionados, oportunidades de subcontratación (inferencia), fuente.
- Cuenta atrás con zona horaria.
- Filtros: sector, institución, provincia, estado, rango de presupuesto, cierre en X días, “apto PyME” (si se aprueba).

**Acciones**

| Acción | Rol | Resultado |
|---|---|---|
| Abrir pliego | Todos | Documento oficial. |
| Guardar | `viewer`+ | Watchlist. |
| Crear alerta de cierre | `viewer`+ | Aviso 7/3/1 días. |
| Ver adjudicación | Todos | Datos del contrato. |
| Ver empresa adjudicataria | Todos | SCR-08. |
| Marcar seguimiento | `opportunity_manager` | Pipeline interno. |

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | “No hay licitaciones abiertas” + “Ver histórico” + cobertura por institución. |
| Vacío por filtros | Chips + limpiar. |
| Carga | Esqueleto; la cuenta atrás no se muestra hasta tener fecha válida. |
| Error | Reintento; si falla la fuente, aviso “datos pueden estar desactualizados”. |
| Sin permisos | Lectura para `viewer`; acciones internas ocultas. |
| Cobertura parcial | “Solo procesos publicados en el portal X”. |

**Responsive.** Desktop: tabla con columna de cierre destacada. Mobile: tarjeta con título, institución, cierre y presupuesto; cuenta atrás visible sin scroll horizontal.

**Accesibilidad.** La cuenta atrás no es el único indicador: texto “Cierra el 20 nov 2026, 14:00 (AST)” siempre presente. `aria-live` solo para cambios de estado, no cada segundo.

**Criterios de aceptación**

- **AC-05-01** Dada una licitación con cierre en 48 h, cuando se muestra, entonces el estado es `closing_soon` y la fecha incluye hora y zona.
- **AC-05-02** Dado un proceso adjudicado, cuando se abre, entonces muestra adjudicatario y monto con documento; si no hay monto, “No disponible”.
- **AC-05-03** Dada una oportunidad de subcontratación, cuando se muestra, entonces lleva la etiqueta “Inferencia” y la advertencia de que no es un contrato.
- **AC-05-04** Dado un usuario con alerta de cierre, cuando faltan 3 días, entonces recibe una sola notificación y no se repite al reabrir la ficha.

**Dependencias Ventana A.** Fuente DGCP (API/CSV/ scraping legal), esquema de `public_tenders`/`contracts`, identificadores de proceso. `[PENDIENTE A]`

---

### SCR-06 — Instrumentos financieros

**Propósito.** Consultar instrumentos de renta fija, tasas, vencimientos y requisitos, distinguiendo el tipo de tasa y sin insinuar disponibilidad de compra.

| Atributo | Definición |
|---|---|
| Usuario principal | P1 Inversor |
| Módulos | C |
| Prioridad | **Must** |
| Alcance MVP | Lista, ficha, historial de tasas, calendario, comparador (Should) y calculadora (Should, bloqueada hasta definir fórmulas). |

**Datos que muestra**

- Lista: emisor, instrumento, tipo, moneda, plazo, tasa, tipo de tasa (`indicative`/`awarded`/`effective`), vencimiento, fuente, fecha de actualización.
- Ficha: todos los campos, historial de tasas (gráfico + tabla), requisitos de participación, documento, riesgos declarados por la fuente, estado de disponibilidad (“No confirmada” por defecto).
- Calendario: subastas y vencimientos.
- Comparador: hasta 4 instrumentos, columnas alineadas; aviso si monedas o tipos de tasa difieren.

**Acciones**

| Acción | Rol | Resultado |
|---|---|---|
| Abrir fuente | Todos | Documento oficial. |
| Comparar | Todos | Hasta 4; sin conversión implícita. |
| Calcular | Todos (si habilitado) | Resultado con supuestos y fórmula. |
| Guardar / alerta | `viewer`+ | Watchlist / alerta de emisión o vencimiento. |
| Ver requisitos | Todos | Texto de la fuente + enlace. |

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | “Aún no hay instrumentos cargados” + cobertura por emisor. |
| Vacío por filtros | Chips + limpiar. |
| Carga | Esqueleto; no mostrar tasas parciales sin fecha. |
| Error | Reintento; aviso de última actualización válida. |
| Sin permisos | Lectura para `viewer`; sin acciones de compra para nadie. |
| Cobertura parcial | “Este emisor no publica tasa efectiva”. |

**Responsive.** Desktop: tabla + panel de comparación. Mobile: tarjetas con tasa y vencimiento; comparador en vista de columnas desplazables con encabezado fijo, o lista de diferencias.

**Accesibilidad.** Gráficos con tabla alternativa y resumen (“La tasa pasó de 8,25 % a 8,50 % entre enero y marzo”). No usar solo color para `indicative` vs `awarded`.

**Criterios de aceptación**

- **AC-06-01** Dado un instrumento sin confirmación de disponibilidad, cuando se abre, entonces no hay CTA de compra y se muestra “Disponibilidad no confirmada”.
- **AC-06-02** Dada una tasa, cuando se muestra, entonces indica su tipo y la fecha a la que corresponde.
- **AC-06-03** Dados dos instrumentos en monedas distintas, cuando se comparan, entonces no se suman ni se convierten sin tipo de cambio con fuente y fecha.
- **AC-06-04** Dada una calculadora habilitada, cuando el usuario introduce datos, entonces ve la fórmula, los supuestos y la etiqueta “Estimación”.

**Dependencias Ventana A.** Fuentes BCRD/Hacienda/SIMV, definición de tasas, reglas de cálculo, tipos de cambio. `[PENDIENTE A]` + `[PENDIENTE SRS]` (fórmulas).

---

### SCR-07 — Explorador de oportunidades

**Propósito.** Presentar hipótesis de oportunidad fundamentadas, con evidencia, confianza, riesgos y próximos pasos, sin convertirlas en recomendaciones.

| Atributo | Definición |
|---|---|
| Usuario principal | P1 Inversor, P4 Gestor |
| Módulos | F |
| Prioridad | **Must** |
| Alcance MVP | Lista, ficha, filtros, guardar, feedback, revisión humana (admin). Sin scoring personalizado. |

**Datos que muestra**

- Lista: título, tipo, sector, ubicación, confianza (banda + valor), horizonte, estado (`published`), fecha, `is_demo`.
- Ficha: descripción, hecho originador (enlace al evento), evidencia (panel), sector beneficiado, ubicación, capital estimado con cita o “No disponible”, requisitos, riesgos, horizonte, confianza explicada, próximos pasos, versión y revisor.
- Bloque “Por qué esta oportunidad” con razonamiento resumido y enlaces a evidencia.
- Bloque “Qué no sabemos” (vacíos declarados).
- Filtros: tipo, sector, provincia, confianza, horizonte, “con capital estimado”, “guardadas”.

**Acciones**

| Acción | Rol | Resultado |
|---|---|---|
| Guardar | `viewer`+ | Watchlist. |
| Añadir nota | `viewer`+ | Nota privada. |
| Feedback | `viewer`+ | Útil/no útil + motivo. |
| Ver evidencia | Todos | Documento original. |
| Revisar / publicar | `analyst` / `opportunity_manager` | Flujo de revisión. |
| Compartir enlace | Todos | Enlace a la ficha (respeta permisos). |

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | “Aún no hay oportunidades publicadas” + “Ver radar” + explicación del proceso de revisión. |
| Vacío por filtros | Chips + limpiar. |
| Carga | Esqueleto de tarjetas; no mostrar confianza sin datos. |
| Error | Reintento + `request_id`. |
| Sin permisos | `viewer` solo ve `published`; borradores → 404/403 sin filtrar contenido. |
| Cobertura parcial | “Sin capital estimado: la fuente no publica monto”. |

**Responsive.** Desktop: lista 40 % + detalle 60 %. Mobile: tarjetas y detalle a pantalla completa; el panel de evidencia se abre como hoja.

**Accesibilidad.** La confianza se expresa con número + etiqueta (“Alta, 82/100”) y texto explicativo; no solo con barra de color. Los riesgos son una lista semántica.

**Criterios de aceptación**

- **AC-07-01** Dada una oportunidad publicada, cuando se abre, entonces muestra al menos una cita que resuelve al documento y el evento originador.
- **AC-07-02** Dada una oportunidad sin cita válida, cuando se intenta publicar, entonces el sistema bloquea la publicación con un mensaje que indica el campo.
- **AC-07-03** Dada una oportunidad con capital estimado, cuando se muestra la cifra, entonces aparece su cita y moneda; si no hay base, dice “No disponible”.
- **AC-07-04** Dado un usuario `viewer`, cuando intenta abrir una oportunidad en `draft` por URL, entonces recibe 403 y no se filtra el contenido.

**Dependencias Ventana A.** Esquema de `investment_opportunities`, evidencia, contratos de IA, flujo de revisión. `[PENDIENTE A]`

---

### SCR-08 — Detalle de empresas

**Propósito.** Consolidar la actividad de una organización (eventos, proyectos, permisos, licitaciones, contratos y oportunidades) para entender su expansión y su relación con el entorno.

| Atributo | Definición |
|---|---|
| Usuario principal | P4 Gestor, P2 Analista |
| Módulos | E, B, D, F |
| Prioridad | **Must (versión mínima)** — si el tiempo aprieta, se degrada a panel lateral; decisión en gate G3. |
| Alcance MVP | Agregación de datos existentes; sin enrich de contacto ni datos privados. |

**Datos que muestra**

- Cabecera: razón social, alias, sector, ubicación, identificador fiscal (si es público), `verification_status`.
- Resumen: número de eventos, proyectos, licitaciones, contratos y oportunidades (con ventana temporal).
- Timeline de hitos con evidencia.
- Pestañas: Actividad, Proyectos, Licitaciones/Contratos, Oportunidades, Relaciones.
- Relaciones: matriz/ subsidiaries solo si la fuente las declara; si no, “Sin relaciones documentadas”.
- Bloque “Necesidades potenciales” como inferencia, con explicación.

**Acciones**

| Acción | Rol | Resultado |
|---|---|---|
| Seguir empresa | `viewer`+ | Watchlist + alerta. |
| Abrir evidencia | Todos | Documento. |
| Ver oportunidad | Todos | SCR-07. |
| Editar ficha / fusionar | `analyst` / `platform_admin` | Cambio auditado. |
| Exportar ficha | `[PENDIENTE]` | PDF/CSV. |

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | “No encontramos actividad documentada para esta empresa” + “Buscar en el radar” + explicación. |
| Carga | Esqueleto de cabecera + timeline. |
| Error | Reintento. |
| Sin permisos | Lectura autenticada; edición solo roles internos. |
| Cobertura parcial | “Solo se muestran fuentes que identifican a la empresa por razón social”. |

**Responsive.** Desktop: cabecera + dos columnas (timeline 2/3, resumen 1/3). Mobile: cabecera compacta, pestañas desplazables, timeline vertical.

**Accesibilidad.** La timeline es una lista ordenada; los hitos anuncian fecha y tipo; las pestañas usan el patrón ARIA de tabs.

**Criterios de aceptación**

- **AC-08-01** Dada una empresa con eventos, cuando se abre, entonces la timeline muestra fecha, tipo y enlace a evidencia de cada hito.
- **AC-08-02** Dada una empresa sin relaciones documentadas, cuando se abre la pestaña Relaciones, entonces dice “Sin relaciones documentadas”, no un gráfico vacío.
- **AC-08-03** Dada una necesidad potencial, cuando se muestra, entonces lleva etiqueta “Inferencia” y explicación.
- **AC-08-04** Dado un `analyst`, cuando fusiona dos empresas, entonces se pide confirmación, se conserva el historial y se puede deshacer por un `platform_admin`.

**Dependencias Ventana A.** Entidad `organizations`, reglas de deduplicación, relación con `projects`/`tenders`. `[PENDIENTE A]` (C-07).

---

### SCR-09 — Mapa de proyectos

**Propósito.** Ver la distribución geográfica de proyectos y permisos para detectar concentraciones y oportunidades locales.

| Atributo | Definición |
|---|---|
| Usuario principal | P2 Analista, P4 Gestor |
| Módulos | B, G |
| Prioridad | **Could** (fuera del camino crítico del MVP) |
| Alcance MVP | No incluido; se reevalúa tras el piloto. Si se implementa: mapa + filtros + agrupación por provincia. |

**Datos que muestra**

- Puntos/agrupaciones por provincia o coordenadas (solo si existen).
- Panel lateral: proyectos del área visible, con estado y monto.
- Leyenda por estado y por sector.
- Aviso de cobertura: “X % de proyectos tienen coordenadas”.

**Acciones**

| Acción | Rol | Resultado |
|---|---|---|
| Filtrar | Todos | Actualiza puntos y panel. |
| Abrir proyecto | Todos | SCR-03. |
| Cambiar capa | Todos | Sector/estado/año. |
| Exportar vista | `[PENDIENTE]` | Imagen/CSV. |

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | “Aún no hay proyectos geolocalizados” + “Ver lista”. |
| Vacío por filtros | “Sin proyectos en esta área” + “Alejar mapa”. |
| Carga | Mapa con esqueleto de panel; no bloquear el mapa. |
| Error | “No pudimos cargar el mapa” + “Ver lista” como alternativa. |
| Sin permisos | Autenticado; sin datos sensibles. |
| Cobertura parcial | “Solo el 40 % de los proyectos tiene coordenadas; el resto se agrupa por provincia”. |

**Responsive.** Desktop: mapa 70 % + panel 30 %. Mobile: mapa a pantalla completa con hoja inferior; alternativa de lista siempre disponible.

**Accesibilidad.** El mapa nunca es la única vía: lista equivalente y tabla por provincia. Controles de zoom con teclado y etiquetas.

**Criterios de aceptación**

- **AC-09-01** Dado un proyecto sin coordenadas, cuando se abre el mapa, entonces aparece agrupado por provincia y se indica que no tiene coordenadas.
- **AC-09-02** Dado un usuario que no puede usar el mapa, cuando accede a la vista lista, entonces obtiene los mismos filtros y datos.
- **AC-09-03** Dada una selección en el mapa, cuando se abre el panel, entonces el proyecto enlaza a su ficha.

**Dependencias Ventana A.** Geolocalización en fuentes, normalización de provincias/municipios. `[PENDIENTE A]` (C-10).

---

### SCR-10 — Buscador avanzado

**Propósito.** Encontrar cualquier entidad por texto y facetas, con resultados agrupados y URL compartible.

| Atributo | Definición |
|---|---|
| Usuario principal | P2 Analista |
| Módulos | G, A, B, C, D, F |
| Prioridad | **Must** |
| Alcance MVP | Búsqueda full-text + facetas + agrupación por tipo + vistas guardadas (Should). |

**Datos que muestra**

- Campo de búsqueda con sintaxis simple (`"frase"`, `sector:energía`, `provincia:santiago`).
- Resultados agrupados: Eventos, Proyectos, Permisos, Licitaciones, Instrumentos, Oportunidades, Empresas.
- Cada resultado: título, tipo, fecha, fuente, extracto con resaltado.
- Facetas: tipo, sector, provincia, fecha, estado, fuente, confianza.
- “Vistas guardadas” (propias; compartidas `[PENDIENTE]`).

**Acciones**

| Acción | Rol | Resultado |
|---|---|---|
| Buscar | Todos | Resultados. |
| Aplicar faceta | Todos | Refina. |
| Guardar vista | `viewer`+ | Vista privada. |
| Abrir resultado | Todos | Ficha. |
| Exportar | `[PENDIENTE]` | CSV. |

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | Sugerencias: sectores populares, “prueba con ‘energía’”, enlaces a módulos. |
| Vacío por filtros | “No encontramos resultados para …” + sugerencias + “Quitar facetas”. |
| Carga | Esqueleto de resultados; conserva el término. |
| Error | Reintento + `request_id`; no borrar la consulta. |
| Sin permisos | Autenticado; resultados solo de contenido visible para el rol. |
| Cobertura parcial | “La búsqueda cubre eventos y proyectos; instrumentos aún no”. |

**Responsive.** Desktop: facetas a la izquierda (240 px), resultados al centro. Mobile: botón “Filtros” con contador; resultados en tarjetas.

**Accesibilidad.** `role="search"`, etiqueta del campo, anuncio del número de resultados, navegación por facetas con teclado; el resaltado no altera el texto copiado.

**Criterios de aceptación**

- **AC-10-01** Dado un término, cuando se busca, entonces los resultados aparecen en ≤ 1 s p95 y se agrupan por tipo.
- **AC-10-02** Dados dos filtros y un término, cuando se recarga la URL, entonces la búsqueda se reproduce.
- **AC-10-03** Dado un `viewer`, cuando busca, entonces no aparecen borradores ni entidades de otra organización.
- **AC-10-04** Dada una búsqueda sin resultados, cuando se muestra, entonces hay al menos una acción para reformular o limpiar filtros.

**Dependencias Ventana A.** Índice de búsqueda, permisos por entidad, ranking. `[PENDIENTE A]`

---

### SCR-11 — Watchlist

**Propósito.** Reunir lo que el usuario sigue, con estado, cambios recientes y notas, para que el seguimiento no dependa de la memoria.

| Atributo | Definición |
|---|---|
| Usuario principal | P1, P4 |
| Módulos | G, F, E |
| Prioridad | **Must** |
| Alcance MVP | Lista multi-entidad, etiquetas, notas, cambios recientes y alertas. Sin tablero kanban. |

**Datos que muestra**

- Agrupación por tipo o etiqueta; contador por grupo.
- Cada elemento: título, tipo, estado, “cambió hace X”, próxima fecha relevante, nota.
- Filtros: tipo, etiqueta, “con cambios recientes”, “con fecha próxima”.
- Orden: cambios recientes, fecha próxima, alfabético.

**Acciones**

| Acción | Rol | Resultado |
|---|---|---|
| Abrir | Todos | Ficha. |
| Quitar | Todos | Deja de seguir. |
| Editar nota/etiqueta | Todos | Guardado inmediato con confirmación. |
| Crear alerta | Todos | Preferencia. |
| Ver cambios | Todos | Historial del elemento. |
| Exportar | `[PENDIENTE]` | CSV. |

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | “Tu watchlist está vacía” + “Explorar oportunidades” + “Buscar”. |
| Vacío por filtros | “No hay elementos con esta etiqueta” + limpiar. |
| Carga | Esqueleto de filas. |
| Error | Reintento; las notas no se pierden. |
| Sin permisos | Solo el propietario ve su watchlist; un admin no la inspecciona salvo auditoría justificada `[PENDIENTE LEGAL]`. |
| Cobertura parcial | “Uno de los elementos ya no está publicado”; se conserva con aviso. |

**Responsive.** Desktop: tabla con columnas tipo, estado, cambio, próxima fecha. Mobile: tarjetas con las mismas prioridades; acciones en menú.

**Accesibilidad.** Las notas se guardan con `aria-live` de confirmación; el botón “Quitar” pide confirmación o permite deshacer.

**Criterios de aceptación**

- **AC-11-01** Dado un usuario, cuando guarda una oportunidad, entonces aparece en su watchlist y persiste tras cerrar sesión.
- **AC-11-02** Dado un elemento guardado que cambió, cuando se abre la watchlist, entonces se muestra “Actualizado hace X” y el enlace al cambio.
- **AC-11-03** Dado un usuario sin elementos, cuando abre la watchlist, entonces ve un estado vacío con acciones, no una tabla vacía.
- **AC-11-04** Dado un usuario, cuando quita un elemento, entonces puede deshacer la acción durante 5 s.

**Dependencias Ventana A.** Tabla `watchlists`, eventos de cambio, permisos. `[PENDIENTE A]`

---

### SCR-12 — Centro de alertas

**Propósito.** Centralizar avisos relevantes, evitar duplicados y permitir ajustar la señal sin salir de la pantalla.

| Atributo | Definición |
|---|---|
| Usuario principal | Todos |
| Módulos | G, A, C, D, E |
| Prioridad | **Must** |
| Alcance MVP | In-app; lista, marcar leído, agrupar, preferencias. Correo `[PENDIENTE SRS]`. |

**Datos que muestra**

- Lista agrupada por día: título, tipo, entidad, motivo (“nuevo evento en tu sector”), hora, estado leído/no leído.
- Contador de no leídas en la navegación.
- Detalle lateral: qué cambió, evidencia y enlace a la ficha.
- Preferencias rápidas: pausar tipo, cambiar frecuencia.
- “Por qué recibí esto” con la regla que lo generó.

**Acciones**

| Acción | Rol | Resultado |
|---|---|---|
| Abrir alerta | Todos | Ficha con contexto. |
| Marcar leída / todas | Todos | Estado. |
| Pausar tipo | Todos | Deja de notificar. |
| Editar preferencia | Todos | SCR-13. |
| Descartar | Todos | Archiva. |

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | “No tienes alertas todavía” + “Configurar alertas” + “Explorar radar”. |
| Vacío por filtros | “No hay alertas no leídas” + “Ver todas”. |
| Carga | Esqueleto de 5 filas. |
| Error | Reintento; las alertas no leídas se conservan. |
| Sin permisos | Solo las alertas del usuario. |
| Cobertura parcial | “Las alertas de instrumentos llegarán cuando la fuente esté conectada”. |

**Responsive.** Desktop: lista + detalle. Mobile: lista y detalle a pantalla completa; “marcar todas” en menú.

**Accesibilidad.** No usar solo el color para no leído; incluir texto “Nueva”. El contador tiene nombre accesible (“3 alertas sin leer”). No anunciar cada alerta entrante con `assertive` si llegan en ráfaga.

**Criterios de aceptación**

- **AC-12-01** Dado un evento que coincide con una preferencia, cuando se publica, entonces se crea una sola alerta y se muestra en ≤ 5 min.
- **AC-12-02** Dada una alerta leída, cuando se recarga, entonces sigue leída.
- **AC-12-03** Dado un usuario que pausa un tipo, cuando se publica un evento de ese tipo, entonces no recibe alerta y la preferencia queda guardada.
- **AC-12-04** Dada una alerta, cuando se abre “Por qué recibí esto”, entonces se muestra la regla exacta que la originó.

**Dependencias Ventana A.** Tabla `notifications`, deduplicación, cola de entrega, preferencias. `[PENDIENTE A]`

---

### SCR-13 — Configuración de usuario

**Propósito.** Controlar identidad, apariencia, intereses, alertas y privacidad sin laberintos.

| Atributo | Definición |
|---|---|
| Usuario principal | Todos |
| Módulos | G |
| Prioridad | **Must** |
| Alcance MVP | Perfil, tema, zona horaria, intereses, alertas, privacidad y borrado. Sin facturación. |

**Datos que muestra**

- Perfil: nombre, correo (verificado), organización, rol (solo lectura).
- Apariencia: tema claro/oscuro/sistema; densidad de tabla (cómoda/compacta).
- Intereses: sectores, provincias, tipos de entidad, palabras clave.
- Alertas: canales (in-app; correo pendiente), frecuencia (inmediata/resumen diario/semanal), pausas.
- Privacidad: descarga de datos `[PENDIENTE]`, borrado de cuenta, consentimientos.
- Seguridad: cambiar contraseña, cerrar sesiones.

**Acciones**

| Acción | Rol | Resultado |
|---|---|---|
| Guardar cambios | Todos | Persistencia y confirmación. |
| Cambiar contraseña | Todos | Correo de confirmación. |
| Cerrar sesiones | Todos | Invalida sesiones. |
| Borrar cuenta | Todos | Flujo con confirmación. |
| Gestionar usuarios | `org_admin` | Enlace a SCR-14. |

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | No aplica; siempre hay valores por defecto visibles. |
| Carga | Esqueleto de formulario. |
| Error | Mensaje por campo + error global si no guarda; no perder cambios. |
| Sin permisos | Un `viewer` no ve la sección de administración de usuarios. |
| Cobertura parcial | “El correo de alertas aún no está disponible”. |

**Responsive.** Desktop: dos columnas (nav de secciones + formulario). Mobile: lista de secciones y formularios a pantalla completa.

**Accesibilidad.** Formularios con `label` visible, errores asociados por `aria-describedby`, foco al primer error, guardado anunciado. El cambio de tema respeta `prefers-color-scheme` cuando se elige “sistema”.

**Criterios de aceptación**

- **AC-13-01** Dado un usuario, cuando cambia el tema, entonces la preferencia persiste y se aplica sin recargar.
- **AC-13-02** Dado un formulario con un error, cuando se intenta guardar, entonces el foco va al primer campo inválido y el mensaje explica cómo corregirlo.
- **AC-13-03** Dado un usuario que borra su cuenta, cuando confirma, entonces la sesión se invalida y los datos personales se tratan según la política.
- **AC-13-04** Dado un `viewer`, cuando abre configuración, entonces no ve controles de administración de usuarios ni de organización.

**Dependencias Ventana A.** Preferencias, RLS, borrado/anonimización. `[PENDIENTE A]` + `[PENDIENTE LEGAL]`.

---

### SCR-14 — Panel administrativo

**Propósito.** Operar el producto: fuentes, ingesta, calidad, cola de revisión de IA, usuarios, roles y auditoría.

| Atributo | Definición |
|---|---|
| Usuario principal | P5 Admin |
| Módulos | G, A, F |
| Prioridad | **Must** |
| Alcance MVP | Estado de fuentes, cola de revisión, usuarios/roles, auditoría e incidencias. Sin editor de contenido masivo. |

**Datos que muestra**

- **Resumen:** fuentes activas/caídas, última ingesta, documentos hoy, errores 24 h, cola de revisión, costo IA del día `[PENDIENTE]`.
- **Fuentes:** nombre, tipo, frecuencia, última ejecución, último éxito, documentos, errores, estado (`healthy`, `degraded`, `paused`).
- **Cola de revisión:** oportunidad, confianza, riesgo, antigüedad, revisor asignado, estado.
- **Usuarios:** correo, nombre, rol, organización, último acceso, estado.
- **Auditoría:** actor, acción, entidad, antes/después, fecha, `request_id`.
- **Incidencias:** alertas operativas y notas.

**Acciones**

| Acción | Rol | Resultado |
|---|---|---|
| Reintentar fuente | `platform_admin` | Job idempotente. |
| Pausar/activar fuente | `platform_admin` | Cambio auditado. |
| Revisar/publicar/rechazar | `analyst` / `opportunity_manager` | Flujo con motivo. |
| Invitar usuario | `org_admin` / `platform_admin` | Correo de invitación. |
| Cambiar rol | `org_admin` (su org) / `platform_admin` | Auditoría; no autoelevación. |
| Ver auditoría | `org_admin` (su org) / `platform_admin` | Solo lectura. |
| Exportar auditoría | `[PENDIENTE]` | CSV. |

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | “Todo en orden” con última comprobación; no un panel vacío. |
| Carga | Esqueleto por tarjeta; no bloquear acciones de otras secciones. |
| Error | Cada tarjeta falla de forma aislada; mensaje + reintento. |
| Sin permisos | `viewer`/`analyst` sin acceso a secciones de usuarios/fuentes → 403; `analyst` solo cola de revisión. |
| Cobertura parcial | “Métricas de costo IA no configuradas”. |

**Responsive.** Desktop: sidebar de admin + contenido. Mobile: solo lectura de estado y cola; acciones destructivas/peligrosas se limitan a desktop o requieren confirmación explícita. `[PENDIENTE]` decisión de operación móvil.

**Accesibilidad.** Confirmaciones destructivas con nombre del recurso; tablas de auditoría con filtros accesibles; nunca usar solo rojo/verde para estado de fuente.

**Criterios de aceptación**

- **AC-14-01** Dado un `viewer`, cuando abre `/admin` por URL, entonces recibe 403 y no se muestra ningún dato operativo.
- **AC-14-02** Dada una fuente caída, cuando el admin la abre, entonces ve el último error, la última ejecución correcta y la opción de reintentar.
- **AC-14-03** Dado un cambio de rol, cuando se guarda, entonces aparece en auditoría con actor, fecha y rol anterior/nuevo.
- **AC-14-04** Dada una oportunidad en la cola, cuando se rechaza, entonces el motivo es obligatorio y queda registrado.
- **AC-14-05** Dado un reintento de ingesta, cuando se ejecuta dos veces, entonces no se duplican documentos ni eventos.

**Dependencias Ventana A.** Estado de ingesta, jobs, auditoría, RLS admin, costo IA. `[PENDIENTE A]`

---

### AUX-01 — Autenticación (login, registro, recuperación)

**Propósito.** Permitir el acceso con el mínimo de fricción y el máximo de claridad sobre el tratamiento de datos.

| Atributo | Definición |
|---|---|
| Usuario principal | P6 Visitante |
| Módulos | G |
| Prioridad | **Must** (auxiliar, fuera del conteo de 14) |
| Rutas | `/login`, `/registro`, `/recuperar`, `/verificar` |

**Datos que muestra.** Correo, contraseña (con requisitos visibles), nombre, aceptación de términos y privacidad, enlace de recuperación. Mensajes genéricos que no revelan si un correo existe.

**Estados**

| Estado | Comportamiento |
|---|---|
| Vacío inicial | Formulario limpio con expectativas (“Verificaremos tu correo”). |
| Carga | Botón con estado “Creando cuenta…”, deshabilitado para evitar doble envío. |
| Error | Mensaje asociado al campo o global; nunca trazas. |
| Sin permisos | No aplica. |
| Correo no verificado | Pantalla de espera con reenvío y cambio de correo. |

**Responsive.** Una columna centrada, máximo 420 px; teclado móvil sin zoom (inputs ≥ 16 px).

**Accesibilidad.** Autocompletado correcto (`email`, `new-password`), mostrar/ocultar contraseña con etiqueta, errores anunciados, foco al primer error.

**Criterios de aceptación**

- **AC-AUX-01** Dado un visitante, cuando se registra con un correo válido y acepta términos, entonces recibe verificación y no puede acceder hasta verificarla.
- **AC-AUX-02** Dado un correo ya registrado, cuando intenta registrarse, entonces el mensaje no revela la existencia de la cuenta.
- **AC-AUX-03** Dado un enlace de recuperación caducado, cuando se abre, entonces se ofrece solicitar uno nuevo.
- **AC-AUX-04** Dado un usuario autenticado, cuando abre `/login`, entonces se le redirige al dashboard.

**Dependencias Ventana A.** Supabase Auth, plantillas de correo, política de contraseñas. `[PENDIENTE A]`

---

## 3. Matriz de prioridad y alcance

| ID | Pantalla | MoSCoW | MVP | Post-MVP |
|---|---|---|---|---|
| SCR-01 | Dashboard | Must | KPIs, novedades, frescura | Personalización, comparativas |
| SCR-02 | Radar | Must | Lista, filtros, evidencia | Clustering, mapa de calor |
| SCR-03 | Proyectos | Must | Lista, ficha, historial | Edición masiva, seguimiento de cartera |
| SCR-04 | Permisos | Must | Lista, ficha, documento | Alertas por resolución |
| SCR-05 | Licitaciones | Must | Lista, cierre, pliego, adjudicación | Subcontratación avanzada, pipeline |
| SCR-06 | Instrumentos | Must | Lista, ficha, historial, calendario | Comparador, calculadora (**post-MVP, G0 #9**) |
| SCR-07 | Oportunidades | Must | Lista, ficha, evidencia, guardar | Scoring, recomendaciones (no MVP) |
| SCR-08 | Empresas | Must (mínimo) | Agregación y timeline | Enriquecimiento, relaciones societarias |
| SCR-09 | Mapa | Could | — | Mapa, capas, clustering |
| SCR-10 | Buscador | Must | Full-text + facetas | Vistas guardadas/compartidas (**post-MVP, G0 #9**), sintaxis avanzada |
| SCR-11 | Watchlist | Must | Multi-entidad, notas, cambios | Kanban, asignaciones |
| SCR-12 | Alertas | Must | In-app, preferencias | Correo, push, digest |
| SCR-13 | Configuración | Must | Perfil, tema, alertas, privacidad | Facturación, API keys |
| SCR-14 | Admin | Must | Fuentes, cola, usuarios, auditoría | Costos, SLA, auto-remediación |
| AUX-01 | Autenticación | Must | Login, registro, recuperación | SSO, MFA (evaluar) |

**Distribución MoSCoW:** 14 Must (incluye AUX-01 y SCR-08 mínimo), 1 Could (SCR-09), 0 Should a nivel de pantalla. Las capacidades Should viven dentro de cada pantalla (comparador, calculadora, subcontratación, exportación).

---

## 4. Dependencias con la Ventana A

| Dependencia | Pantallas afectadas | Estado | Si no se resuelve |
|---|---|---|---|
| Contrato de `economic_events` y evidencia | SCR-02, SCR-07, SCR-01 | `[PENDIENTE A]` | No se puede implementar el radar ni el grounding. |
| Taxonomía de estados de proyecto/permiso | SCR-03, SCR-04 | `[PENDIENTE A]` + `[PENDIENTE SRS]` | Riesgo de mostrar “aprobado” sin base. |
| Fuente DGCP y esquema de licitaciones | SCR-05 | `[PENDIENTE A]` | Pantalla vacía o solo manual. |
| Fuentes BCRD/Hacienda/SIMV y reglas de tasa | SCR-06 | `[PENDIENTE A]` | Sin instrumentos; calculadora bloqueada. |
| Esquema de oportunidades y revisión | SCR-07, SCR-14 | `[PENDIENTE A]` | Sin motor ni cola de revisión. |
| Entidad empresa (`organizations`) | SCR-08 | `[PENDIENTE A]` (C-07) | Ficha de empresa inconsistente. |
| Geolocalización | SCR-09 | `[PENDIENTE A]` | Mapa sin datos; se mantiene en Could. |
| Índice de búsqueda | SCR-10 | `[PENDIENTE A]` | Búsqueda limitada a SQL simple. |
| Notificaciones y deduplicación | SCR-12 | `[PENDIENTE A]` | Alertas duplicadas o inexistentes. |
| RLS y roles | Todas | `[PENDIENTE A]` | Riesgo de fuga de datos. |
| Auditoría | SCR-14 | `[PENDIENTE A]` | Sin trazabilidad operativa. |

---

## 5. Criterios de aceptación transversales

| ID | Criterio |
|---|---|
| AC-UX-01 | Toda pantalla tiene estados de vacío, carga, error y sin permisos implementados; ninguno muestra una página en blanco. |
| AC-UX-02 | Toda cifra muestra fuente y fecha, o “No disponible” con motivo. |
| AC-UX-03 | Toda pantalla distingue `Confirmado`, `Análisis IA` e `Inferencia` con icono + texto, no solo color. |
| AC-UX-04 | Ninguna pantalla usa datos ficticios sin la etiqueta “DEMO”. |
| AC-UX-05 | Todas las pantallas son operables con teclado y cumplen AA (axe 0 críticas/serias). |
| AC-UX-06 | Todas las rutas protegidas validan sesión y rol en servidor; el 403 no filtra datos. |
| AC-UX-07 | Todas las listas conservan filtros y orden en la URL y sobreviven a la recarga. |
| AC-UX-08 | Todos los enlaces a documentos oficiales abren en pestaña nueva con `rel="noopener noreferrer"` y nombre accesible. |
| AC-UX-09 | Ninguna pantalla muestra un CTA de compra de instrumentos ni promesas de rendimiento. |
| AC-UX-10 | Toda pantalla declara la frescura del dato que muestra (“Actualizado hace X”). |

---

## 6. Contradicciones detectadas en UX

| ID | Hecho | Opciones | Recomendación |
|---|---|---|---|
| C-02 | Las 14 pantallas no incluyen autenticación, pero el MVP la exige. | Añadir AUX-01 o embeber login. | AUX-01 fuera del conteo. |
| C-03 | Módulo E sin pantalla propia. | SCR-08 o pantalla 15. | SCR-08 mínimo. |
| C-10 | Mapa en la lista de 14 pero sin geodatos garantizados. | Could o eliminar del MVP. | Could, con alternativa de lista. |
| C-11 | Datos demo vs. datos reales. | `is_demo` + staging. | Ambas. |
| C-14 | Tablas densas vs. AA. | Tabla + tarjetas + resumen textual. | Ambas, con modos de densidad. |

---

## 7. Registro de cambios

| Versión | Fecha | Cambio | Autor |
|---|---|---|---|
| 0.3.0 | 2026-11-15 | Ronda 5: AC-02-04 reconciliado con la puerta P0 (evento `disputed` visible solo tras publicación humana deliberada); nuevo AC-02-05 (vuelta a cola). | Ventana B |
| 0.2.0 | 2026-11-15 | Revisión D-002: errata “titilar”; referencia del mapa corregida a C-10 (coherente con REQUISITOS §8); `closing_soon` ≤ 72 h. | Ventana B |
| 0.1.0 | 2026-11-15 | Creación: 14 pantallas + AUX-01, estados, responsive, criterios de aceptación y dependencias. | Ventana B |
