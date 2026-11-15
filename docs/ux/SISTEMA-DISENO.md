# Sistema de diseño — AviTech Investment Intelligence

| Campo | Valor |
|---|---|
| Documento | `docs/ux/SISTEMA-DISENO.md` |
| Versión | 0.1.0 (Sprint 0) |
| Fecha | 2026-11-15 |
| Autor | Ventana B |
| Estado | **BORRADOR PARA APROBACIÓN** — propuesta, no manual de marca oficial (V-12) |
| Alcance | Tokens, modo claro/oscuro, accesibilidad AA, componentes base y reglas de confianza. **No es código**: los valores se implementarán en Sprint 1 tras aprobación. |

> **Honestidad sobre la marca.** No existe un manual de marca de *este* producto (V-12). Este sistema se **inspira** en la referencia de AviTech encontrada en `C:\Users\User\avitech-ia-agencia\docs\diseno\PROPUESTAS.md` (brief «Neural Command Center»: fondo `#060D1B`, azul `#007BFF`, cian `#59C9FF`, menta `#62DDB4`, Sora + Inter). Ese brief figura allí como **pendiente de aprobación** para el sitio comercial. No se ha copiado código ni maquetas. Una plataforma de análisis financiero necesita sobriedad e información densa, no la portada cinematográfica del sitio de agencia; por eso se toma solo la paleta y la tipografía.

---

## 1. Principios

1. **La evidencia manda.** El diseño existe para que el usuario compruebe el dato, no para decorarlo.
2. **Tres capas, nunca mezcladas.** Dato confirmado, análisis IA e inferencia comercial se distinguen por **icono + texto + tratamiento**, no solo por color (§6).
3. **Densidad con respiro.** Tablas densas para analistas, tarjetas para móvil; el mismo dato en ambos formatos.
4. **“No disponible” es un estado de primera clase**, con motivo. Nunca un guion mudo, nunca un cero.
5. **Sin urgencia artificial.** No hay contadores dramáticos ni verdes/rojos de “subida/bajada” que sugieran recomendación. El color semántico indica **estado del dato**, no juicio de inversión.
6. **Accesible por defecto.** WCAG 2.2 AA es el mínimo, no una fase final (RNF-29, RNF-30).
7. **Movimiento mínimo.** Respeta `prefers-reduced-motion`; ninguna información se transmite solo con animación.

---

## 2. Tokens

> **Convención de nombres:** `--color-*`, `--space-*`, `--radius-*`, etc. Se definen como variables CSS a nivel `:root` y se redefinen para `[data-theme="dark"]`. En Tailwind 4 se exponen con `@theme`. **Next.js 16 / Tailwind 4:** la sintaxis exacta de integración se verificará en `node_modules/next/dist/docs/` antes de implementar (AGENTS.md); aquí solo se fijan valores.

### 2.1 Color — superficies y texto

Todos los pares se calcularon con la fórmula de contraste relativo WCAG 2.x (script de Ventana B, resultados abajo). Son cálculos **de diseño**, no una auditoría de la interfaz implementada: esa auditoría se hace con axe y revisión manual en Sprint 1+ (RNF-29).

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--color-bg` | `#FFFFFF` | `#060D1B` | Fondo de página |
| `--color-bg-subtle` | `#F4F7FB` | `#0A1426` | Zonas secundarias, filas alternas |
| `--color-surface` | `#FFFFFF` | `#0D1730` | Tarjetas, paneles |
| `--color-surface-2` | `#EEF2F8` | `#14224A` | Elementos elevados, hover de fila |
| `--color-text` | `#0B1424` | `#E8EEF8` | Texto principal |
| `--color-text-muted` | `#475569` | `#9DB0CE` | Texto secundario, metadatos |
| `--color-border-ui` | `#7B8899` | `#5B6F94` | Bordes de controles (≥ 3:1) |
| `--color-divider` | `#D5DCE6` | `#1E2D55` | Separadores **decorativos** (sin requisito de contraste) |
| `--color-focus` | `#0053B8` | `#59C9FF` | Anillo de foco |

### 2.2 Color — marca y estado

| Token | Claro | Oscuro | Significado |
|---|---|---|---|
| `--color-primary` | `#0053B8` | `#59C9FF` | Acción principal, enlaces |
| `--color-on-primary` | `#FFFFFF` | `#04101F` | Texto sobre botón primario |
| `--color-accent` | `#007BFF` | `#007BFF` | Marca (decorativo; **no** para texto en claro) |
| `--color-success` | `#0B6B3A` | `#62DDB4` | Verificado, fuente activa |
| `--color-warning` | `#8A4B00` | `#FBBF24` | Cobertura parcial, dato desactualizado, cierre próximo |
| `--color-danger` | `#B42318` | `#FF8A80` | Error, fuente caída, en disputa |
| `--color-info` | `#0B5CAD` | `#7CC4FF` | Información neutra |

