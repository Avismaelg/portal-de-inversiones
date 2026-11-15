# Personas, roles y casos de uso — AviTech Investment Intelligence

| Campo | Valor |
|---|---|
| Documento | `docs/producto/PERSONAS-Y-CASOS-DE-USO.md` |
| Versión | 0.3.0 (Sprint 0, Ronda 2) |
| Fecha | 2026-11-15 |
| Autor | Ventana B |
| Estado | **BORRADOR PARA APROBACIÓN** |
| Fuente | Prompt Maestro §3, §4, §9, §16; Contrato de trabajo; SRS ausente (`[PENDIENTE SRS]`) |

> **Advertencia metodológica.** No se ha realizado investigación de usuarios. Las personas de este documento son **arquetipos derivados de los roles que el Prompt Maestro menciona**, no personas reales ni segmentos medidos. Todo dato demográfico, de comportamiento o de mercado está deliberadamente ausente. Los supuestos se marcan `[SUPUESTO]` y se validarán en Sprint 1–2 con entrevistas y pruebas de usabilidad (`[PENDIENTE]`).

---

## 1. Mapa de actores

| Actor | Descripción | Autenticado | Rol(es) propuesto(s) |
|---|---|---|---|
| Visitante | Persona que llega al producto sin cuenta; ve propuesta de valor y acceso. | No | — |
| Inversor individual | Persona que evalúa instrumentos y oportunidades por cuenta propia. | Sí | `viewer` |
| Analista | Profesional que investiga, contrasta y documenta; usuario intensivo de datos y evidencia. | Sí | `analyst` |
| PyME / proveedor | Empresa pequeña o mediana que busca licitaciones, subcontratación o clientes. | Sí | `viewer` (miembro de organización) |
| Gestor de oportunidades | Responsable de convertir señales en oportunidades y darles seguimiento. | Sí | `opportunity_manager` |
| Administrador de plataforma | Responsable de fuentes, ingesta, calidad, usuarios y auditoría. | Sí | `platform_admin` |
| Administrador de organización | Gestiona usuarios y preferencias de su organización. | Sí | `org_admin` |
| Auditor / cumplimiento | Revisa decisiones, publicaciones y accesos sin modificarlos. | Sí | `viewer` + acceso a auditoría `[PENDIENTE]` |

> **Nota.** El Prompt Maestro pide cinco personas (inversor, analista, PyME/proveedor, gestor de oportunidades, admin). Los actores “visitante”, “administrador de organización” y “auditor” se añaden como roles operativos necesarios para el MVP, no como nuevas personas de producto.

---

## 2. Personas

### P1 — Inversor individual

| Dimensión | Descripción |
|---|---|
| Arquetipo | Persona con capital propio que compara instrumentos de renta fija y sigue sectores con potencial. `[SUPUESTO]` No es un operador institucional. |
| Objetivo principal | Entender qué está pasando en la economía y qué instrumentos o sectores merecen atención, sin depender de rumores. |
| Contexto de uso | Sesiones cortas, a menudo desde el móvil; vuelve cuando recibe una alerta. `[SUPUESTO]` |
| Conocimiento | Medio: entiende tasa y plazo, pero no necesariamente distingue tasa indicativa de adjudicada. |
| Frustraciones | Información dispersa; cifras sin fuente; titulares que confunden anuncio con aprobación; instrumentos que parecen comprables cuando no lo son. |
| Necesita | Evidencia en un clic, comparaciones claras, alertas relevantes y una watchlist simple. |
| No necesita | Terminal profesional, ejecución de órdenes ni asesoramiento personalizado. |
| Riesgo de abandono | Demasiado ruido, demasiados clics para llegar a la fuente, o lenguaje demasiado técnico. |
| Métrica de éxito | Guarda su primera oportunidad o instrumento en ≤ 10 min y vuelve en 7 días. `[PROPUESTO]` |

**Jobs-to-be-done**

1. Cuando oigo hablar de una inversión o un proyecto, quiero comprobar si existe un documento oficial, para no decidir sobre rumores.
2. Cuando comparo instrumentos, quiero ver la tasa correcta y su tipo, para no confundir una indicativa con una adjudicada.
3. Cuando encuentro algo relevante, quiero guardarlo y recibir avisos de cambios, para no perder el seguimiento.

**Historias asociadas:** US-A-05, US-A-08, US-C-04, US-C-05, US-C-12, US-F-12, US-G-06, US-G-07.

---

### P2 — Analista

| Dimensión | Descripción |
|---|---|
| Arquetipo | Analista de inversiones, consultor o investigador que produce análisis para otros. `[SUPUESTO]` |
| Objetivo principal | Reducir el tiempo de recolección y verificación para dedicarlo al juicio experto. |
| Contexto de uso | Escritorio, sesiones largas, varias pestañas, tablas densas y exportaciones. `[SUPUESTO]` |
| Conocimiento | Alto: detecta contradicciones, conoce el marco regulatorio y exige trazabilidad. |
| Frustraciones | Duplicados, fechas inconsistentes, PDFs sin enlace directo, resúmenes de IA sin cita, imposibilidad de auditar una cifra. |
| Necesita | Evidencia granular, historial de cambios, filtros potentes, comparación y estados de verificación. |
| No necesita | Explicaciones básicas ni gamificación. |
| Riesgo de abandono | Una sola cifra inventada o una cita que no resuelve al documento destruye la confianza. |
| Métrica de éxito | Encuentra y cita evidencia en ≤ 3 clics; 0 correcciones por cifras sin fuente. `[PROPUESTO]` |

