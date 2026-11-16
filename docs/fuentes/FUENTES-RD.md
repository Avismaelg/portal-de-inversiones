# Registro de fuentes de datos — República Dominicana

| Campo | Valor |
|---|---|
| Documento | `docs/fuentes/FUENTES-RD.md` |
| Versión | 0.1.0 (Sprint 0) |
| Fecha de verificación | 2026-11-15 |
| Autor | Ventana A |
| Estado | **BORRADOR PARA APROBACIÓN** |
| Requisitos | `[PENDIENTE SRS]` — la SRS no existe (B-001). Base: Prompt Maestro §6 |

> **Regla de lectura.** Cada afirmación lleva su evidencia (URL consultada hoy) o la marca `DESCONOCIDO — verificar`. "No documentado en las páginas leídas" **no** equivale a "no existe": solo significa que no lo vi. Las lecturas se hicieron con un lector web de solo texto (sin navegador real), de modo que parte de las páginas dinámicas no se vio. Nada de lo que sigue es una conclusión legal: ver `REQUIERE ABOGADO` en `docs/seguridad/SEGURIDAD-Y-CUMPLIMIENTO.md`.

## 0. Cómo se verificó (método y límites)

- Lectura de páginas oficiales con un lector web (HTTP GET, sin ejecutar JavaScript) el 2026-11-15. Búsquedas web generales solo para orientar; **no** se usan como evidencia.
- Bloqueos encontrados (no se intentó evadirlos): `simv.gob.do`, `bvrd.com.do`, `cdn.bvrd.com.do`, `boletin.bvrd.com.do`, `hacienda.gob.do` → HTTP 403; `cne.gob.do`, `datos.gob.do` → HTTP 473 (estado no estándar). Se reintentaron solo desde el lector; **no** se probaron variantes de User-Agent ni rutas alternativas.
- Los 403/473 pueden ser filtros anti-bot del sitio. Que el lector reciba 403 **no** autoriza ni prohíbe acceso automatizado: es un hallazgo que exige decisión humana (ver §12).
- Pendiente: repetir las verificaciones desde un navegador real y desde la IP de producción (los WAF suelen tratar distinto a ambos).

## 1. Resumen ejecutivo

| # | Fuente | API documentada | Mejor vía candidata | Verificación | Riesgo |
|---|---|---|---|---|---|
| F-01 | DGCP (contrataciones) | **Sí, indirecta**: volcado bulk OCDS (JSONL/CSV/Excel) vía OCP; endpoint propio `DESCONOCIDO — verificar` | Descarga bulk OCDS | Parcial | Bajo–medio |
| F-02 | BCRD (estadísticas y valores) | No documentada (`apibcrd.bancentral.gov.do` sin contenido visible) | Descarga de XLS/XLSX publicados | Parcial | Medio |
| F-03 | Ministerio de Hacienda — Crédito Público | No documentada | PDF/XLSX + RSS (`/Content/index.xml`, sin leer) | Buena | Medio |
| F-04 | MIMARENA (autorizaciones ambientales) | No documentada | Descargas WPFD + "Consulta de Autorizaciones" | Parcial | Medio–alto |
| F-05 | CNE (energía) | `DESCONOCIDO — verificar` | `DESCONOCIDO` | **Nula (HTTP 473)** | Alto (por desconocimiento) |
| F-06 | SIMV | `DESCONOCIDO — verificar` | `DESCONOCIDO` | **Nula (HTTP 403)** | Alto (por desconocimiento) |
| F-07 | BVRD | `DESCONOCIDO — verificar` | Procedimiento manual / acuerdo | Parcial (solo robots.txt) | **Alto** |
| F-08 | ProDominicana | No documentada | Manual / RSS no hallado | Parcial | Medio |
| F-09 | Portal nacional de datos abiertos (`datos.gob.do`) | `DESCONOCIDO — verificar` (¿CKAN?) | `DESCONOCIDO` | **Nula (HTTP 473)** | — |
| F-10 | Entidades públicas de obra (MOPC, etc.) | `DESCONOCIDO` | `DESCONOCIDO` | No iniciada | — |

**Conclusión de Sprint 0:** solo dos fuentes (F-01 DGCP y F-03 Crédito Público) tienen evidencia suficiente para diseñar un conector. El resto necesita verificación adicional o un procedimiento manual antes de Sprint 1. **No debe prometerse cobertura de los módulos B, C (emisiones SIMV/BVRD) y E hasta resolver F-04…F-08.**

---

## 2. F-01 — Dirección General de Contrataciones Públicas (DGCP)