> **Regla:** `--color-success` y `--color-danger` **no** se usan para variaciones de tasas o precios (subida/bajada). Significan estado del sistema o del dato (p. ej. “verificado”, “fuente caída”). Una tasa que sube no es “buena”.

### 2.3 Color — capas de confianza

| Capa | Fondo claro | Fondo oscuro | Texto claro / oscuro | Borde claro / oscuro |
|---|---|---|---|---|
| `confirmed` | `#F4F7FB` | `#0D1730` | `#0B1424` / `#E8EEF8` | `#7B8899` / `#5B6F94` (sólido, 1 px) |
| `ai_analysis` | `#EEF4FF` | `#0F2247` | `#1D4ED8` / `#8FB8FF` | `#2F6FED` / `#4C8DFF` (sólido, 3 px a la izquierda) |
| `inference` | `#FFF4E0` | `#2A1D05` | `#7A3E00` / `#FCD34D` | `#B45309` / `#D99A1E` (**punteado**, 1,5 px) |

### 2.4 Verificación de contraste (cálculo de diseño)

| Par | Claro | Oscuro | Mínimo | Resultado |
|---|---|---|---|---|
| Texto / fondo | 18,42 | 16,66 | 4,5 | Cumple |
| Texto / superficie | 17,15 (sobre `bg-subtle`) | 15,24 | 4,5 | Cumple |
| Texto atenuado / fondo | 7,58 | 8,82 | 4,5 | Cumple |
| Texto atenuado / superficie | 7,05 (sobre `bg-subtle`) | 8,06 | 4,5 | Cumple |
| Enlace/primario / fondo | 7,17 | 10,38 | 4,5 | Cumple |
| Texto sobre botón primario | 7,17 | 10,21 | 4,5 | Cumple |
| Éxito / aviso / peligro / info (texto) | 6,61 / 6,80 / 6,57 / 6,67 | 10,59 / 10,64 / 7,78 / 9,47 | 4,5 | Cumple |
| Texto IA sobre su fondo | 6,07 | 7,81 | 4,5 | Cumple |
| Texto inferencia sobre su fondo | 7,66 | 11,41 | 4,5 | Cumple |
| Borde de control / fondo | 3,61 (`#7B8899` sobre blanco) | 3,51 | 3,0 | Cumple |
| Borde capa IA / fondo | 4,55 | 5,55 | 3,0 | Cumple |
| Borde capa inferencia / fondo | 5,02 | 7,27 | 3,0 | Cumple |
| Anillo de foco / fondo | 7,17 | 10,38 | 3,0 | Cumple |

Observaciones honestas:

- `#8A97AB` (primer candidato de borde claro) dio **2,96:1** y se descartó; se adoptó `#7B8899`.
- `#7B8899` sobre `--color-bg-subtle` da 3,36:1 (cumple 3:1).
- `--color-accent #007BFF` sobre blanco **no** alcanza 4,5:1 para texto; por eso el primario claro es `#0053B8`.
- **No verificado:** simulación de daltonismo, contraste de gráficos y contraste bajo `forced-colors`. Se añaden a las pruebas A11Y (`docs/qa/ESTRATEGIA-PRUEBAS.md`).

### 2.5 Tipografía

| Rol | Familia propuesta | Fallback | Origen |
|---|---|---|---|
| Titulares | Sora | `system-ui, sans-serif` | Referencia de marca AviTech |
| Contenido e interfaz | Inter | `system-ui, sans-serif` | Referencia de marca AviTech |
| Cifras y código | Inter con `font-variant-numeric: tabular-nums` | `ui-monospace` para identificadores | Alineación de columnas numéricas |

- **Carga:** autoalojar con `next/font` si se aprueba (verificar API en la documentación de Next 16). Sin fuentes externas en tiempo de ejecución por privacidad `[PENDIENTE: decisión de Ventana A]`.
- **Cifras tabulares obligatorias** en tablas de tasas, montos y fechas.
- Pesos: 400 (texto), 500 (etiquetas), 600 (encabezados). Evitar pesos < 400 (lección de legibilidad en la referencia de marca).

| Estilo | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|
| `display` | 32 / 40 | 600 | Título de pantalla (solo escritorio) |
| `h1` | 28 / 36 | 600 | Título de página |
| `h2` | 22 / 30 | 600 | Sección |
| `h3` | 18 / 26 | 600 | Subsección, título de tarjeta |
| `body` | 16 / 24 | 400 | Texto general |
| `body-sm` | 14 / 20 | 400 | Tablas densas, metadatos |
| `caption` | 12 / 16 | 500 | Etiquetas, badges (nunca para información crítica sola) |
| `numeric-lg` | 28 / 32 | 600 | KPI |