**Jobs-to-be-done**

1. Cuando un evento parece relevante, quiero leer el fragmento exacto y abrir el documento original, para poder citarlo.
2. Cuando dos fuentes se contradicen, quiero ver ambas y el estado de verificación, para explicar la discrepancia.
3. Cuando reviso un lote de análisis IA, quiero corregir y recomendar publicar, o devolver con un motivo, para mantener la calidad (la publicación la decide el gestor).

**Historias asociadas:** US-A-05, US-A-10, US-A-11, US-A-12, US-B-06, US-C-08, US-F-11, US-G-04, US-G-05.

---

### P3 — PyME / proveedor

| Dimensión | Descripción |
|---|---|
| Arquetipo | Dueño o responsable comercial de una PyME que vende servicios, suministros u obra a empresas y al Estado. `[SUPUESTO]` |
| Objetivo principal | Detectar licitaciones y proyectos donde pueda participar o subcontratar, con tiempo suficiente. |
| Contexto de uso | Móvil y escritorio; poco tiempo; valora lenguaje claro y fechas visibles. `[SUPUESTO]` |
| Conocimiento | Medio-bajo en finanzas; alto en su oficio y en requisitos de contratación. |
| Frustraciones | Pliegos difíciles de encontrar, fechas que se pasan, requisitos que no entiende, “oportunidades” genéricas sin relación con su capacidad. |
| Necesita | Filtros por sector, provincia, monto y plazo; cuenta atrás; resumen de requisitos; enlace al pliego. |
| No necesita | Análisis macroeconómico profundo ni instrumentos financieros. |
| Riesgo de abandono | Alertas irrelevantes o que llegan tarde; exceso de jerga. |
| Métrica de éxito | Abre una licitación y llega al pliego oficial en ≤ 2 min; 0 fechas límite perdidas por alerta tardía. `[PROPUESTO]` |

**Jobs-to-be-done**

1. Cuando sale una licitación en mi sector, quiero saber si puedo participar y cuándo cierra, para decidir rápido.
2. Cuando un proyecto grande se aprueba, quiero ver qué necesidades puede generar, para ofrecer mis servicios sin inventar contactos.
3. Cuando guardo una licitación, quiero recibir avisos antes del cierre, para preparar la documentación.

**Historias asociadas:** US-B-02, US-B-08, US-D-01, US-D-02, US-D-07, US-D-09, US-F-08, US-G-07.

---

### P4 — Gestor de oportunidades

| Dimensión | Descripción |
|---|---|
| Arquetipo | Consultor de desarrollo de negocio, área comercial o unidad de nuevos negocios que convierte señales en pipeline. `[SUPUESTO]` |
| Objetivo principal | Priorizar oportunidades con fundamento y darles seguimiento hasta una decisión comercial. |
| Contexto de uso | Escritorio; trabaja con listas, notas y comparaciones entre sectores y regiones. `[SUPUESTO]` |
| Conocimiento | Alto en su industria; medio en análisis financiero. |
| Frustraciones | Oportunidades genéricas, sin responsable ni próximo paso; falta de historial; perder el hilo entre evento y cliente. |
| Necesita | Bandeja de oportunidades, confianza explicada, riesgos, próximos pasos, notas y seguimiento. |
| No necesita | Datos de contacto inventados ni “leads” no verificados. |
| Riesgo de abandono | El motor genera volumen sin precisión; el equipo deja de confiar y vuelve a Excel. |
| Métrica de éxito | ≥ 60 % de las oportunidades guardadas reciben un próximo paso en 48 h. `[PROPUESTO]` |

**Jobs-to-be-done**

1. Cuando un evento verificado abre una necesidad, quiero entender por qué es una oportunidad y qué la respalda, para priorizarla.
2. Cuando guardo una oportunidad, quiero asignarle un próximo paso y una nota, para no perderla.
3. Cuando reviso mi cartera, quiero ver qué cambió en los eventos asociados, para actualizar mi decisión.

**Historias asociadas:** US-F-03, US-F-06, US-F-07, US-F-09, US-F-12, US-F-14, US-E-07, US-G-06.

---

### P5 — Administrador de plataforma

| Dimensión | Descripción |
|---|---|
| Arquetipo | Responsable técnico-operativo de que el dato exista, sea fresco y verificable. `[SUPUESTO]` |
| Objetivo principal | Mantener la ingesta, la calidad y la cola de revisión bajo control, con evidencia y auditoría. |
| Contexto de uso | Escritorio; consulta diaria de salud de fuentes y cola de IA. |
| Conocimiento | Alto técnico; entiende APIs, errores, reintentos y RLS. |
| Frustraciones | Fallos silenciosos, fuentes que cambian de formato, colas atascadas, publicaciones sin revisor, imposibilidad de reproducir un error. |
| Necesita | Estado por fuente, última ejecución, errores, reintentos, cola de revisión, usuarios, auditoría. |
| No necesita | Editar el contenido editorial de cada noticia. |
| Riesgo de abandono | No es usuario final; su fallo se mide en incidentes, no en abandono. |
| Métrica de éxito | Detecta una fuente caída en ≤ 15 min y la resuelve en ≤ 4 h. `[PROPUESTO]` |

**Jobs-to-be-done**