| Campo | Hallazgo | Evidencia |
|---|---|---|
| URL oficial | `https://www.dgcp.gob.do/` ; datos abiertos: redirigen (HTTP 301) a `https://datosabiertos.dgcp.gob.do/opendata` | Respuesta 301 de `dgcp.gob.do/datos-abiertos/api/`, `/datos-abiertos1/`, `/tablas/` (no seguida: otro host) |
| ¿API documentada? | **Parcial.** La ficha de OCP indica que los datos se obtienen de `dgcp.gob.do/datos-abiertos/api/` y ofrece descarga masiva. Endpoints, autenticación y límites de la API propia: `DESCONOCIDO — verificar` (no se leyó `datosabiertos.dgcp.gob.do`). | https://data.open-contracting.org/en/publication/22 |
| Formato | OCDS. Bulk: JSON Lines comprimido (`.jsonl.gz`, ~424 MB), CSV (`main.csv`, tar.gz, ~543 MB) y Excel por año. | OCP, ficha 22 |
| Frecuencia | OCP: "Daily"; rango "Mar 2015 – Sep 2026"; "Last retrieved: Oct 7, 2026 (retrieved monthly)". **Contradicción:** una búsqueda externa citó política DGCP con actualización trimestral. No resuelta → `DESCONOCIDO — verificar` en la fuente primaria. | OCP ficha 22; resultado de búsqueda (no primario) |
| Términos de uso | Licencia **ODbL** (atribución + compartir igual en versiones adaptadas). Texto íntegro de términos DGCP: no leído. | OCP ficha 22 → opendatacommons.org/licenses/odbl |
| Restricciones | `robots.txt` de `www.dgcp.gob.do`: `Disallow` en `/calendar/`, `/dgcp/`, `/catalogos/`, `/new_dgcp/`, `/old_dgcp/`, `/sign-in/`, `/sign-up/` y otros (~45 líneas); sin `Crawl-delay`. No hay reglas leídas para `datosabiertos.dgcp.gob.do`. Captcha/login para la descarga: no mencionado. | `https://www.dgcp.gob.do/robots.txt` |
| Cobertura | Procesos de todas las entidades que usan el Portal Transaccional; excluye lo exento por Ley 340-06 (p. ej. compras menores hasta RD$50 000). Conteos OCP: 583 549 licitaciones, 566 151 adjudicaciones, 646 180 contratos. `items`, `transactions`, `milestones`, `amendments` = 0. | OCP ficha 22 |
| Calidad | La propia ficha advierte inconsistencias (p. ej. `contract/period/startDate` posterior a `endDate`). Revisión de calidad datada abr-2020. | OCP ficha 22 |
| Legalidad de automatización | La descarga masiva publicada bajo ODbL está pensada para reutilización. **Condición:** respetar atribución/share-alike; consultar abogado si se redistribuyen derivados (`REQUIERE ABOGADO`). | OCP ficha 22 |
| **Estrategia propuesta** | **CSV/JSONL bulk OCDS** (carga diaria incremental por fecha) en Fase 3. Mantener `source_documents` por proceso con hash. Evaluar el endpoint de `datosabiertos.dgcp.gob.do` solo tras leer su documentación. | — |
| Riesgo | **Bajo–medio**: archivos de cientos de MB (memoria del worker), cambio de host (301), contradicción de frecuencia. | — |
| Acción previa a Sprint 1 | (1) Leer `datosabiertos.dgcp.gob.do/opendata` y su `robots.txt`; (2) confirmar frecuencia real de actualización; (3) medir tamaño incremental. | — |

Módulos que alimenta: D (licitaciones/contratos), E (proveedores), F (oportunidades). Requisitos: RF-D-01…D-10 (`docs/producto`).

## 3. F-02 — Banco Central de la República Dominicana (BCRD)

| Campo | Hallazgo | Evidencia |
|---|---|---|
| URL oficial | `https://www.bancentral.gov.do/` | Leída (HTTP 200) |
| ¿API documentada? | **No documentada en lo leído.** El pie enlaza "API" a `https://apibcrd.bancentral.gov.do/`, que devolvió solo el texto "API BCRD" sin endpoints, formatos ni términos. → `DESCONOCIDO — verificar` | `apibcrd.bancentral.gov.do` |
| Formato | XLS, XLSX y PDF alojados en `cdn.bancentral.gov.do`. Ejemplos: `tbm_activad.xlsx` (tasas activas), `tbm_pasivad.xlsx`, `Serie_TPM.xlsx`, `operaciones_interb.xls`, `reservas_internacionales.xlsx`; valores: `certificados_inversion_ti.xls`, `valores_circulacion.xlsx`, `valores_vencimientos.xls`. CSV/JSON: no hallados. | `bancentral.gov.do/a/d/2536-sector-monetario-y-financiero`, `/a/d/2598-subasta` |
| Frecuencia | No declarada. Solo se ven períodos (p. ej. "Octubre 2026"). Existe "Calendario de publicación" (`/a/d/3897-publicaciones`), **no leído**. | — |
| Términos de uso | Enlace "Términos de uso" `https://bancentral.gov.do/a/d/3894`: la página cargó solo el título; **texto no obtenido** → `DESCONOCIDO — verificar`. Pie: "© . Todos los derechos reservados." | `/a/d/3894` |
| Restricciones | `robots.txt`: la URL devolvió una página HTML 404 (no hay archivo robots). No se vio captcha ni login. | Lectura de `robots.txt` |
| Cobertura | Series macro (tasas, TPM, IMAE, PIB, IPC, reservas), instrumentos de mercado abierto (letras, notas), valores en circulación. Resultados de subastas: páginas `/a/d/2717-compra-de-valores`, `/2708-letras-del-banco-central`, `/2711-notas-del-banco-central` **no leídas**. | — |
| Calidad | `DESCONOCIDO — verificar` (sin diccionario de datos visible). Los XLS cambian de estructura sin aviso: riesgo de ruptura. | — |
| Legalidad | Sin términos leídos no se puede concluir. `REQUIERE ABOGADO` para confirmar reutilización comercial. | — |
| **Estrategia propuesta** | Descarga programada de XLS/XLSX con detección de cambios por hash y validación de columnas; si cambia el esquema, **detener y alertar** (no adivinar). Preguntar al BCRD por API o autorización formal (procedimiento manual de solicitud). | — |
| Riesgo | **Medio**: términos desconocidos, formatos frágiles, frecuencia no declarada. | — |