- Mínimo 12 px y solo para etiquetas; el contenido principal ≥ 14 px.
- Texto escalable hasta 200 % sin pérdida de contenido (WCAG 1.4.4). Unidades `rem`.
- Longitud de línea de lectura ≤ 75 caracteres en texto corrido.

### 2.6 Espaciado, radios, sombras, z-index

Base de 4 px.

| Token | Valor | | Token | Valor |
|---|---|---|---|---|
| `--space-1` | 4 px | | `--space-6` | 24 px |
| `--space-2` | 8 px | | `--space-8` | 32 px |
| `--space-3` | 12 px | | `--space-12` | 48 px |
| `--space-4` | 16 px | | `--space-16` | 64 px |

| Token | Valor | Uso |
|---|---|---|
| `--radius-sm` | 4 px | Badges, inputs densos |
| `--radius-md` | 8 px | Botones, tarjetas |
| `--radius-lg` | 12 px | Paneles, modales |
| `--radius-full` | 9999 px | Chips, avatares |

| Token | Valor (claro) | Valor (oscuro) |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgb(11 20 36 / 0.08)` | borde 1 px `--color-divider`, sin sombra |
| `--shadow-md` | `0 4px 12px rgb(11 20 36 / 0.10)` | `0 4px 12px rgb(0 0 0 / 0.40)` |
| `--shadow-lg` | `0 12px 32px rgb(11 20 36 / 0.14)` | `0 12px 32px rgb(0 0 0 / 0.50)` |

- En modo oscuro se prefiere **elevación por superficie** (`surface` → `surface-2`) antes que sombra.
- z-index: `base 0`, `sticky 10`, `drawer 30`, `modal 40`, `toast 50`.
- Área táctil mínima **44 × 44 px** (WCAG 2.5.8 exige 24 px; se adopta 44 como estándar de producto).

### 2.7 Movimiento

| Token | Valor |
|---|---|
| `--motion-fast` | 120 ms |
| `--motion-base` | 200 ms |
| `--motion-slow` | 320 ms |
| Easing | `cubic-bezier(0.2, 0, 0, 1)` |

Con `prefers-reduced-motion: reduce` se eliminan desplazamientos y fundidos largos; el estado se comunica con cambio de texto/icono.

### 2.8 Breakpoints

Alineados con `docs/ux/INVENTARIO-PANTALLAS.md` §1.2: `mobile` 375–767, `tablet` 768–1023, `desktop` 1024–1439, `wide` ≥ 1440 (contenido máximo 1440 px).

---

## 3. Modo claro, oscuro y sistema

- Tres opciones en SCR-13: **Claro**, **Oscuro**, **Sistema** (por defecto: Sistema).
- Persistencia por usuario (preferencia en cuenta; en navegador para visitantes).
- Evitar el parpadeo inicial (tema resuelto antes del primer pintado) `[detalle de implementación: Sprint 1]`.
- El modo oscuro **no es** inversión del claro: tiene tokens propios (§2). Sin negro puro `#000` en superficies (se usa `#060D1B`).
- Imágenes, mapas y gráficos deben tener variante o tratamiento para ambos modos.
- Verificar ambos modos en cada PR de UI (capturas en 2 temas × 4 anchos, RNF-31).

---

## 4. Accesibilidad AA — reglas del sistema

| Regla | Detalle | Criterio WCAG 2.2 |
|---|---|---|
| Contraste | Texto ≥ 4,5:1; texto grande (≥ 24 px o ≥ 18,7 px negrita) ≥ 3:1; componentes y bordes ≥ 3:1 (§2.4). | 1.4.3, 1.4.11 |
| Color no es el único canal | Estado y capa de confianza siempre con icono + texto. | 1.4.1 |
| Foco visible | Anillo de 2 px `--color-focus` + separación de 2 px; nunca `outline: none` sin sustituto. Foco no oculto por barras fijas. | 2.4.7, 2.4.11 |
| Teclado | Todo operable con teclado; sin trampas; orden lógico; atajo `/` y `Ctrl/Cmd+K` para buscar con opción de desactivar. | 2.1.1, 2.1.2, 2.1.4 |
| Objetivos táctiles | ≥ 44 × 44 px (mínimo normativo 24). | 2.5.8 |
| Reflujo | Sin scroll horizontal a 320 px de ancho; las tablas con scroll propio y alternativa de tarjetas. | 1.4.10 |
| Texto redimensionable | Hasta 200 % sin pérdida. | 1.4.4 |
| Espaciado de texto | Sin pérdida al aumentar interlineado/espaciado. | 1.4.12 |
| Nombres accesibles | Iconos con etiqueta; enlaces “Abrir documento original (PDF, Banco Central, 12/11/2026)”. | 2.4.4, 4.1.2 |
| Estados dinámicos | Resultados y alertas con `aria-live="polite"`; errores con `role="alert"`. | 4.1.3 |
| Formularios | Etiqueta visible, ayuda asociada, error textual identificado, sin depender del color. | 3.3.1, 3.3.2 |
| Movimiento | `prefers-reduced-motion`; sin parpadeos > 3/s. | 2.3.1, 2.2.2 |
| Autenticación | Sin pruebas cognitivas; permitir gestor de contraseñas y pegar. | 3.3.8 |
| Tablas | `caption`, `th scope`, cabeceras ordenables como botones con `aria-sort`. | 1.3.1 |
| Gráficos | Siempre con resumen textual y tabla de datos alternativa (C-14). | 1.1.1 |
| Idioma | `lang="es-DO"`; fragmentos en inglés marcados. | 3.1.1, 3.1.2 |