1. Cuando una fuente falla, quiero ver el error y el último documento válido, para decidir si reintentar o desactivar.
2. Cuando hay análisis pendientes, quiero revisarlos por prioridad y riesgo, para publicar con criterio.
3. Cuando ocurre un cambio sensible, quiero saber quién lo hizo y qué cambió, para responder ante una auditoría.

**Historias asociadas:** US-A-01, US-A-04, US-A-11, US-F-11, US-G-02, US-G-12, US-G-13.

---

### P6 — Visitante (actor secundario)

| Dimensión | Descripción |
|---|---|
| Objetivo | Entender qué ofrece el producto y crear una cuenta si le convence. |
| Necesita | Propuesta de valor clara, ejemplo real de evidencia, aviso de que no es asesoramiento financiero, acceso visible. |
| No necesita | Ver datos completos sin cuenta (decisión comercial `[PENDIENTE]`). |
| Métrica | Registro completado en ≤ 2 min desde el primer clic. `[PROPUESTO]` |

### P7 — Auditor / cumplimiento (actor secundario)

| Dimensión | Descripción |
|---|---|
| Objetivo | Verificar que las publicaciones y accesos cumplen las reglas. |
| Necesita | Lectura de auditoría, historial de publicación, versión del modelo y revisor. |
| Restricción | Solo lectura; no puede publicar ni modificar. |
| Estado | `[PENDIENTE ALCANCE]` — se implementa como permiso de lectura si el usuario lo requiere. |

### Anti-personas (lo que el producto no atiende)

| Anti-persona | Por qué queda fuera |
|---|---|
| Buscador de “tips” o señales de trading | El producto no emite recomendaciones ni predice precios. |
| Usuario que quiere ejecutar compras | No es un broker ni custodia fondos. |
| Scraper masivo o revendedor de datos | Los términos de las fuentes y la licencia del producto no lo permiten `[PENDIENTE LEGAL]`. |
| Especulador que busca datos privilegiados | El producto solo usa información pública y autorizada. |

---

## 3. Matriz rol × acción

### 3.1 Roles propuestos

| Rol | Definición | Nivel |
|---|---|---|
| `viewer` | Consulta contenido publicado, guarda watchlist y crea alertas propias. | 1 |
| `analyst` | Además, ve borradores, edita entidades y propone/revisa oportunidades. No publica. | 2 |
| `opportunity_manager` | Además, aprueba y publica oportunidades; ve métricas de su organización. | 3 |
| `org_admin` | Además, gestiona usuarios y configuración de su organización; ve auditoría de su organización. | 4 |
| `platform_admin` | Todo, incluidas fuentes, ingesta, configuración global y auditoría completa. | 5 |

> Los roles son **acumulativos**: un `opportunity_manager` puede hacer lo de `analyst` y `viewer`. La jerarquía no implica que un rol superior deba hacer todo; las acciones sensibles exigen permiso explícito.

### 3.2 Matriz

Leyenda: ✓ permitido · — denegado · **P** solo sobre recursos propios · **O** solo dentro de su organización · **A** requiere aprobación de otro rol · **?** pendiente de decisión.

| Acción | Visitante | `viewer` | `analyst` | `opportunity_manager` | `org_admin` | `platform_admin` |
|---|---|---|---|---|---|---|
| Ver landing y propuesta de valor | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Registrarse / iniciar sesión | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver dashboard | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver radar (publicados) | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver borradores de eventos | — | — | ✓ | ✓ | ✓ | ✓ |
| Abrir documento original y evidencia | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Buscar y filtrar | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Guardar en watchlist | — | **P** | **P** | **P** | **P** | **P** |
| Crear/editar alertas propias | — | **P** | **P** | **P** | **P** | **P** |
| Añadir nota privada | — | **P** | **P** | **P** | **P** | **P** |
| Ver oportunidades publicadas | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver oportunidades en revisión | — | — | ✓ | ✓ | ✓ | ✓ |
| Proponer oportunidad | — | — | ✓ | ✓ | ✓ | ✓ |
| Publicar / rechazar oportunidad | — | — | — | ✓ | ✓ | ✓ |
| Editar ficha de proyecto/empresa | — | — | ✓ | ✓ | ✓ | ✓ |
| Fusionar duplicados | — | — | — | — | — | ✓ |
| Ver estado de fuentes e ingesta | — | — | — | — | **O** | ✓ |
| Reintentar / pausar fuente | — | — | — | — | — | ✓ |
| Gestionar usuarios | — | — | — | — | **O** | ✓ |
| Cambiar rol de un usuario | — | — | — | — | **O** | ✓ |
| Ver auditoría | — | — | — | — | **O** | ✓ |
| Ver **historial público** de cambios de una ficha publicada (§3.4) | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver historial interno (actor, motivo, borradores) | — | — | ✓ | ✓ | ✓ | ✓ |
| Ver historial de revisión/publicación de oportunidades | — | — | ✓ | ✓ | ✓ | ✓ |
| Exportar resultados | — | **?** | **?** | **?** | **?** | **?** |
| Borrar la propia cuenta | — | **P** | **P** | **P** | **P** | **P** |
| Ver contenido demo | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 3.3 Historial de cambios legible por rol (respuesta a la Ventana A)

`audit_logs` **no** es legible por `viewer`/`analyst`/`opportunity_manager` (MODELO-DATOS §7.1), pero RF-B-06 (Must) y RF-A-12 exigen mostrar historial en la ficha. Se resuelve con una **vista de lectura sanitizada**, no con acceso directo a `audit_logs` (que contiene `old_data`/`new_data` completos y datos personales):