Módulos: C (instrumentos, tasas, subastas), A (eventos macro).

## 4. F-03 — Ministerio de Hacienda y Economía — Dirección General de Crédito Público

| Campo | Hallazgo | Evidencia |
|---|---|---|
| URL oficial | `https://www.creditopublico.gob.do/` (el sitio de Hacienda `www.hacienda.gob.do` devolvió **HTTP 403**) | Lecturas HTTP 200 |
| ¿API documentada? | **No documentada** en las páginas leídas. | Home, subastas, estadísticas |
| Formato | Resultados de subasta: **PDF** (patrón `/Content/subastas/resultados/{AAAA}/{NN}Subastas - ….pdf`; `NN` es secuencia, no mes); consolidado: **XLSX** (`/Content/subastas/consolidados/2026/02Consolidado.xlsx`); convocatorias: PDF; estadísticas de deuda: XLSX/XLS; informes trimestrales y planes de financiamiento: PDF. CSV/JSON: no hallados. | `/emisiones/subastas`, `/inicio/estadisticas` |
| Frecuencia | Sin política declarada. Hay fechas por archivo (p. ej. resultado de subasta 09/sep/2026; informe trimestral septiembre publicado 10/11/2026). Calendario de subastas 2026 mostrado como widget; **sin archivo descargable hallado**. | Home, `/publicaciones/informes_trimestrales` |
| Términos de uso | `/inicio/terminos_de_uso`: servicios gratuitos; sin registro; "todo el contenido… protegido por derechos de propiedad intelectual"; el portal puede cambiar los términos sin aviso. **No hay licencia explícita de reutilización de datos.** | Página leída |
| Restricciones | `robots.txt`: la URL devolvió una página 404 (sin archivo). Sin captcha/login en descargas. "Registro de Inversionistas" y "Consulta de Financiamientos": no leídos. | — |
| Cobertura | Subastas 2009–2026; convocatorias 2013–2026; planes de financiamiento 2008–2026; informes trimestrales 2006–2026. | `/emisiones/subastas` |
| Calidad | PDFs con patrón estable pero títulos variables ⇒ parseo frágil; XLSX más fiable. | — |
| Legalidad | Acceso gratuito y público; la reutilización comercial/derivada **no está autorizada ni prohibida explícitamente** → `REQUIERE ABOGADO`. | — |
| RSS | `https://www.creditopublico.gob.do/Content/index.xml` enlazado en la home; **no leído**. | Home |
| **Estrategia propuesta** | (1) RSS si su contenido es útil (verificar); (2) listado de subastas HTML → descarga de PDF/XLSX; (3) extracción **determinista** del XLSX consolidado como fuente primaria de tasas; PDF solo como evidencia. Registrar `tasa_de_corte` como `awarded`, nunca como `indicative`. | — |
| Riesgo | **Medio**: PDFs, términos sin licencia clara. | — |

## 5. F-04 — Ministerio de Medio Ambiente y Recursos Naturales (MIMARENA)

| Campo | Hallazgo | Evidencia |
|---|---|---|
| URL oficial | `https://ambiente.gob.do/` ; servicios digitales `https://serviciosdigitales.ambiente.gob.do/` ; consulta `…/search/` (host **no leído**) | Home (HTTP 200) |
| ¿API documentada? | **No documentada** en lo leído. | — |
| Formato | Portal de transparencia con bloque "Autorizaciones y Sanciones Ambientales": pestañas Tipo A–D; Licencias/Permisos/Constancias/Autorizaciones; sanciones por año (2024, 2025). Enlaces de descarga `…/portal-transparencia/wp/download/wpfdcat/{756,831,2687}/…`. **Formato de los archivos: `DESCONOCIDO — verificar`** (el texto leído no mostró las filas). | `portal-transparencia/autorizaciones-ambientales/` |
| Frecuencia | `DESCONOCIDO — verificar`. | — |
| Términos de uso | `ambiente.gob.do/terminos-de-uso/`: gratuito; contenido con derechos de propiedad intelectual; existe cláusula contra evadir dispositivos de protección. Licencia de reutilización de datos: **no declarada**. | Página leída |
| Restricciones | `robots.txt` (HTTP 200): `Disallow: /wp/wp-admin/` (con excepción `admin-ajax.php`); `User-agent: *` con `Disallow:` vacío; sin `Crawl-delay`; `Sitemap: https://ambiente.gob.do/sitemap_index.xml`. Existe un login `sigeord.ambiente.gob.do/login` (no se accede). | `ambiente.gob.do/robots.txt` |
| Cobertura | Autorizaciones otorgadas (según el portal); **no se verificó** si incluye proyecto, promotor, ubicación y monto. Prensa menciona miles de permisos/año (no primario, no usado). | — |
| Datos abiertos | Lista conjuntos (calidad del aire, áreas protegidas, incendios forestales, etc.) — **ninguno es de autorizaciones**. Remite a `datos.gob.do` (no accesible hoy). | `portal-transparencia/datos-abiertos/` |
| Legalidad | Información pública bajo Ley 200-04 de libre acceso (según el propio portal). La automatización de la consulta `…/search/` no está evaluada → `REQUIERE ABOGADO` / verificar términos del host de servicios. | — |
| **Estrategia propuesta** | **Procedimiento manual asistido** en el MVP: operador descarga los archivos WPFD periódicamente y los sube al panel admin (con hash y registro). Automatizar solo si los archivos son tabulares estables y `robots.txt` del host lo permite. Alternativa: solicitud formal de información (OAI) para obtener un volcado. | — |
| Riesgo | **Medio–alto**: formato desconocido, sin API, el estado "aprobado" puede no distinguirse de "solicitado" (regla PM §4-B). | — |