**Verificación (no realizada en Sprint 0):** axe-core en Playwright, revisión manual de teclado, prueba con lector de pantalla (NVDA/VoiceOver) y 200 % de zoom. Resultados: `[PENDIENTE — Sprint 1+]`.

---

## 5. Componentes base

> Especificación de **comportamiento y contenido**, no de implementación. Cada componente lista sus estados. Los nombres son propuestas para una futura biblioteca.

### 5.1 Inventario

| Componente | Función | Estados clave | Pantallas |
|---|---|---|---|
| `Button` (primario, secundario, terciario, destructivo) | Acciones | normal, hover, foco, activo, deshabilitado (con motivo), cargando | Todas |
| `Input`, `Select`, `Combobox`, `DateRange`, `Checkbox`, `Switch` | Entradas | normal, foco, error, deshabilitado, solo lectura | SCR-10, SCR-13 |
| `FilterBar` + `FilterChip` | Filtros combinables, reflejados en URL | sin filtros, con filtros, demasiados filtros | SCR-02…07, SCR-10 |
| `DataTable` | Tabla densa | cargando, vacío, error, selección, orden, densidad | SCR-02…07, SCR-14 |
| `DataCard` | Misma fila en móvil | igual que `DataTable` | Todas |
| `EventCard` | Evento económico | normal, disputado, demo, sin evidencia | SCR-01, SCR-02 |
| `OpportunityCard` | Oportunidad | borrador, en revisión, publicada, actualizada | SCR-01, SCR-07 |
| `StatusBadge` | Estado de verificación/proyecto/licitación | ver §5.3 | Todas |
| `TrustLayerBadge` | Capa de confianza | `confirmed`, `ai_analysis`, `inference` | Todas |
| `EvidencePanel` | Evidencia de un dato | cargando, con evidencia, sin evidencia, enlace roto | SCR-02, SCR-07, SCR-03 |
| `SourceLink` | Enlace a documento oficial | normal, caducado, no accesible | Todas |
| `MetricValue` | Cifra con fuente | con valor, “No disponible”, desactualizada | Todas |
| `FreshnessBanner` | Frescura de datos | al día, retrasado, caído | SCR-01 + listas |
| `KpiStat` | Indicador | con valor, sin datos | SCR-01 |
| `Timeline` | Historial | corto, largo, con diff | SCR-03, SCR-04, SCR-08 |
| `Chart` (línea, barras, calendario) | Series | con datos, sin datos, parcial | SCR-06, SCR-01 |
| `EmptyState`, `ErrorState`, `Skeleton`, `PermissionDenied` | Estados estándar | ver INVENTARIO §1.3 | Todas |
| `Toast`, `Dialog`, `Drawer`, `Tooltip`, `Popover` | Superposiciones | abierto, cerrado, foco atrapado | Todas |
| `DemoRibbon` | Marca “DEMO” | siempre visible si `is_demo` | Todas |
| `DisclaimerNote` | Aviso legal contextual | compacto, expandido | SCR-06, SCR-07 |

### 5.2 Tablas densas (`DataTable`)