| Rol | Qué ve del historial |
|---|---|
| `viewer` | **Historial público** de entidades publicadas: fecha, campo público cambiado (estado, monto, fecha límite, documento, tasa), valor anterior y nuevo, documento que lo respalda. Actor mostrado como “Equipo editorial” o “Sistema”; **sin** correos, borradores ni notas. |
| `analyst` | Lo anterior + actor interno, motivo de correcciones y cambios sobre borradores. |
| `opportunity_manager` | Lo anterior + historial de revisión y publicación de oportunidades (revisor, motivo, versión del modelo). |
| `org_admin` | Auditoría de su organización (usuarios, roles, accesos), vía panel admin. |
| `platform_admin` | `audit_logs` completo. |

Consecuencia técnica (no existe tarea en A): una vista o función de servidor que proyecte `audit_logs` a solo campos públicos de filas `published`. **Brecha registrada** para US-B-06 en `backlog-producto.md` §4.5.

### 3.4 Reglas de autorización (no negociables)

1. La autorización se valida en **servidor** y en **base de datos** (RLS); ocultar un botón no es seguridad.
2. Un `viewer` nunca recibe datos de borradores, ni siquiera en el payload de una API.
3. `org_admin` no puede elevar su propio rol ni el de otro usuario a `platform_admin`.
4. La última cuenta `platform_admin` no puede eliminarse ni degradarse sin transferencia previa.
5. Toda acción de la columna “publicar/rechazar” y “cambiar rol” queda auditada con actor, fecha y valores anterior/nuevo.
6. El acceso a una URL directa no concede permiso: toda ruta protegida valida sesión y rol en el servidor.

---

## 4. Casos de uso

> Prioridad: **M** = Must (MVP), **S** = Should, **C** = Could. Cada caso referencia requisitos y pantalla; los criterios verificables están en `docs/ux/INVENTARIO-PANTALLAS.md` y `docs/qa/ESTRATEGIA-PRUEBAS.md`.

### UC-01 — Registrarse e iniciar sesión (M)

- **Actor:** Visitante.
- **Objetivo:** Crear una cuenta verificada y acceder al producto.
- **Precondición:** Ninguna; acepta términos y privacidad.
- **Flujo principal:** 1) Abre registro. 2) Introduce correo y contraseña. 3) Acepta términos. 4) Recibe correo de verificación. 5) Verifica. 6) Inicia sesión y llega al dashboard con onboarding.
- **Alternativas:** correo ya registrado → mensaje genérico sin revelar existencia; enlace caducado → reenviar; contraseña débil → requisitos visibles; fallo de correo → reintento y soporte.
- **Postcondición:** Usuario `viewer` con sesión válida y preferencias por defecto.
- **Requisitos:** RF-G-01, RF-G-15. **Pantalla:** AUTH.

### UC-02 — Consultar el radar y filtrar (M)

- **Actor:** `viewer`, `analyst`.
- **Objetivo:** Ver acontecimientos recientes y quedarse con los relevantes.
- **Precondición:** Sesión iniciada.
- **Flujo:** 1) Abre Radar. 2) Ve lista ordenada por `published_at` con sector, fuente y estado. 3) Filtra por sector y fecha. 4) Abre un evento.
- **Alternativas:** sin resultados → sugerencia de quitar filtros; fuente caída → aviso de frescura; datos demo → etiqueta visible.
- **Postcondición:** Filtros aplicados en URL (compartible) y evento abierto.
- **Requisitos:** RF-A-01, RF-A-03, RF-A-08, RF-A-13. **Pantalla:** SCR-02.

### UC-03 — Verificar la evidencia de un evento (M)

- **Actor:** `viewer`, `analyst`.
- **Objetivo:** Comprobar que el hecho está respaldado por un documento.
- **Flujo:** 1) Abre detalle. 2) Lee resumen y hechos. 3) Abre panel de evidencia. 4) Revisa cita, fecha y hash. 5) Abre el original en una pestaña nueva.
- **Alternativas:** documento no accesible → se muestra URL y fecha de captura, sin fingir que se leyó; evidencia contradictoria → estado `disputed` y ambas fuentes.
- **Postcondición:** Usuario puede citar la fuente; no se altera el dato.
- **Requisitos:** RF-A-05, RF-A-10, RF-A-11. **Pantalla:** SCR-02.

### UC-04 — Guardar en watchlist (M)

- **Actor:** `viewer` y superiores.
- **Objetivo:** Conservar una entidad para volver a ella.
- **Flujo:** 1) Desde una ficha o lista, pulsa “Guardar”. 2) Elige etiqueta opcional. 3) Confirma. 4) La entidad aparece en Watchlist.
- **Alternativas:** ya guardada → “Quitar” en lugar de duplicar; sin sesión → redirige a login conservando intención.
- **Postcondición:** Registro persistente por usuario.
- **Requisitos:** RF-G-06, RF-F-12, RF-E-07. **Pantalla:** SCR-11.

### UC-05 — Configurar una alerta (M)

- **Actor:** `viewer` y superiores.
- **Objetivo:** Recibir avisos solo de lo relevante.
- **Flujo:** 1) Abre preferencias o el menú de una entidad. 2) Define tipo, sector, ubicación, palabra clave y frecuencia. 3) Guarda. 4) Recibe confirmación y ve la alerta en el centro.
- **Alternativas:** regla demasiado amplia → advertencia de volumen estimado; duplicada → se reutiliza; pausar → deja de notificar sin borrar.
- **Postcondición:** Preferencia activa y auditable por el usuario.
- **Requisitos:** RF-G-07, RF-G-08, RF-A-09. **Pantalla:** SCR-13, SCR-12.