## 6. F-05 — Comisión Nacional de Energía (CNE)

| Campo | Hallazgo |
|---|---|
| URL oficial | `https://www.cne.gob.do/` — **HTTP 473, sin cuerpo** (2026-11-15). No se leyó ninguna página. |
| API / formato / frecuencia / términos / restricciones | `DESCONOCIDO — verificar` (todos). |
| Contexto no primario | Búsquedas indican que la CNE publica resoluciones de concesiones provisionales/definitivas y memorias anuales (hospedadas también en `memorias.minpre.gob.do`). **No se usa como evidencia**; solo orienta qué verificar. |
| Estrategia propuesta | `DESCONOCIDO`. Hasta verificar: **procedimiento manual** (revisión periódica de resoluciones + carga manual) y solicitud formal de acceso. |
| Riesgo | **Alto por desconocimiento.** Módulos B/E (autorizaciones energéticas) dependen de esta fuente. |
| Acción | Revisar desde navegador real; si persiste 473, preguntar a la CNE. |

## 7. F-06 — Superintendencia del Mercado de Valores (SIMV)

| Campo | Hallazgo |
|---|---|
| URL oficial | `https://www.simv.gob.do/` — **HTTP 403** (también `robots.txt`). Nada leído. |
| API / formato / frecuencia / términos | `DESCONOCIDO — verificar`. |
| Contexto no primario | Resultados de búsqueda sugieren: marco legal Ley 249-17 (Mercado de Valores); hechos relevantes se notifican a la SIMV según reglamento R-CNMV-2022-10-MV; existe un Registro del Mercado de Valores. **No verificado en fuente primaria.** |
| Estrategia propuesta | `DESCONOCIDO`. Hasta verificar: consulta manual del Registro y de hechos relevantes; carga manual con trazabilidad. |
| Riesgo | **Alto por desconocimiento**; además es fuente regulatoria (cumplimiento). |
| Acción | Verificar con navegador real; considerar contacto institucional. |

## 8. F-07 — Bolsa y Mercados de Valores de la República Dominicana (BVRD)

| Campo | Hallazgo | Evidencia |
|---|---|---|
| URL oficial | `https://bvrd.com.do/` — HTTP 403 al lector. Boletines diarios en PDF en `boletin.bvrd.com.do` (aparecen en búsqueda; **sin leer**). | — |
| API / formato / frecuencia | `DESCONOCIDO — verificar`. Búsqueda (no primaria): boletines diarios PDF. | — |
| Términos de uso | PDF de Términos y Condiciones y Aviso Legal: **HTTP 403, no leídos** → `DESCONOCIDO — verificar`. Búsqueda (no primaria) indica que algunos boletines llevan avisos que restringen el uso sin permiso escrito de BVRD y Bloomberg. | — |
| Restricciones (`robots.txt`, HTTP 200) | `User-agent: *` con `Content-Signal: search=yes,ai-train=no,use=reference` y `Allow: /`; bloques `Disallow: /` para crawlers de IA (p. ej. `ClaudeBot`, `GPTBot`, `anthropic-ai`, `Claude-Web`, `CCBot`, `Google-Extended`). Sin `Crawl-delay`. | `https://bvrd.com.do/robots.txt` |
| Legalidad | **El sitio declara expresamente que no autoriza entrenamiento de IA y limita el uso a "referencia".** Cualquier ingesta automatizada o uso por LLM de su contenido exige aclaración. `REQUIERE ABOGADO`. | — |
| **Estrategia propuesta** | **No automatizar.** Procedimiento manual (consulta humana, enlace a la fuente, sin copiar contenido) y solicitud de autorización/licencia de datos a la BVRD. No usar contenido BVRD para entrenar ni afinar modelos. Mostrar al usuario enlace a la fuente. | — |
| Riesgo | **Alto.** | — |

## 9. F-08 — ProDominicana