- **Densidad:** 3 modos — `compacta` (altura de fila 32 px), `estándar` (44 px, por defecto), `cómoda` (56 px). Persistencia por usuario. La compacta **no baja** el área táctil en móvil (en móvil solo `DataCard`).
- **Columnas:** fijar primera columna (identificador/título) en horizontal; resto con scroll; columnas ocultables; ancho mínimo definido.
- **Numéricas:** alineadas a la derecha, tabulares, con unidad y moneda en cabecera o celda; nunca mezclar monedas en una columna sin código ISO visible (RN-10).
- **Fechas:** formato `12 nov 2026, 14:30 AST` con tooltip UTC; relativas (“hace 2 h”) solo como apoyo.
- **Orden y filtro:** `aria-sort`, ordenación estable, estado en la URL (AC-UX-07).
- **Celdas con “No disponible”:** texto `No disponible` + icono de información con motivo (p. ej. “La fuente no publica montos”); nunca `—` solo.
- **Cada celda de cifra** puede abrir su fuente (`MetricValue` con `SourceLink`).
- **Paginación o scroll virtual:** paginación en MVP (más simple y accesible); tamaño de página 25/50/100.
- **Móvil:** cada fila se convierte en `DataCard` con 3–5 campos prioritarios; el resto en “Ver más”.
- **Selección múltiple** solo cuando hay acción en lote (comparador, alertas).
- **Resumen textual** sobre la tabla: “Mostrando 25 de 1 204 resultados, ordenados por fecha de publicación descendente”.

### 5.3 Badges de estado

Todo badge = **icono + texto**; el color refuerza, no sustituye. Texto en minúsculas de oración, ≤ 24 caracteres.

| Familia | Valor (dato) | Texto en UI | Icono | Tono |
|---|---|---|---|---|
| Verificación | `verified` | Verificado | check en escudo | success |
| | `pending` | Pendiente de verificación | reloj de arena | neutral |
| | `partially_verified` | Parcialmente verificado | check parcial | info |
| | `disputed` | En disputa | alerta | danger |
| | `unverifiable` | No verificable | interrogación | warning |
| Proyecto | `announced` | Anunciado | megáfono | info |
| | `permit_applied` | Permiso solicitado | documento | info |
| | `permit_approved` | Permiso aprobado | sello | success |
| | `under_construction` | En construcción | grúa | info |
| | `operating` | En operación | engranaje | success |
| | `suspended` | Suspendido | pausa | warning |
| | `cancelled` | Cancelado | x | danger |
| | `unknown` | Estado desconocido | interrogación | neutral |
| Licitación | `planned` / `open` / `closing_soon` (derivado) / `closed` / `awarded` / `cancelled` / `unknown` | Planificada / Abierta / Cierra pronto / Cerrada / Adjudicada / Cancelada / Estado desconocido | calendario / reloj / reloj-alerta / candado / trofeo / x / interrogación | neutral / info / warning / neutral / success / danger / neutral |
| Permiso | `requested` / `under_review` / `approved` / `denied` / `expired` / `revoked` / `unknown` | Solicitado / En revisión / Aprobado / Denegado / Vencido / Revocado / Estado desconocido | documento / lupa / sello / x / calendario-x / prohibido / interrogación | info / info / success / danger / warning / danger / neutral |
| Tasa | `indicative` / `awarded` / `effective` | Indicativa / Adjudicada / Efectiva | tres iconos distintos | **neutral con icono propio** |
| Disponibilidad | `not_confirmed` / `confirmed_by_source` | Disponibilidad no confirmada / Disponibilidad confirmada por la fuente | interrogación / check | warning / info |
| Oportunidad | `draft` / `in_review` / `published` / `rejected` | Borrador / En revisión / Publicada / Rechazada | — | neutral / info / success / danger |
| Datos | `is_demo` | DEMO | etiqueta | warning (borde grueso) |

Reglas:

- `permit_approved`, `under_construction`, `operating` (proyecto) y `approved` (permiso) **solo** se renderizan si existe documento (RN-03, RF-B-04); coincide con los `CHECK` propuestos por la Ventana A. El componente recibe el documento como prop obligatoria y rechaza el estado sin él.
- Las tres variantes de tasa usan el **mismo tono neutro** a propósito: ninguna parece “mejor”.
- “Cierra pronto” usa el umbral `closing_soon` (≤ 72 h por defecto, propuesto).

### 5.4 Tarjetas de evento (`EventCard`)

Jerarquía vertical (de mayor a menor peso visual):

1. **Titular** (`h3`, máximo 2 líneas) — enlace a la ficha.
2. **Metadatos de una línea:** sector · ubicación · organización principal.
3. **Resumen** (≤ 2 líneas, capa indicada por `TrustLayerBadge`).
4. **Fila de estado:** `StatusBadge` de verificación · fuente (nombre de institución) · `published_at` (relativa + absoluta en tooltip) · `DemoRibbon` si aplica.
5. **Acciones:** Guardar · Abrir evidencia · Crear alerta (iconos con etiqueta; en móvil menú).

Reglas: sin imagen decorativa; sin cifras en el titular salvo que lleven fuente; el evento sin evidencia muestra “Sin evidencia verificable” en lugar del resumen IA; el evento en disputa lleva borde `danger` y tooltip con las fuentes en conflicto.

### 5.5 Panel de evidencia (`EvidencePanel`)