### UC-06 — Explorar proyectos y permisos (M)

- **Actor:** `viewer`, `analyst`, PyME.
- **Objetivo:** Entender qué se está autorizando y en qué estado.
- **Flujo:** 1) Abre Explorador. 2) Filtra por tipo, estado y provincia. 3) Abre ficha. 4) Lee promotor, estado, institución, monto (o “No disponible”) y documento. 5) Consulta historial.
- **Alternativas:** estado desconocido → `unknown` con explicación; sin monto → “No disponible”; proyecto solo anunciado → no se presenta como aprobado.
- **Postcondición:** Usuario distingue propuesta, solicitud, aprobación, construcción y operación.
- **Requisitos:** RF-B-01…RF-B-08, RF-B-10. **Pantalla:** SCR-03, SCR-04.

### UC-07 — Consultar una licitación y su fecha límite (M)

- **Actor:** PyME, `analyst`.
- **Objetivo:** Decidir si participar antes del cierre.
- **Flujo:** 1) Abre Licitaciones. 2) Filtra por sector y provincia. 3) Abre ficha. 4) Ve presupuesto, requisitos, fecha/hora/zona y documento. 5) Abre el pliego oficial.
- **Alternativas:** cierre en ≤ 72 h (valor propuesto, configurable) → estado `closing_soon`; adjudicada → muestra adjudicatario y monto; cancelada → motivo si existe.
- **Postcondición:** Usuario llega al documento oficial sin intermediarios.
- **Requisitos:** RF-D-01…RF-D-04, RF-D-10. **Pantalla:** SCR-05.

### UC-08 — Comparar instrumentos (**Post-MVP, G0 #9**)

- **Actor:** Inversor, `analyst`.
- **Objetivo:** Comparar instrumentos homogéneos.
- **Flujo:** 1) Abre Instrumentos. 2) Selecciona hasta 4. 3) Compara emisor, plazo, tasa, tipo de tasa, vencimiento y moneda. 4) Consulta la fuente de cada dato.
- **Alternativas:** monedas distintas → aviso y no conversión automática; tipos de tasa distintos → columnas separadas; falta de dato → “No disponible”.
- **Postcondición:** Comparación trazable, sin suma indebida.
- **Requisitos:** RF-C-04…RF-C-06, RF-C-08. **Pantalla:** SCR-06.

### UC-09 — Calcular un rendimiento estimado (**Post-MVP, G0 #9**)

- **Actor:** Inversor, `analyst`.
- **Objetivo:** Estimar un rendimiento bajo supuestos explícitos.
- **Flujo:** 1) Abre calculadora. 2) Introduce monto, plazo y tasa (o elige instrumento). 3) Revisa supuestos. 4) Obtiene resultado con fórmula visible y aviso de estimación.
- **Alternativas:** tasa no confirmada → resultado marcado “indicativo”; supuesto inválido → validación; falta definición de convención → calculadora deshabilitada con motivo (hasta decisión C-04/V-05).
- **Postcondición:** El usuario entiende qué se calculó y con qué supuestos.
- **Requisitos:** RF-C-07. **Pantalla:** SCR-06.

### UC-10 — Evaluar una oportunidad (M)

- **Actor:** Inversor, gestor, PyME, `analyst`.
- **Objetivo:** Decidir si una oportunidad merece seguimiento.
- **Flujo:** 1) Abre oportunidad. 2) Lee descripción y hecho originador. 3) Revisa evidencia. 4) Lee confianza, riesgos, horizonte y próximos pasos. 5) Guarda o descarta.
- **Alternativas:** confianza baja → recomendación de revisar evidencia; sin capital estimado → “No disponible” con motivo; oportunidad actualizada → aviso de versión.
- **Postcondición:** Decisión registrada (guardada/descartada) y feedback opcional.
- **Requisitos:** RF-F-03…RF-F-09, RF-F-12, RF-F-13. **Pantalla:** SCR-07.

### UC-11 — Revisar y publicar una oportunidad (M)

- **Actor:** `analyst` (propone), `opportunity_manager` / `org_admin` (publica).
- **Objetivo:** Asegurar que solo se publica contenido fundamentado.
- **Flujo:** 1) El analista abre la cola. 2) Revisa borrador, evidencia y campos obligatorios. 3) Corrige o devuelve con motivo. 4) El gestor revisa y publica o rechaza. 5) Se registra revisor, fecha y modelo.
- **Alternativas:** falta cita → bloqueo; cifra sin fuente → bloqueo; evento disputado → no publicable; revisor no autorizado → 403.
- **Postcondición:** Oportunidad `published` o `rejected`, con auditoría completa.
- **Requisitos:** RF-F-01, RF-F-10, RF-F-11, RF-G-13. **Pantalla:** SCR-14, SCR-07.

### UC-12 — Búsqueda global (M)

- **Actor:** Todos los autenticados.
- **Objetivo:** Encontrar una entidad sin navegar por módulos.
- **Flujo:** 1) Pulsa `/` o el buscador. 2) Escribe. 3) Ve resultados agrupados por tipo. 4) Aplica facetas. 5) Abre o guarda la vista.
- **Alternativas:** sin resultados → estado vacío con sugerencias; demasiados resultados → facetas y orden; error de búsqueda → reintento y mensaje.
- **Postcondición:** Resultados en ≤ 1 s p95 y URL compartible.
- **Requisitos:** RF-G-04, RF-G-05. **Pantalla:** SCR-10.