| Campo | Hallazgo | Evidencia |
|---|---|---|
| URL oficial | `https://prodominicana.gob.do/` (HTTP 200) | Leída |
| API | **No documentada** (sin enlace a API en la home). | — |
| Datos estructurados | "Tablero de datos" en la home con cifras agregadas (p. ej. IED 1T-2026) **sin archivo, tabla ni fuente descargable visible**. Secciones `/news`, `/events` (no abiertas). RSS: no hallado. | Home |
| Términos de uso | Enlazados en `/terms-of-use` y `/privacy-policy` (**no leídos**). | — |
| Restricciones | `robots.txt`: HTTP 404 (sin reglas). | — |
| Legalidad / calidad | `DESCONOCIDO — verificar`. Cifras de la home son marketing institucional, no datos con metodología publicada. | — |
| **Estrategia propuesta** | Comunicados (`/news`) como fuente de **eventos** del Módulo E (señal, no hecho verificado); lectura manual o HTML parseable tras leer términos. Las cifras del tablero **no** se almacenan como serie sin su metodología. | — |
| Riesgo | **Medio.** | — |

## 10. F-09 — Portal nacional de datos abiertos (`datos.gob.do`)

`https://datos.gob.do/` y `/api/3/action/package_list` → **HTTP 473, sin cuerpo**. Si es CKAN (hipótesis, **no verificada**), ofrecería API estándar y licencias por conjunto. Varias instituciones lo mencionan como destino de sus datos abiertos (MIMARENA, Crédito Público). **Acción:** verificar desde navegador real. Estado: `DESCONOCIDO — verificar`.

## 11. F-10 — Instituciones responsables de proyectos públicos

Prompt Maestro §6 incluye "Instituciones responsables de proyectos públicos". No se identificó ninguna entidad concreta ni se leyó ningún sitio. Estado: `DESCONOCIDO — verificar`. Candidatas a evaluar en Sprint 1 (sin verificar): ministerios de obras públicas, energía y minas, turismo. **No se listan como fuentes aprobadas.**

## 12. Decisiones y acciones que requieren al usuario

| ID | Decisión / acción | Opciones | Recomendación |
|---|---|---|---|
| FD-01 | Los 403/473 de SIMV, BVRD, Hacienda, CNE y `datos.gob.do` | (a) Verificar con navegador real; (b) pedir acceso formal a la institución; (c) tratarlas como manuales | (a) y (b); mientras tanto (c). **No** probar evasión de WAF. |
| FD-02 | BVRD declara `ai-train=no` y bloquea crawlers de IA | (a) No automatizar; (b) pedir licencia | (a) + (b). |
| FD-03 | Sin licencia de reutilización explícita (BCRD, Crédito Público, MIMARENA) | Consulta legal | Abogado dominicano antes de Fase 3. |
| FD-04 | Contradicción de frecuencia DGCP (diaria vs. trimestral) | Leer política oficial | Verificar en `datosabiertos.dgcp.gob.do`. |
| FD-05 | Cobertura realista del MVP | Prometer A–F completos / declarar cobertura por fuente | Declarar cobertura por fuente (RF-B-01 de B). |

## 13. Política común de conectores (aplica a todas)

1. Identificar el cliente con un `User-Agent` honesto y un contacto institucional de AviTech (`[PENDIENTE]`: dirección de contacto). Sin suplantar navegadores.
2. Respetar `robots.txt` cuando exista; si no es legible, **no** asumir permiso: procedimiento manual hasta aclarar.
3. Límite de tasa por host (propuesta inicial: ≤ 1 solicitud/segundo y ≤ 1 000 solicitudes/día por fuente, ajustable) y backoff exponencial ante 429/5xx.
4. Sin evasión de captcha, autenticación, WAF ni licencias. Si una fuente bloquea, se registra el hecho y se escala.
5. Protección SSRF: lista cerrada de hosts por fuente, resolución DNS validada, bloqueo de IP privadas y de redirecciones a otros hosts (la 301 de DGCP a `datosabiertos.dgcp.gob.do` ilustra el caso: **requiere alta explícita del nuevo host**).
6. Cada documento se guarda con `content_hash` (SHA-256), URL final, cabeceras (`ETag`, `Last-Modified`), `fetched_at`, y la versión de los términos de uso consultada.
7. Política de almacenamiento por fuente: ver `MODELO-DATOS.md` §9 (retención). Los documentos de fuentes con licencia dudosa se guardan **solo para evidencia interna**, sin redistribuirlos íntegros al usuario hasta resolver la legalidad.

## 14. Registro de verificación pendiente (entrada para el backlog)

| Fuente | Qué falta | Tarea en `backlog-tecnico.md` |
|---|---|---|
| DGCP | Documentación de `datosabiertos.dgcp.gob.do`, frecuencia real | T-SRC-01 |
| BCRD | Términos (`/a/d/3894`), API, páginas de subastas | T-SRC-02 |
| Crédito Público | RSS, términos de privacidad, servicios de inversionistas | T-SRC-03 |
| MIMARENA | Formato real de WPFD, `serviciosdigitales` y su `robots.txt` | T-SRC-04 |
| CNE | Todo | T-SRC-05 |
| SIMV | Todo | T-SRC-06 |
| BVRD | Términos y licencia | T-SRC-07 |
| ProDominicana | `/news`, términos, RSS | T-SRC-08 |
| datos.gob.do | Existencia de CKAN/API | T-SRC-09 |

## 15. Fuentes internacionales (expansión posterior — fuera de Sprint 0)

SEC EDGAR, USAspending.gov, Federal Reserve: **no verificadas en esta sesión**; se evaluarán en una fase posterior.