Componente central de la propuesta de valor. Anchura 420 px en `wide`, drawer en otros.

| Zona | Contenido |
|---|---|
| Cabecera | Número de evidencias (“3 evidencias”), estado de verificación, botón cerrar. |
| Lista | Una tarjeta por evidencia: **fragmento citado** (entre comillas, con la frase resaltada), tipo de documento, institución, página/sección, `captured_at`, hash corto (copiable). |
| Acciones por evidencia | **Abrir documento original** (pestaña nueva, `rel="noopener noreferrer"`), **Copiar cita**, **Reportar problema**. |
| Contradicciones | Si hay fuentes en conflicto, se muestran lado a lado con motivo. |
| Pie | Qué capa es cada afirmación apoyada por esta evidencia; modelo y versión si participó IA. |

Estados: sin evidencia (“Sin evidencia verificable”; sin botón de generar oportunidad), enlace roto (“No pudimos abrir el documento. Se conserva la copia capturada el …” solo si la licencia lo permite `[PENDIENTE A]`), cargando (esqueleto).

### 5.6 Gráficos

> Los valores de los gráficos provienen de datos con fuente. Un gráfico **sin fuente y fecha en su pie no se renderiza**.

- Tipos MVP: línea (historial de tasas), barras (conteos por sector/mes), calendario (vencimientos/subastas). Sin gráficos 3D, sin circulares con más de 5 sectores.
- Serie de tasas: **una serie por tipo de tasa** (`indicative`, `awarded`, `effective`); jamás combinadas (RF-C-05). Distinguir por forma de marcador y patrón de línea además del color.
- Ejes con unidades; eje Y de tasas **no truncado engañosamente** (si se trunca, se indica); huecos de datos como huecos, no interpolados sin aviso.
- Cada punto tiene fuente/fecha en tooltip y en la tabla alternativa.
- **Siempre**: título descriptivo, resumen textual (“La tasa adjudicada pasó de X % a Y % entre A y B”, solo si el texto se calcula de los datos), tabla de datos alternativa y descarga CSV `[PENDIENTE ALCANCE, RF-G-16]`.
- Paleta categórica (≤ 5 series; ver `dataviz`): `--chart-1 #007BFF`, `--chart-2 #0B8F6A`, `--chart-3 #B45309`, `--chart-4 #7C3AED`, `--chart-5 #475569` en claro; en oscuro se usan variantes más claras. **Seguridad ante daltonismo: [NO VERIFICADA]** — se valida con simulador antes de implementar; hasta entonces la información no puede depender del color (marcadores + etiquetas directas).
- Estado sin datos: “Aún no hay observaciones publicadas para este instrumento” + fuente esperada.
- Respeta `prefers-reduced-motion` (sin animación de entrada).

### 5.7 Otros componentes con reglas específicas

- **`MetricValue`:** muestra valor + unidad/moneda + fuente (icono enlace) + fecha. Si falta cualquiera de los cuatro, usa “No disponible” con motivo. Nunca renderiza `0`, `—` o `N/A` como sustituto.
- **`DisclaimerNote`:** texto fijo, no “letra pequeña”: “Información con fines informativos. No constituye asesoramiento financiero ni oferta de compra. `[PENDIENTE LEGAL: redacción]`”. Visible en SCR-06 y SCR-07 sin necesidad de desplazarse.
- **`DemoRibbon`:** cinta diagonal o etiqueta de esquina “DEMO” con borde punteado grueso; excluida de KPIs (RF-G-14).
- **`FreshnessBanner`:** al día (verde, “Actualizado hace 12 min”), retrasado (ámbar, “Retrasado desde hace 5 h”), caído (rojo, “Sin actualizar desde el 12 nov”). Texto + icono.
- **`ConfidenceMeter` (oportunidad):** valor 0–100 con etiqueta textual (“Baja/Media/Alta” solo si la metodología de RF-F-06 lo define) y la frase “No es una probabilidad de éxito”. Sin colores de semáforo.

---

## 6. Regla visual clave: confirmado · análisis IA · inferencia

**Principio.** El usuario debe poder responder, mirando un bloque cualquiera, *“¿esto lo dice un documento, lo ha calculado un modelo o es una hipótesis comercial?”* sin leer la letra pequeña. Esto implementa RN-02, D-01 y PM §9.

### 6.1 Definición de las capas