### UC-13 — Gestionar fuentes e ingesta (M, admin)

- **Actor:** `platform_admin`.
- **Objetivo:** Mantener el dato fresco y detectar fallos.
- **Flujo:** 1) Abre panel. 2) Ve estado por fuente (última ejecución, documentos, errores). 3) Abre una incidencia. 4) Reintenta o pausa. 5) Registra nota.
- **Alternativas:** fuente sin API → modo manual; error persistente → alerta y degradación declarada; reintento duplicado → idempotencia.
- **Postcondición:** Estado de fuente actualizado y acción auditada.
- **Requisitos:** RF-A-01, RF-G-12, RF-G-13. **Pantalla:** SCR-14.

### UC-14 — Gestionar usuarios y roles (M, admin)

- **Actor:** `org_admin` (su organización), `platform_admin`.
- **Objetivo:** Dar acceso al equipo con mínimo privilegio.
- **Flujo:** 1) Abre usuarios. 2) Invita por correo. 3) Asigna rol. 4) El invitado acepta. 5) Se registra el cambio.
- **Alternativas:** rol superior al permitido → bloqueo; último admin → no se puede degradar; invitación caducada → reenviar.
- **Postcondición:** Usuario con rol efectivo y auditoría.
- **Requisitos:** RF-G-02, RF-G-03, RF-G-13. **Pantalla:** SCR-14.

### UC-15 — Exportar resultados (**Post-MVP, G0 #13**)

- **Actor:** `analyst`, gestor.
- **Objetivo:** Llevar datos a una hoja de cálculo o informe.
- **Flujo:** 1) Aplica filtros. 2) Pulsa Exportar. 3) Elige CSV. 4) Descarga con fecha y fuente.
- **Restricciones:** respeta permisos; no exporta notas privadas de otros; incluye `source_url` y `is_demo`.
- **Requisitos:** RF-G-16. **Pantalla:** SCR-10, SCR-07.

### UC-16 — Borrar cuenta y datos (M, legal)

- **Actor:** Cualquier usuario autenticado.
- **Objetivo:** Ejercer control sobre sus datos personales.
- **Flujo:** 1) Abre configuración. 2) Solicita borrado. 3) Confirma con contraseña. 4) Se anonimiza/elimina según política y se conserva solo lo exigido por ley.
- **Alternativas:** usuario con rol crítico → transferencia previa; datos de auditoría → se conservan anonimizados `[PENDIENTE LEGAL]`.
- **Postcondición:** Cuenta inaccesible y datos personales tratados según política.
- **Requisitos:** RF-G-09, RF-G-15, RNF-28. **Pantalla:** SCR-13.

---

## 5. Journeys

### J-01 — Journey núcleo: descubrir → evaluar → guardar → alerta → decisión

> Es el recorrido que define el éxito del producto. Cruza a P1, P2 y P4.

| Etapa | Acción del usuario | Pantalla / componente | Datos y evidencia | Fricción esperada | Respuesta de diseño | Métrica propuesta |
|---|---|---|---|---|---|---|
| 1. Activación | Recibe una alerta o abre el dashboard | SCR-12 / SCR-01 | Evento, sector, fuente, hora | Ruido; no sabe por dónde empezar | Máximo 3 novedades priorizadas + frescura visible | CTR de alerta |
| 2. Escaneo | Revisa titulares y sectores | SCR-02 | `published_at`, sector, organización, estado | Títulos ambiguos | Resumen de 1 línea + etiqueta de capa (hecho/IA/inferencia) | Eventos abiertos / sesión |
| 3. Apertura | Abre el evento | Ficha de evento | Hechos clave, evidencia, fechas | Muro de texto | Jerarquía: hecho → evidencia → contexto → relacionado | Time to evidence |
| 4. Verificación | Abre la cita y el documento original | `EvidencePanel` | Fragmento, página, URL, hash | Enlace roto o PDF pesado | Abrir en pestaña nueva; mostrar URL y fecha de captura | % eventos con evidencia abierta |
| 5. Comprensión | Lee el análisis y las oportunidades derivadas | Ficha de evento / SCR-07 | Confianza, riesgos, supuestos | Exceso de confianza en la IA | Etiqueta “Análisis IA” + explicación + “revisado por humano” | Tiempo hasta oportunidad |
| 6. Evaluación | Compara riesgos, horizonte y próximos pasos | Ficha de oportunidad | Evidencia, confianza, riesgos, CTA | Cifras sin base | “No disponible” en lugar de estimación; cita junto a la cifra | % fichas con cifra citada |
| 7. Acción | Guarda en watchlist y añade nota | SCR-11 | Entidad, etiqueta, nota | Proceso largo | Guardado en 1 clic + etiqueta opcional | Tasa de guardado |
| 8. Seguimiento | Configura alerta o espera cambios | SCR-13 / SCR-12 | Preferencias, frecuencia | Alertas duplicadas | Deduplicación y resumen | Alertas por usuario/semana |
| 9. Decisión | Comparte, descarta o actúa fuera del producto | Exportación / nota | Fuente y contexto | Falta contexto para justificar | “Copiar enlace a evidencia” + resumen | % oportunidades con próximo paso |