## Decisión G0 #7 (2026-11-15)

Aprobada por el usuario en `docs/sprint-0/G0-ACTA.md` (decisiones #7 y #8). Aplica sin ambigüedad:

1. Los módulos con fuentes no verificadas — **B** (permisos y proyectos), **C-03** (mercado de valores) y **E** (expansión empresarial) — y las fuentes **F-05 a F-09** (CNE, SIMV, BVRD, ProDominicana, `datos.gob.do`) se declaran **cobertura manual**.
2. La UI debe mostrar **«cobertura pendiente»** en esos módulos; no se presentan como cubiertos.
3. **Solo se automatiza lo que verifiquen T-SRC-04…06** (MIMARENA, CNE, SIMV). Mientras no se verifiquen, esas fuentes operan por procedimiento manual (T-ING-06).
4. **DGCP es la única fuente con licencia verificada (ODbL)**, y su conector **no se activa hasta cerrar T-SRC-01**. Ningún otro conector se activa sin licencia o sin abogado (G0 #5).
5. El **histórico de DGCP será de los últimos N años**; **N se define en T-SRC-01** (G0 #8). No se carga el histórico completo a ciegas.

Matiz de A (no cambia la decisión): «licencia verificada» se refiere a la licencia ODbL declarada en la ficha de OCP; la verificación contra la fuente primaria (`datosabiertos.dgcp.gob.do`) sigue pendiente en T-SRC-01. El corte vertical del MVP aprobado es DGCP + Crédito Público; Crédito Público **no tiene licencia explícita** (ver F-03) y por G0 #5 su automatización espera al abogado, así que mientras tanto se trata como manual. Nada de esto está ejecutado: solo aprobado.

## Nota de conciliación G0 #5 / #7 — Crédito Público (Ronda 4, 2026-11-15)

No es una decisión nueva: es la lectura conjunta de las decisiones 5 y 7 del acta (`G0-ACTA.md`), según la aclaración del orquestador (`RONDA4-A.md` §1).

- «DGCP + Crédito Público» (acta §2) es el alcance **de producto** del corte vertical, **no** una autorización de conectores.
- **Crédito Público (F-03) entra con carga manual** (G0 #7) hasta que el abogado autorice su automatización (G0 #5): no declara licencia de reutilización.
- **El único conector activable en Sprint 1 es DGCP**, y solo tras cerrar T-SRC-01.
- Consecuencia práctica: T-ING-04 (conector de Crédito Público) queda bloqueada por T-PRE-05; mientras tanto se usa T-ING-06 (carga manual asistida).

## Histórico DGCP — N provisional `[PENDIENTE T-SRC-01]` (Ronda 4)

**No está decidido.** G0 #8 fija «últimos N años, con N definido tras T-SRC-01». Para que B pueda dimensionar el dataset de RNF-02/03 se propone **N = 5 años** (provisional). Cuentas calculadas por A a partir de la ficha de OCP (583 549 licitaciones y 646 180 contratos entre mar-2015 y sep-2026 ≈ 11,6 años); **asumen reparto uniforme por año, lo cual es falso y no está verificado**:

| N | Licitaciones | Contratos | Total ≈ | % del histórico |
|---|---|---|---|---|
| 3 años | ≈ 151 000 | ≈ 167 000 | ≈ 0,32 M | ≈ 26 % |
| **5 años (propuesto)** | ≈ 252 000 | ≈ 279 000 | **≈ 0,53 M** | ≈ 43 % |
| Todo (11,6 años) | 583 549 | 646 180 | ≈ 1,23 M | 100 % |

Razones de N = 5: (1) cubre más de un ciclo anual de compras y el período posterior a la pandemia; (2) acota el volumen de carga inicial y la memoria del worker (ADR-0005 sigue abierto); (3) basta para detectar patrones de proveedores y presupuestos recientes; (4) se amplía después sin rehacer nada (la carga es idempotente por `(source_id, external_id)`).
Para dimensionar RNF-02/03 con holgura se sugiere probar con **≈ 1,1 M filas** en licitaciones+contratos (≈ 2× el volumen de N = 5, coherente con la prueba al doble de capacidad de B, RNF-04), más el dataset sintético de eventos. Ese 2× es una convención de prueba, no un pronóstico. Las filas de `organizations` (proveedores) y de documentos no están incluidas: OCP cuenta 1 714 573 «parties» **sin deduplicar**, y la cifra real de organizaciones únicas es desconocida.
T-SRC-01 debe confirmar: reparto real por año, tamaño incremental y frecuencia de actualización, y fijar N.

## T-SRC-01 — intento de verificación del nuevo host de DGCP (2026-11-15)

Se consultó `https://datosabiertos.dgcp.gob.do/` (`/`, `/opendata`, `/opendata/tablas` y `/robots.txt`) con un lector de solo texto. Las 4 URL respondieron HTTP 200, pero el cuerpo es solo el título «Sistema de Información de Contrataciones Públicas» (54 caracteres); `/robots.txt` devuelve ese mismo HTML, no reglas. Probablemente la página se genera en el navegador con JavaScript, pero **no está confirmado**.

**Resultado:** API, conjuntos descargables, frecuencia, licencia y reglas de `robots.txt` del host siguen `DESCONOCIDO — verificar`. **T-SRC-01 no se cierra** y N (5 años) sigue provisional. Hace falta ver la página en un navegador real (o la documentación del sitio) antes de activar el conector de DGCP.

## T-SRC-01 — verificación del portal de datos abiertos de DGCP en navegador real (2026-11-15)

Leído con Chrome del propietario (solo lectura; sin formularios, sin descargas de datos masivos; se cerró la pestaña). El sitio es una aplicación que se dibuja en el navegador, por eso el lector de texto no veía nada. **Esto sustituye al intento fallido anterior** y corrige varias suposiciones de F-01.

| Aspecto | Hallazgo | Evidencia (URL) |
|---|---|---|
| **API documentada** | **Sí.** «API REST para acceso programático a datos públicos de contrataciones». URL base `datosabiertos.dgcp.gob.do/api-dgcp/v1`, versión v1.0, documentación OpenAPI 2.0 en `/datos-abiertos/apidgcp/docs` (**no leída todavía**: autenticación y endpoints exactos siguen sin verificar). Conjuntos: contratos, ofertas, procesos de licitación y registro de proveedores, en JSON | `https://datosabiertos.dgcp.gob.do/datos-abiertos/apidgcp` |
| **Descargas masivas** | Tablas en Excel y CSV: procesos de compras, contratos/adjudicaciones, registro de proveedores (y variables de proveedores); «descargar todo» o por año y semestre (2018…2026) | `.../datos-abiertos/tablas` |
| **Frecuencia** | Tablas: «periodicidad diaria… desde el año 2018». API: el *data warehouse* se actualiza **cuatro veces al día** (00:00, 07:00, 14:00 y 21:00 hora de RD); otra línea de la misma página dice «cada 8 horas» (**incongruencia menor**) | ambas páginas |
| **Licencia** | La página de la API declara «uso libre y gratuito bajo licencia **Apache 2.0**, permitiendo uso comercial y redistribución con atribución». La ficha de OCP del registro anterior decía ODbL. **No coinciden**; vale lo que dice DGCP en su propio sitio, pendiente de abogado | página de la API |
| **Términos de la API** (PDF «Términos y condiciones de uso: API Pública de la DGCP», actualizado 21/04/2026; SHA-256 `d2c85d4b…eb88`) | (1) Uso para extracción, análisis científico e inteligencia de negocios. (2) **Prohibido alimentar aplicaciones de usuario final con fines de lucro consultando la API en tiempo real**; el modelo autorizado y obligatorio es **extraer, guardar en la propia base y servir desde la propia infraestructura** (justo nuestro diseño). (3) **60 peticiones por minuto** por identificador o IP; **una solicitud activa y cola de 30**; el exceso se rechaza. (4) **Sondeo continuo 24/7 no permitido**; sanciones y bloqueo automático de IP sin aviso (soporte `cienciadedatos@dgcp.gob.do`). (5) Perfilado de comportamiento en ventanas de 7 días | `https://datosabiertos.dgcp.gob.do/content/Terminos%20y%20condiciones%20API-DGCP.pdf` |
| **Políticas de uso del portal** | Solo descargo de responsabilidad: la veracidad e integridad de los datos es **de cada institución** (Ley 340-06, art. 34); DGCP no responde por caídas ni errores de origen. Sin cláusulas de reutilización ni de automatización | `.../datos-abiertos/politicas-uso` |
| **`robots.txt`** | **No existe**: `/robots.txt` devuelve la página de la aplicación (HTML), no reglas | comprobado en el navegador |
| **Captcha / login** | No se vio ninguno en las páginas leídas; autenticación de la API: no verificada | — |
| **Cobertura** | Datos desde **2018** en las tablas (la ficha de OCP decía 2015). 307 instituciones usan el Portal Transaccional | políticas de uso y tablas |

**Consecuencias para el diseño (propuestas, no decididas):**
1. **Vía recomendada para el conector DGCP:** las **descargas CSV por año/semestre** (carga inicial y reposición) y la **API** para el incremental diario, **con un cliente que respete 60 peticiones/min, 1 concurrente y sin sondeo continuo** (p. ej. una ejecución diaria en una ventana corta). El formato OCDS/JSONL de OCP deja de ser la fuente principal.
2. **Nuestro modelo cumple el «modelo autorizado»** (copiar a nuestra base y servir desde ella). Hay que **no** consultar la API desde la interfaz de los usuarios: ya era el diseño (workers → base → web).
3. **N de histórico:** el tope real es 2018. Con N = 5 años (provisional) se cubriría 2021–2026. Las cifras de volumen de §«N provisional» venían de OCP (2015–2026) y **deben rehacerse** con los conteos reales de las tablas descargadas.
4. **`REQUIERE ABOGADO`:** coexisten tres textos (Apache 2.0 en la página de la API, restricción de uso comercial directo en los términos y el descargo en las políticas), y la Ley 340-06 deja la veracidad en cada institución. Hay que confirmar que un producto SaaS comercial que **almacena** y **redistribuye** datos derivados encaja en «uso con atribución».

**Pendiente para cerrar T-SRC-01:** (a) leer la documentación OpenAPI (autenticación, endpoints, paginación); (b) fijar N con los conteos reales; (c) contacto institucional del `User-Agent` (SG-05); (d) opinión del abogado sobre la licencia. **El conector sigue inactivo** (`dgcp_ocds`, `is_active = false`, `legal_status = pending_review`): no se cambió nada en la base.

## T-SRC-01 — esquema OpenAPI de la API DGCP leído (2026-11-16)

Fuente: el archivo público `https://datosabiertos.dgcp.gob.do/assets/api-dgcp-schema-CDm5hHhK.js` que carga la página `/datos-abiertos/apidgcp/docs` (leído desde Chrome del propietario; descarga de solo lectura de un archivo estático, **sin consultar la API**). Base: `datosabiertos.dgcp.gob.do/api-dgcp/v1`. Contacto declarado: `cienciadedatos@dgcp.gob.do`.

| Aspecto | Hallazgo |
|---|---|
| Autenticación | **El esquema no declara ninguna** (sin `securityDefinitions`, sin cabecera de clave). Sin verificar con una llamada real. |
| Endpoints GET | `/catalogo`, `/contratos`, `/contratos/articulos`, `/ocds/releases`, `/ocds/releases/all`, `/ofertas`, `/pacc`, `/pacc/adquisiciones`, `/pacc/articulos`, `/procesos`, `/procesos/agrupados`, `/procesos/articulos`, `/procesos/documentos`, `/procesos/mipymes/*`, `/proveedores`, `/proveedores/estadisticas-mujeres`, `/proveedores/rubro`, `/unidades_compra`, y `/tablas/*` (archivos CSV/XLSX) |
| Paginación | `page` y `limit`; por defecto 100 registros, **máximo 1000** en `/procesos` |
| Incremental | `/procesos` admite `startdate` y `enddate` (`YYYY-MM-DD`, fecha de publicación), además de `modalidad`, `estado`, `unidad_compra`, `proceso`, `mipyme`, `mipyme_mujer`. `/contratos` admite `rpe`, `proceso`, `unidad_compra`, `contrato` |
| Descargas | `/tablas/procesos`, `/tablas/contratos`, `/tablas/proveedores` con `Type=csv|xlsx`; las de artículos exigen `semestre` y `año` |
| Actualización | El *data warehouse* se refresca a las 00:00, 07:00, 14:00 y 21:00 (hora de RD): cuatro veces al día |
| Formato OCDS | Existen `/ocds/releases` y `/ocds/releases/all` (OCDS nativo) |

**Sin verificar todavía:** la forma exacta de la respuesta (`models.ApiResponse` no está en el archivo leído), si hay límite efectivo distinto del declarado, y el comportamiento real ante 429. Se verifica con una primera llamada única, ya con el contacto en el `User-Agent`.

**Propuesta (no decidida):** carga inicial por `/tablas/*` CSV (histórico desde 2018) e incremental diario con `/procesos?startdate=…&enddate=…` en una sola ventana corta, usando `PoliteClient`. Siguen abiertos: el contacto institucional del `User-Agent` (SG-05), fijar N con conteos reales y la opinión del abogado sobre la licencia.

## T-SRC-01 — primera llamada real a la API DGCP (2026-11-16)

Una sola solicitud `GET /procesos?limit=5` con `User-Agent` genérico `AviTech-Ingest/0.1` (sin contacto: el correo del propietario no se envía hasta que él lo configure en `INGEST_CONTACT`).

| Aspecto | Resultado |
|---|---|
| Estado | HTTP 200, `application/json`, **sin autenticación** |
| Límite | Cabeceras `x-ratelimit-limit: 60`, `x-ratelimit-remaining: 59`, `x-ratelimit-reset: 60` (coincide con los términos) |
| Envelope | `{ code, hasError, payload: { content[] }, page, limit, totalResults, pages }` |
| Volumen | **`totalResults` = 645 276 procesos** (todo el histórico disponible); a 1000 por página son 646 páginas |
| Campos por proceso | `codigo_proceso`, `codigo_unidad_compra`, `unidad_compra`, `modalidad`, `titulo`, `descripcion`, `estado_proceso`, `divisa`, `monto_estimado`, `fecha_publicacion`, `fecha_enmienda`, `fecha_fin_recepcion_ofertas`, `fecha_apertura_ofertas`, `url`, indicadores MIPYME/SNIP y otros |
| Fechas | ISO 8601 con `Z` (UTC) |
| Estados vistos | Solo «Proceso publicado» (**la lista completa de estados es desconocida**); modalidades vistas: «Contratación Menor», «Comparación de Precios» |

**Implementado (inactivo):** `src/lib/ingest/dgcp.ts` valida la respuesta con zod, mapea a la forma de `public_tenders`, **no inventa estados** (lo no visto queda `unknown` con bandera), cuenta los elementos inválidos, y recorre páginas por ventana de fechas a través de `PoliteClient`. **No escribe en la base** y `sources.is_active` sigue en `false`.

**Siguen abiertos:** (a) lista real de `estado_proceso`; (b) contratos (`/contratos`) y proveedores aún sin mapear; (c) fijar N con el reparto real por año; (d) abogado sobre la licencia; (e) un worker con credenciales de servidor que persista los datos, solo cuando se active la fuente.