| Capa | Qué es | Quién la respalda | Ejemplo **(ilustrativo, no es un dato real)** |
|---|---|---|---|
| **Confirmado** (`confirmed`) | Hecho extraído de un documento oficial o autorizado, con cita que resuelve a un documento almacenado. | El documento. | “El Ministerio X publicó la resolución N.º [EJEMPLO] el [FECHA EJEMPLO].” |
| **Análisis IA** (`ai_analysis`) | Resumen, clasificación, relación o cálculo producido por un modelo a partir de documentos; revisado o no. | Un modelo + evidencia. | “Resumen generado: el proyecto parece orientarse al sector turismo.” |
| **Inferencia comercial** (`inference`) | Hipótesis sobre una oportunidad o necesidad derivada de un hecho; **no está en ningún documento**. | Un razonamiento explícito. | “Un proyecto hotelero podría generar necesidad de climatización.” |

### 6.2 Tratamiento visual (no depende solo del color)

| Atributo | Confirmado | Análisis IA | Inferencia |
|---|---|---|---|
| Etiqueta (texto) | `Confirmado` | `Análisis IA` | `Inferencia` |
| Icono | Escudo con check | Destellos | Flecha diagonal |
| Borde | Sólido 1 px, completo | Barra sólida 3 px a la izquierda | **Punteado** 1,5 px, completo |
| Fondo | Neutro (`bg-subtle`/`surface`) | Azul muy suave | Ámbar muy suave |
| Tipografía | Normal | Normal | **Cursiva en el texto de hipótesis** (no en cifras) |
| Metadatos obligatorios | Fuente, fecha, cita | Modelo, versión, fecha, “Revisado por [nombre] el [fecha]” o “Sin revisión humana” | Base del razonamiento, nivel de confianza, “No es un contrato ni una garantía” |
| Icono de ayuda | “¿Qué significa?” | igual | igual |
| Lectura por lector de pantalla | “Dato confirmado. …” | “Análisis generado por inteligencia artificial. …” | “Inferencia comercial, no confirmada. …” |
| Impresión / escala de grises | Distinguible por borde y texto | Distinguible por barra y texto | Distinguible por borde punteado y texto |

### 6.3 Reglas de composición

1. **Una afirmación, una capa.** Un párrafo no mezcla capas. Si un resumen IA contiene un hecho confirmado, se separan en dos bloques.
2. **Una cifra solo vive en `confirmed`** con fuente. Una cifra dentro de `ai_analysis` o `inference` debe ser **reproducible por cálculo** y mostrar sus supuestos; si no, “No disponible”.
3. **El orden vertical sigue la fuerza de la evidencia:** `confirmed` arriba, `ai_analysis` después, `inference` al final, separadas por un encabezado. Una oportunidad nunca abre con inferencia.
4. **La inferencia nunca tiene CTA de acción financiera.** Sus CTA son “Ver evidencia de origen”, “Guardar”, “Marcar como útil/no útil”.
5. **La capa viaja con el dato** (también en listas, tarjetas, alertas, exportaciones, capturas y correos). Una alerta que cita una oportunidad lleva la etiqueta `Inferencia`.
6. **No se “asciende” de capa por repetición.** Que un análisis IA aparezca en varias pantallas no lo vuelve confirmado. Solo pasa a `confirmed` si un documento lo respalda y se enlaza.
7. **Revisión humana no cambia la capa:** un análisis IA revisado sigue siendo `Análisis IA`; se añade “Revisado por”.
8. **Datos demo:** además de su capa llevan `DEMO`.
9. **Los bordes y fondos se aplican al bloque, no al texto suelto**, para que la capa sea visible incluso con CSS parcial.

### 6.4 Casos límite

| Caso | Tratamiento |
|---|---|
| Evento oficial sin segunda fuente | `Confirmado` si el documento oficial es auténtico (PM §5: la ausencia de segunda fuente no invalida un documento oficial). Se muestra “1 fuente oficial”. |
| Evento extraído por IA de una noticia (no oficial) | `Análisis IA` + estado de verificación visible; no `Confirmado` hasta contrastar. `[PENDIENTE A: criterio de fuente autorizada]` |
| Fuentes en conflicto | Bloque `Confirmado` por cada fuente + estado “En disputa”; no se mezclan en un único resumen. |
| Cálculo determinista (p. ej. rendimiento) | Etiqueta propia “Cálculo” con fórmula y supuestos visibles; no es `confirmed` (el resultado no está en un documento) ni “IA” (es código). `[PENDIENTE SRS: V-05]` |
| Texto editado por humano | Mantiene la capa original; se registra editor y fecha en el historial. |
| Datos de usuario (notas privadas) | Sin capa; etiquetado “Nota privada”. |

> El cálculo determinista merece capa propia o regla: se propone como **extensión** `calculation` (no pedida por el PM) para no etiquetar mal un resultado. Es una decisión de producto que debe aprobar el usuario (**D-08, ver §9**).

### 6.5 Criterios de aceptación