**Puntos de verdad (momentos de confianza):** la cita resuelve al documento; la fecha límite incluye zona horaria; el estado del permiso coincide con el documento; la cifra tiene fuente.

**Puntos de quiebre:** cita rota, fecha incorrecta, estado inflado (“aprobado” sin documento), alerta tardía o duplicada, cifra sin origen.

### J-02 — PyME: de la licitación al pliego

| Etapa | Acción | Pantalla | Fricción | Respuesta | Métrica |
|---|---|---|---|---|---|
| 1 | Recibe alerta de licitación de su sector | SCR-12 | Demasiadas alertas | Filtros por sector/provincia/monto | Precisión reportada |
| 2 | Abre la ficha | SCR-05 | Jerga | Resumen en lenguaje claro + “qué se compra” | Comprensión en test |
| 3 | Comprueba plazo | SCR-05 | Zona horaria | Fecha + hora + zona + cuenta atrás | 0 cierres perdidos |
| 4 | Revisa requisitos | SCR-05 | Documento largo | Extracto con enlace al pliego, sin interpretar | Clics al pliego |
| 5 | Decide participar | Fuera del producto | — | Exportar/guardar con nota | Tasa de guardado |

### J-03 — Analista: revisar la cola de IA

| Etapa | Acción | Pantalla | Fricción | Respuesta | Métrica |
|---|---|---|---|---|---|
| 1 | Abre cola priorizada | SCR-14 | Volumen | Orden por riesgo/confianza/antigüedad | Cola < 24 h |
| 2 | Revisa borrador y evidencia | Ficha de oportunidad | Citas largas | Panel de evidencia lado a lado | Tiempo por revisión |
| 3 | Corrige campos | Ficha | Formularios largos | Edición inline + validación | % correcciones |
| 4 | Recomienda publicar o devuelve (el gestor publica o rechaza) | Ficha | Miedo a publicar | Checklist de 5 puntos + motivo obligatorio al devolver/rechazar | % devoluciones con motivo |
| 5 | Aprende del feedback | Panel | Sin bucle | Etiquetas de error para evals | Tasa de reincidencia |

### J-04 — Gestor: seguimiento de una empresa

| Etapa | Acción | Pantalla | Fricción | Respuesta | Métrica |
|---|---|---|---|---|---|
| 1 | Guarda empresa | SCR-08 | — | Botón Guardar + etiqueta | Empresas seguidas |
| 2 | Consulta historial | SCR-08 | Datos dispersos | Timeline con evidencia | Eventos por empresa |
| 3 | Detecta nueva señal | SCR-12 | Ruido | Alerta solo de cambios materiales | Precisión |
| 4 | Actualiza oportunidad | SCR-07 | Versiones | “Actualizada” + diff | Oportunidades reagendadas |
| 5 | Comparte internamente | Enlace | — | Enlace a evidencia (no a dato aislado) | Enlaces compartidos |

### J-05 — Admin: fuente caída

| Etapa | Acción | Pantalla | Fricción | Respuesta | Métrica |
|---|---|---|---|---|---|
| 1 | Alerta operativa | Fuera / SCR-14 | Enterarse tarde | Alerta en ≤ 15 min | MTTD |
| 2 | Diagnóstico | SCR-14 | Error opaco | Último error + último documento válido | Tiempo de diagnóstico |
| 3 | Reintento o pausa | SCR-14 | Miedo a duplicar | Idempotencia visible + confirmación | 0 duplicados |
| 4 | Comunicación | Nota interna | — | Estado “degradado” visible en la UI | Transparencia |
| 5 | Cierre | Auditoría | — | Registro de acción y resultado | MTTR |

### J-06 — Onboarding de un usuario nuevo

| Etapa | Acción | Pantalla | Fricción | Respuesta | Métrica |
|---|---|---|---|---|---|
| 1 | Llega desde enlace | Landing/AUTH | Promesa confusa | Propuesta de valor + ejemplo real | Registro iniciado |
| 2 | Crea cuenta | AUTH | Formulario largo | 3 campos + verificación | Registro completado |
| 3 | Elige intereses | SCR-13 (onboarding) | Configuración abrumadora | 3 pasos: sectores, provincias, alertas | Onboarding completado |
| 4 | Ve su primer valor | SCR-01 | Dashboard vacío | 3 eventos de sus sectores + “cómo leer la evidencia” | Tiempo a primer insight |
| 5 | Guarda algo | SCR-02/07 | Dudas | Tooltip de watchlist | Primera acción |

---

## 6. Métricas de producto (propuestas, sin línea base)

> No hay datos históricos. Estas métricas se instrumentarán desde el piloto; los objetivos son hipótesis a validar, no compromisos.

| ID | Métrica | Definición | Objetivo propuesto | Fuente |
|---|---|---|---|---|
| M-01 | Activación | % de registrados que guardan una entidad en 7 días | ≥ 40 % | Eventos de producto |
| M-02 | Time to first insight | Mediana de tiempo hasta abrir evidencia de un evento | ≤ 10 min | Analítica de sesión |
| M-03 | Profundidad de evidencia | % de sesiones con al menos una apertura de documento | ≥ 30 % | Analítica |
| M-04 | Guardado | % de vistas de oportunidad que terminan en watchlist | ≥ 15 % | Analítica |
| M-05 | Precisión de alertas | % de alertas marcadas “relevante” por el usuario | ≥ 70 % | Feedback |
| M-06 | Frescura percibida | % de eventos con `detected_at − published_at` ≤ 60 min | ≥ 95 % (fuentes API/RSS) | Datos |
| M-07 | Revisión IA | % de borradores revisados en ≤ 24 h | ≥ 90 % | Cola admin |
| M-08 | Corrección IA | % de campos corregidos por revisor | ≤ 15 % | Auditoría |
| M-09 | Rechazo IA | % de oportunidades rechazadas por falta de fundamento | ≤ 5 % | Auditoría |
| M-10 | Retención | % de usuarios activos que vuelven a los 7 días | ≥ 25 % | Analítica |
| M-11 | Confianza | % de usuarios que declaran entender la diferencia hecho/IA/inferencia | ≥ 80 % en test | Usabilidad |
| M-12 | Accesibilidad | % de tareas críticas completadas con teclado | 100 % | QA |