- **AC-DS-01** Dado cualquier bloque que muestre contenido de negocio, cuando se renderiza, entonces lleva `TrustLayerBadge` con icono y texto, y la capa se anuncia al lector de pantalla.
- **AC-DS-02** Dado un bloque `ai_analysis`, cuando se muestra, entonces incluye modelo, versión, fecha y estado de revisión humana.
- **AC-DS-03** Dado un bloque `inference`, cuando se muestra, entonces incluye base del razonamiento, confianza y la frase “No es un contrato ni una garantía”, y no ofrece CTA financieros.
- **AC-DS-04** Dada una captura en escala de grises, cuando se revisa, entonces las tres capas siguen distinguiéndose.
- **AC-DS-05** Dada una cifra sin fuente, cuando se intenta renderizar, entonces el componente muestra “No disponible” con motivo.

---

## 7. Patrones de contenido

| Situación | Texto (es-DO) |
|---|---|
| Cifra sin fuente | “No disponible. La fuente no publica este dato.” |
| Cifra no verificada | “Sin verificar. Fuente: [institución], capturada el [fecha].” |
| Instrumento no confirmado | “Disponibilidad no confirmada. Consulte requisitos en la fuente oficial.” |
| Estado de proyecto no demostrado | “Estado desconocido: no hay documento que lo acredite.” |
| Oportunidad | “Hipótesis comercial basada en [hecho]. No es un contrato ni una garantía.” |
| Aviso general | “Información con fines informativos. No constituye asesoramiento financiero.” `[PENDIENTE LEGAL]` |
| Error | “No pudimos cargar [recurso]. Código de solicitud: [request_id]. Reintentar.” |

- Voz: clara, directa, sin hipérbole; sin “garantizado”, “seguro”, “imperdible”, “el mejor”.
- Números: formato es-DO (`1 234,56`), moneda con código ISO (`DOP`, `USD`); porcentajes con una coma decimal.
- Fechas: `12 nov 2026`; hora con zona `14:30 AST` (UTC−4).
- Nunca usar “aprobado” para algo sin documento; nunca “comprar” en instrumentos.

---

## 8. Dependencias, vacíos y riesgos

| ID | Elemento | Estado |
|---|---|---|
| DS-D1 | Aprobación del usuario sobre paleta y tipografía (derivadas del brief AviTech, pendiente de aprobación en su origen) | `[PENDIENTE USUARIO]` |
| DS-D2 | Redacción legal de `DisclaimerNote` | `[PENDIENTE LEGAL]` |
| DS-D3 | Decisión de Ventana A sobre fuentes autoalojadas y librería de gráficos | `[PENDIENTE A]` |
| DS-D4 | Validación de paleta de gráficos con simulación de daltonismo | `[NO VERIFICADA]` |
| DS-D5 | Auditoría axe/lector de pantalla/teclado de los componentes | `[PENDIENTE Sprint 1+]` |
| DS-D6 | Prototipo de baja fidelidad para test de comprensión de las tres capas (SP-06, M-11) | `[PENDIENTE]` |
| DS-R1 | Riesgo: “Análisis IA” se lee como una garantía de calidad | Mitigación: texto “generado por IA” + revisión visible; test de comprensión. |
| DS-R2 | Riesgo: demasiadas etiquetas saturan la pantalla | Mitigación: etiqueta compacta (solo icono + palabra) en listas; expandida en fichas. |
| DS-R3 | Riesgo: el color de éxito/peligro se interpreta como recomendación | Mitigación: regla §2.2; revisión de textos. |

---

## 9. Decisiones de producto/UX candidatas a ADR

| ID | Decisión | Alternativas | Motivo |
|---|---|---|---|
| D-01 (REQUISITOS §10) | Tres capas con icono + texto + patrón. | Solo color. | Accesibilidad y confianza. |
| D-08 | Añadir etiqueta `Cálculo` para resultados deterministas. | Etiquetar como `confirmed`; etiquetar como IA. | Evita etiquetar mal un resultado; **requiere aprobación** porque amplía el vocabulario del PM. |
| D-09 | Rojo/verde reservados a estado del dato, nunca a variaciones de tasa. | Semáforo de tasas. | Evita que la UI parezca recomendar. |
| D-10 | Modo oscuro con tokens propios y tema “Sistema” por defecto. | Solo claro; solo oscuro. | PM §9 exige ambos. |
| D-11 | Paginación en tablas del MVP. | Scroll infinito. | Accesibilidad y simplicidad; se reevalúa tras la prueba de rendimiento. |

---

## 10. Registro de cambios

| Versión | Fecha | Cambio | Autor |
|---|---|---|---|
| 0.1.0 | 2026-11-15 | Creación: tokens claro/oscuro con contrastes calculados, tipografía, accesibilidad AA, componentes base, tablas densas, badges, panel de evidencia, gráficos y regla de capas de confianza. | Ventana B |