---

## 7. Supuestos, riesgos y plan de validación

### 7.1 Supuestos de personas `[SUPUESTO]`

| ID | Supuesto | Cómo se valida | Cuándo |
|---|---|---|---|
| SP-01 | El inversor individual prioriza evidencia sobre velocidad. | 5 entrevistas + test de tarea. | Sprint 1–2 |
| SP-02 | La PyME busca licitaciones al menos una vez por semana. | Entrevistas + analytics de uso. | Sprint 2–3 |
| SP-03 | El analista acepta revisar IA si el panel es rápido y cita bien. | Test de usabilidad con cola simulada. | Sprint 5 |
| SP-04 | El gestor necesita notas y próximos pasos más que datos de contacto. | Entrevistas + prueba de flujo. | Sprint 3 |
| SP-05 | El admin tolera una cola manual si hay priorización y auditoría. | Shadowing de operación. | Sprint 6 |
| SP-06 | Los usuarios entienden “tasa indicativa/adjudicada” con una etiqueta y tooltip. | Test de comprensión (5 personas). | Sprint 4 |

### 7.2 Riesgos

| ID | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R-01 | Personas basadas en supuestos y no en investigación. | Construir para quien no existe. | Validación temprana; no cerrar UX antes de 5 entrevistas. |
| R-02 | El motor de oportunidades genera volumen irrelevante. | Pérdida de confianza y abandono. | Revisión humana, feedback, umbral de confianza y métricas M-08/M-09. |
| R-03 | Alertas ruidosas. | El usuario las desactiva. | Deduplicación, frecuencia configurable, resumen. |
| R-04 | Lenguaje financiero mal entendido. | Decisiones erróneas. | Glosario inline, etiquetas de tipo de tasa, ejemplos. |
| R-05 | Permisos mal implementados. | Fuga de datos. | RLS + pruebas de matriz rol × entidad (RNF-24). |
| R-06 | Dependencia de fuentes frágiles. | Datos desactualizados. | Estado de fuente visible, modo manual, cobertura declarada. |
| R-07 | Sesgo hacia un sector o fuente. | Oportunidades desequilibradas. | Métricas por sector y revisión editorial. |

### 7.3 Plan de validación (Sprint 1–2, `[PENDIENTE]`)

1. **5 entrevistas** (1 inversor, 2 analistas, 1 PyME, 1 gestor) de 30 min, sin guion de venta.
2. **Test de usabilidad** con prototipo de 3 pantallas: radar, ficha de oportunidad, watchlist. Tareas: encontrar evidencia, guardar, configurar alerta.
3. **Test de comprensión** de las tres capas (hecho/IA/inferencia) y de los tipos de tasa.
4. **Revisión con la Ventana A** de qué datos existirán realmente antes de prometer pantallas.
5. **Registro de hallazgos** en este documento (versión 0.2) y ajuste de alcance; cualquier cambio de alcance lo aprueba el usuario.

---

## 8. Trazabilidad persona → requisito → pantalla

| Persona | Requisitos principales | Pantallas |
|---|---|---|
| P1 Inversor | RF-C-04…RF-C-13, RF-F-03…RF-F-12, RF-G-06, RF-G-07 | SCR-06, SCR-07, SCR-11 |
| P2 Analista | RF-A-05, RF-A-10…RF-A-12, RF-B-06, RF-F-11, RF-G-04 | SCR-02, SCR-03, SCR-10, SCR-14 |
| P3 PyME | RF-B-02, RF-B-08, RF-D-01…RF-D-10 | SCR-03, SCR-05, SCR-12 |
| P4 Gestor | RF-E-02…RF-E-09, RF-F-03…RF-F-14 | SCR-07, SCR-08, SCR-11 |
| P5 Admin | RF-A-01, RF-A-04, RF-A-11, RF-G-12, RF-G-13 | SCR-14 |
| P6 Visitante | RF-G-01, RF-G-15 | AUTH |
| P7 Auditor | RF-G-13 | SCR-14 (solo lectura) |

---

## 9. Registro de cambios

| Versión | Fecha | Cambio | Autor |
|---|---|---|---|
| 0.3.0 | 2026-11-15 | Ronda 2: §3.3 historial de cambios por rol (decisión de producto, respuesta a A); renumeradas las reglas a §3.4. | Ventana B |
| 0.2.0 | 2026-11-15 | Revisión D-002: el analista propone/recomienda y el gestor publica (coherente con la matriz y RF-F-11); `closing_soon` ≤ 72 h unificado. | Ventana B |
| 0.1.0 | 2026-11-15 | Creación: 7 actores, 5 personas + 2 secundarias, 16 casos de uso, matriz rol × acción, 6 journeys, 12 métricas y plan de validación. | Ventana B |
