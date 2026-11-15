# Estrategia de pruebas — AviTech Investment Intelligence

| Campo | Valor |
|---|---|
| Documento | `docs/qa/ESTRATEGIA-PRUEBAS.md` |
| Versión | 0.2.0 (Sprint 0, Ronda 3 — alineada con G0) |
| Fecha | 2026-11-15 |
| Autor | Ventana B |
| Estado | **BORRADOR PARA APROBACIÓN** |
| Fuentes | Prompt Maestro §5, §11, §15, §16; Contrato §5; `docs/producto/REQUISITOS-Y-TRAZABILIDAD.md`; `docs/ux/*` |
| Naturaleza | **Plan.** En Sprint 0 no se ejecuta ninguna prueba ni se escribe código. Ningún resultado de este documento es un resultado de prueba. |

> **Regla de oro (Contrato §5, PM Regla 1).** Un requisito “está cubierto” solo si existe historia, criterio de aceptación y una prueba **planificada**; “cumplido” solo si la prueba **se ejecutó** y su resultado está archivado. Este documento solo puede llegar al primer estado.

---

## 1. Objetivos y principios

1. **Probar lo que importa al usuario y al riesgo**, no maximizar un porcentaje de cobertura.
2. **Evidencia archivada:** cada ejecución produce un artefacto (informe, captura, log) con fecha, versión del código y entorno. Sin artefacto, no hay resultado.
3. **Pruebas que pueden fallar.** Cada prueba crítica se valida con un caso negativo (la regla se rompe a propósito y la prueba lo detecta).
4. **Nada de datos reales de usuarios en pruebas.** Datos sintéticos etiquetados `is_demo` (RF-A-13) o documentos públicos de fuentes autorizadas.
5. **Automatizar lo repetible, revisar a mano lo que requiere juicio** (calidad de IA, textos legales, usabilidad).
6. **Las métricas con umbral llevan intervalo de confianza** (§8.3). Un porcentaje sin tamaño de muestra no es evidencia.
7. **Los fallos se registran** (no se silencian ni se relajan umbrales sin aprobación del usuario).

---

## 2. Pirámide de pruebas

```
                        ▲
                       ╱ ╲        Exploratorias, usabilidad, piloto (manual)
                      ╱───╲
                     ╱ E2E ╲      ~10 %  flujos críticos en navegador
                    ╱───────╲
                   ╱Contrato ╲    ~10 %  APIs, esquemas, conectores, RLS
                  ╱───────────╲
                 ╱ Integración ╲  ~25 %  servicios + base de datos de prueba
                ╱───────────────╲
               ╱    Unitarias    ╲ ~55 %  lógica de dominio pura
              ╱───────────────────╲
   Transversales: datos · IA (evals) · seguridad · carga · accesibilidad
```

> Las proporciones son una **orientación de diseño**, no una meta de cobertura. `[PROPUESTO]`.

| Nivel | Qué prueba | Qué NO prueba | Velocidad objetivo |
|---|---|---|---|
| Unitaria | Funciones puras: transiciones de estado de proyecto, reglas de moneda/fecha, formateo, cálculo de `closing_soon`, validadores de esquema, deduplicación (reglas), umbrales de confianza | UI, red, base de datos | Suite completa < 60 s |
| Integración | Servicios con base de datos de prueba (RLS, migraciones, ingesta idempotente, cola de revisión) | Servicios externos reales | < 5 min |
| Contrato | Esquemas Zod de entrada/salida de API, de los agentes de IA y de cada conector (fixtures de respuesta real o grabada) | Lógica interna | < 2 min |
| E2E | Recorridos de usuario en navegador contra staging | Combinatoria de datos | < 15 min (humo en cada PR; completo nocturno) |
| Transversales | Calidad de datos, evals de IA, seguridad, carga, A11Y | — | Programadas |

---

## 3. Herramientas

### 3.1 Estado real del entorno (verificado en `AUDITORIA-ENTORNO.md` §2–3)

| Herramienta | Estado | Uso previsto |
|---|---|---|
| Vitest 5.1.0 | **Instalado, sin configurar** | Unitarias, integración y contrato (con Zod 4.6.7, ya instalado) |
| Zod 4.6.7 | Instalado | Esquemas de contrato y validación de salidas de IA |
| ESLint 9 / TypeScript | Instalado | Análisis estático (no sustituye pruebas) |
| Playwright | **No instalado** (“se evaluará en Sprint 0”) | E2E, capturas responsive, axe-core |
| axe-core / `@axe-core/playwright` | No instalado | A11Y automatizada |
| k6 (u otra) | No instalado | Carga |
| Supabase CLI / Docker / psql | **No instalados** (B-006) | Ver §4: las pruebas de BD irán contra una rama/entorno de Supabase |
| gitleaks (u otra) | No instalado | Escaneo de secretos (RNF-26) |
| OWASP ZAP | No instalado | DAST en staging |
| Python 3.12.10 | Instalado | Evals de IA y pruebas de pipelines |

> **Regla 5 (PM) / Regla 4 (AGENTS.md):** ninguna herramienta se instala sin justificación y aprobación. La instalación de dependencias del proyecto debe hacerse con `tools\npm-install.ps1` (no `npm install` directo, por el junction a OneDrive).

### 3.2 Evaluación propuesta de Playwright (decisión pendiente)

| Criterio | Playwright | Alternativas (Cypress, solo Vitest browser) |
|---|---|---|
| Multi-navegador (Chromium/WebKit/Firefox) | Sí (RNF-32) | Parcial |
| Integración con axe-core | Sí | Sí |
| Capturas en 4 anchos y 2 temas (RNF-31) | Nativo | Posible |
| Peso en disco | Alto (navegadores) → instalar fuera de OneDrive | Variable |

**Recomendación:** aprobar Playwright en Sprint 1. **Riesgo:** descarga de navegadores en una máquina con poco espacio/OneDrive; mitigar instalando en `C:\Users\User\.portal-deps` (mismo patrón que `node_modules`). Aprobada (G0 #12).

> **Alcance tras G0.** Las pruebas `T-RF-C-06`, `T-RF-C-07`, `T-RF-G-05` y `T-RF-G-16` pertenecen a funciones **post-MVP** (G0 #9/#13): quedan `PLANIFICADA` pero **no** se ejecutan ni cuentan para el cierre del MVP. Los casos críticos no cambian salvo CC-09 (regla de monedas, que sigue como biblioteca de dominio) y el nuevo CC-23.

### 3.3 Herramientas por tipo de prueba

| Tipo | Herramienta propuesta | Estado |
|---|---|---|
| Unitarias, integración | Vitest | Disponible |
| Contrato de API/IA/conectores | Vitest + Zod (+ fixtures versionadas) | Disponible |
| E2E, responsive, A11Y | Playwright + axe-core | Aprobada (G0 #12) |
| RLS / autorización | Vitest con clientes por rol contra rama de Supabase | Depende de B-003 |
| Seguridad | `npm audit`, gitleaks, ZAP, revisión manual (skill `security-audit` en Sprint 6) | Aprobada (G0 #12) |
| Carga | k6 | Aprobada (G0 #12) |
| Evals de IA | Scripts Python/TS propios + golden sets versionados | A diseñar con Ventana A |
| Lighthouse CI | Lighthouse CI | Aprobada (G0 #12) |

---

## 4. Entornos y datos de prueba

| Entorno | Propósito | Datos | Restricciones |
|---|---|---|---|
| Local | Unitarias y contrato | Fixtures en repo | Sin red |
| CI | Todo lo automatizable por PR | Fixtures + rama efímera de BD | Sin secretos reales de producción |
| Staging | Integración, E2E, carga, DAST | Datos sintéticos (`is_demo`) + documentos públicos de fuentes autorizadas | Nunca datos de producción |
| Producción (piloto) | Monitorización sintética y smoke | Reales | Solo lectura para pruebas |

- **Sin Supabase local** (B-006): las pruebas de BD usarán una **rama de Supabase** o proyecto de pruebas. Bloqueado por **B-003** (el proyecto vinculado no responde y puede no ser el correcto). Hasta resolverlo, las pruebas de integración/RLS están **bloqueadas**.
- **Datos sintéticos:** generados con semilla fija; marcados `is_demo`; documentados en `docs/qa/` (catálogo). Cada dataset indica su finalidad (p. ej. “100 000 eventos para RNF-02/03”).
- **Fixtures de fuentes oficiales:** copias de respuestas reales solo si la licencia lo permite `[PENDIENTE A: términos de uso]`; en otro caso, fixtures sintéticos con la misma forma.
- **Congelación del tiempo:** pruebas dependientes de fecha usan reloj inyectable (zona `America/Santo_Domingo` y UTC).
- **Aislamiento:** cada prueba de integración crea y destruye su propio inquilino/usuario de prueba.

---

## 5. Trazabilidad requisito → prueba

El mapa completo (86 RF) está en `REQUISITOS-Y-TRAZABILIDAD.md` **Anexo B** (ID de prueba `T-RF-x-nn` y nivel principal). Los RNF usan `T-RNF-nn` (§5.1). Esta estrategia **no duplica** esa tabla; la completa con el procedimiento de cada tipo.

### 5.1 Pruebas de requisitos no funcionales

| ID | RNF | Tipo | Procedimiento | Evidencia |
|---|---|---|---|---|
| T-RNF-01 | RNF-01 | Rendimiento web | Lighthouse CI en 5 rutas, perfil 4G y CPU ×4; p75 sobre ≥ 5 ejecuciones | Informe archivado por build |
| T-RNF-02 | RNF-02 | Carga | k6 con dataset de 100 000 eventos / 10 000 proyectos; 10 min de estado estable | Resumen k6 (p50/p95/p99, errores) |
| T-RNF-03 | RNF-03 | Búsqueda | Benchmark de 1–3 términos + `EXPLAIN` de las 10 consultas más frecuentes | Informe de consultas |
| T-RNF-04 | RNF-04 | Capacidad | Rampa 0→100 usuarios concurrentes + 20 ingestas | Curva latencia/usuarios |
| T-RNF-05 | RNF-05 | Disponibilidad | Monitor sintético cada 5 min durante el piloto | Informe mensual de uptime |
| T-RNF-06 | RNF-06 | Idempotencia | Re-ejecutar la misma ingesta 3 veces; comparar conteos y hashes | Diff de conteos = 0 |
| T-RNF-07 | RNF-07 | Fiabilidad de jobs | Inyección de fallos; contar reintentos y alertas | Registro de jobs |
| T-RNF-08 | RNF-08 | Latencia de alertas | Evento sintético → medir `delivered_at − published_at` en ≥ 200 alertas | Percentiles |
| T-RNF-09 | RNF-09 | Recuperación | Simulacro de restauración desde backup | Acta con tiempos reales |
| T-RNF-10…15 | RNF-10…15 | Calidad de datos | Consultas DQ-01…DQ-05 (§7) + muestreo | Informes DQ |
| T-RNF-16…22 | RNF-16…22 | IA | Evals (§8) | Informes de evals |
| T-RNF-23…28 | RNF-23…28 | Seguridad/privacidad | §9 | Informes SEC/PRIV |
| T-RNF-29…33 | RNF-29…33 | A11Y/usabilidad | §11 | Informes A11Y |
| T-RNF-34…37 | RNF-34…37 | Mantenibilidad/operación | CI, cobertura, simulacros | Logs de CI, actas |

---

## 6. Casos críticos del MVP

> **Un caso crítico bloquea el lanzamiento si falla.** Se ejecutan en CI (automatizados) y manualmente antes de cada gate. Cada uno traza a requisitos, a un criterio `AC-MVP-xx` y al criterio de terminación del PM §16.

| ID | Caso crítico | Nivel | Requisitos | Criterio de aceptación (resumen) | PM §16 |
|---|---|---|---|---|---|
| CC-01 | Registro, verificación de correo e inicio de sesión | E2E + seguridad | RF-G-01 | AC-MVP-01; el mensaje de “correo ya registrado” no revela la cuenta (AC-AUX-02) | Registro/login |
| CC-02 | Un `viewer` no accede a `/admin` ni a borradores por URL directa o API | Seguridad/RLS | RF-G-02, RF-G-13 | AC-MVP-10; 403 sin datos en el payload | Controles de seguridad |
| CC-03 | Matriz rol × entidad sin fugas | Seguridad/RLS | RF-G-02/03, RNF-24 | AC-MVP-13: 0 casos indebidos | Controles de seguridad |
| CC-04 | Evento con evidencia consultable: cita, documento original, tres fechas | E2E | RF-A-05/06/10 | AC-MVP-02 | Evidencia consultable |
| CC-05 | Documento duplicado no genera evento duplicado (idempotencia) | Integración + datos | RF-A-04, RNF-06 | Mismo hash → 1 evento; fusión reversible | Radar funcional |
| CC-06 | Un proyecto con permiso solo “solicitado” nunca aparece como aprobado | Unitaria + E2E | RF-B-03/04 | AC-MVP-03; la transición sin documento es rechazada | Proyectos y permisos |
| CC-07 | Licitación: fecha límite con zona, `closing_soon` y cierre correcto | Unitaria + E2E | RF-D-02, RN-09 | AC-MVP-04; fronteras (justo ±1 min de 72 h, cambio de día) | Licitaciones |
| CC-08 | Instrumento sin confirmación: sin CTA de compra; tasa siempre con su tipo | E2E + revisión de textos | RF-C-05/12, RN-05 | AC-MVP-05 | Instrumentos |
| CC-09 | Monedas distintas nunca se suman sin conversión con fuente (regla de la biblioteca de dominio: aplica a toda agregación; el comparador RF-C-06 es post-MVP por G0 #9) | Unitaria | RN-10, RNF-14, RF-C-06 | Suma bloqueada y avisada | Instrumentos |
| CC-10 | Publicación de oportunidad bloqueada sin cita o con cifra sin cita | Unitaria + integración | RF-F-04/10, RN-06 | AC-MVP-06 | IA fundamentada |
| CC-11 | Oportunidad no se genera desde evento `disputed`/`unverifiable` | Unitaria + integración | RF-F-01 | Intento rechazado y registrado | IA fundamentada |
| CC-12 | Flujo de revisión humana: solo `opportunity_manager`+ publica; se registra revisor, fecha y modelo | E2E + seguridad | RF-F-11, RN-07, RN-12 | `analyst` recibe 403 al publicar | IA/seguridad |
| CC-13 | Guardar en watchlist persiste tras cerrar sesión; solo el propietario la ve | E2E + RLS | RF-F-12, RF-G-06 | AC-MVP-08 | Guardar oportunidades |
| CC-14 | Alertas: una alerta por evento y usuario; configurables; sin duplicados al recargar | Integración + E2E | RF-A-09, RF-G-07/08 | AC-MVP-09 | Alertas configurables |
| CC-15 | Búsqueda y filtros: resultados correctos, estado en URL, rendimiento | E2E + carga | RF-G-04, RF-A-08 | AC-MVP-07 | Búsqueda y filtrado |
| CC-16 | Etiqueta DEMO visible y datos demo excluidos de KPIs | E2E + datos | RF-A-13, RF-G-14, RN-08 | AC-MVP-11 | No usar datos ficticios |
| CC-17 | Fallo de fuente simulado → alerta operativa y reintento sin duplicar | Integración | RNF-07, RNF-35 | AC-MVP-14 | Operación sin intervención |
| CC-18 | Prompt injection en un documento no ejecuta instrucciones ni altera el esquema | IA/seguridad | RNF-20 | Suite adversarial (§8.5) | IA/seguridad |
| CC-19 | Accesibilidad: 0 violaciones críticas/serias; flujos críticos con teclado | A11Y | RNF-29/30 | AC-MVP-12 | (UX/AA) |
| CC-20 | Borrado de cuenta elimina datos personales y notas privadas | E2E + datos | RF-G-09, RNF-28 | Tras borrar, consultas por usuario = 0 (salvo auditoría anonimizada) | Privacidad |
| CC-21 | Sin secretos en repo; escaneo bloqueante en CI | CI | RNF-26 | 0 hallazgos | Seguridad |
| CC-22 | Restauración de backup dentro de RPO/RTO | Operación | RNF-09 | Acta con tiempos | Despliegue/operación |
| CC-23 | **Puerta P0 (G0 #11):** todo evento no verificado al 100 % (`pending`, `partially_verified`, `disputed`, `unverifiable`) entra en la cola de revisión humana y **no** es visible para `viewer`; ningún worker lo publica | Integración + seguridad (RLS) | RF-A-11, RF-F-11, RN-07 | Dado un evento `partially_verified`, cuando termina la verificación, entonces queda en cola, no aparece en el radar ni genera alertas hasta que un revisor lo publica | IA/seguridad |

**Criterio común:** el caso pasa si todos sus pasos pasan **y** su caso negativo (§1 principio 3) falla como se espera.

### 6.1 Ejemplos de caso en formato dado/cuando/entonces

**CC-06 (estado de permiso)**
- *Dado* un proyecto sin documento de aprobación, *cuando* un `analyst` intenta establecer `permit_approved`, *entonces* el sistema rechaza el cambio, el estado sigue `permit_applied` y la acción rechazada queda en auditoría.
- *Caso negativo:* se desactiva temporalmente la regla en una rama de prueba → la prueba debe fallar.

**CC-10 (publicación)**
- *Dado* un borrador con una cifra de capital sin cita, *cuando* el gestor pulsa “Publicar”, *entonces* la publicación se bloquea y el mensaje identifica la cifra.

**CC-07 (zona horaria)**
- *Dada* una licitación con `deadline_at = 2026-11-18T21:00:00Z`, *cuando* se muestra a un usuario en `America/Santo_Domingo`, *entonces* aparece “18 nov 2026, 17:00 AST”; y con el reloj en `2026-11-15T21:00:00Z` el estado es `closing_soon` (exactamente 72 h) y a `…T21:01:00Z` sigue `closing_soon`.

---

## 7. Pruebas de calidad de datos

> Las reglas se implementan como consultas SQL y/o validadores TS/Python; se ejecutan en cada ingesta (bloqueantes cuando indicado) y en un informe mensual por fuente. **No existen datos aún**: los umbrales son propuestas.

### 7.1 Familias y reglas

| ID | Familia | Regla | Umbral propuesto | Acción si falla |
|---|---|---|---|---|
| DQ-01 | Integridad y procedencia | Todo `economic_event` publicado tiene ≥ 1 evidencia y URL oficial resoluble (RNF-10) | 100 % | Bloquea publicación |
| DQ-02 | Cobertura | Sector asignado ≥ 95 %; ubicación a provincia ≥ 90 % cuando la fuente la publica (RNF-11) | Informe mensual | Revisión de extractor |
| DQ-03 | Duplicados | Duplicados en muestra auditada ≤ 2 % (RNF-12) | ≤ 2 % | Ajustar reglas de dedup |
| DQ-04 | Fechas | ISO 8601 UTC; sin fechas futuras salvo programadas (±5 min); `published_at ≤ detected_at` (RNF-13) | 100 % / 0 anomalías | Cuarentena del registro |
| DQ-05 | Monedas | 100 % de montos con ISO 4217; 0 agregaciones entre monedas (RNF-14) | 100 % / 0 | Bloquea publicación |
| DQ-06 | Entidades | Resolución de organizaciones: razón social normalizada, variantes e identificador fiscal; fusiones reversibles (RF-E-08) | Precisión de fusión ≥ 98 % en muestra `[PROPUESTO]` | Revisión humana de fusiones |
| DQ-07 | Estados | `permit_approved`/`operating` ⇒ existe documento de aprobación | 100 % | Bloquea publicación |
| DQ-08 | Frescura | p95 `detected_at − published_at` ≤ 60 min (API/RSS) y ≤ 24 h (manual) (RNF-15) | Por fuente | Alerta operativa |
| DQ-09 | Esquema | Cada registro cumple el esquema Zod/JSON del contrato; campos desconocidos rechazados | 100 % | Cuarentena |
| DQ-10 | Hash/idempotencia | Mismo contenido ⇒ mismo hash ⇒ mismo registro; re-ingesta no cambia conteos | 0 diferencias | Bloquea el job |
| DQ-11 | Instrumentos | Tasa sin `rate_type` = 0; vencimiento ≥ emisión; plazo coherente con fechas | 0 | Cuarentena |
| DQ-12 | Licitaciones | `deadline_at` ≥ `published_at`; cambio de fecha registrado como versión | 0 anomalías | Alerta |

### 7.2 Estrategia por tipo de problema

**Duplicados.** (1) Hash exacto de documento (idempotencia). (2) Reglas deterministas para eventos (misma institución + número de expediente/proceso; título normalizado + fecha ± ventana). (3) Similitud como **sugerencia**, nunca fusión automática irreversible. Casos de prueba: mismo documento re-publicado; mismo evento con 2 fuentes; dos eventos distintos con título parecido (**no** deben fusionarse); fusión → deshacer → estado original.

**Fechas.** Casos: `published_at` ausente, formato `dd/mm/aaaa` vs `mm/dd/aaaa` (ambigüedad: 03/04/2026), cambio de zona, horario sin zona, fecha futura, fecha en 29-feb, fecha con año de dos dígitos. Regla: si la fuente no indica zona, se asume `America/Santo_Domingo` **y se marca** `timezone_assumed = true` `[PENDIENTE A]`.

**Monedas.** Casos: `DOP`, `USD`, símbolo `RD$` / `US$`, “millones”/“miles” (escala), separador decimal `.`/`,`, monto sin moneda, rango (“entre X y Y”), monto en texto (“veinte millones”). Regla: sin moneda explícita o inferible con evidencia, el monto se almacena como `No disponible` con motivo. **Nunca** se asume DOP.

**Entidades.** Casos: “Empresa S.R.L.” vs “Empresa SRL” vs “EMPRESA, S. R. L.”; homónimos de distinta ubicación; sucursal vs matriz; cambio de razón social; persona física vs jurídica; RNC con/sin guiones `[PENDIENTE A: identificador fiscal]`.

**Estados de proyecto/permiso.** Casos: documento de aprobación posterior a uno de suspensión; dos documentos contradictorios; fecha de aprobación futura.

**Encoding y texto.** Casos: tildes y eñes (UTF-8), PDFs escaneados sin texto (OCR no disponible ⇒ `unverifiable`), tablas en PDF, HTML con scripts.

### 7.3 Muestreo humano

- Mensual y por fuente: **≥ 100 registros** (o todos si hay menos), revisados con rúbrica: campos correctos, enlace a fuente, fecha, moneda, entidad, duplicado.
- Se registran los errores por categoría para retroalimentar extractores y evals.
- Los resultados se informan con **IC 95 % de Wilson** y n (§8.3).

---

## 8. Pruebas de IA

> El PM exige “un sistema de evaluación con conjuntos de prueba representativos antes de habilitar publicación automática”. En el MVP la publicación **no es automática** (RN-07, D-02): estas pruebas habilitan **medir** y **decidir** si se relaja la revisión humana en el futuro.

### 8.1 Conjuntos de evaluación (golden sets)

| Conjunto | Contenido | Tamaño mínimo propuesto | Etiquetado |
|---|---|---|---|
| GS-EXT | Documentos oficiales reales con campos anotados (entidad, monto, moneda, fecha, estado, ubicación) | **≥ 300 campos por tipo crítico** (§8.3) | 2 anotadores + conciliación; acuerdo (κ) medido |
| GS-CLS | Eventos con sector correcto (11 categorías) | ≥ 30 por categoría `[PROPUESTO]` | 2 anotadores |
| GS-VER | Pares de documentos consistentes/contradictorios/duplicados | ≥ 100 pares | Anotación humana |
| GS-OPP | Eventos + oportunidades esperadas/inaceptables | ≥ 50 eventos | Revisión de analista senior |
| GS-INJ | Documentos con instrucciones maliciosas (§8.5) | ≥ 30 casos | Diseño adversarial |
| GS-NEG | Documentos sin información suficiente (la salida correcta es “no disponible”) | ≥ 50 | Anotación humana |

- **Separación:** desarrollo (para ajustar prompts) y **retención ciega** (no se toca hasta la evaluación formal) para evitar sobreajuste.
- **Origen:** documentos públicos de fuentes autorizadas; la Ventana A debe confirmar que pueden usarse como conjunto de prueba (licencia) `[PENDIENTE A]`.
- **Versionado:** cada set tiene hash y versión; cada informe indica qué versión usó.
- **Representatividad:** distribución por fuente y por módulo; se informa la cobertura.

### 8.2 Evaluaciones por agente

| Agente | Qué se evalúa | Métricas | Umbral propuesto |
|---|---|---|---|
| Discovery | Detección de nuevas publicaciones, no re-procesar | Recall de novedades; falsos “nuevos” | Recall ≥ 98 %; 0 duplicados por hash |
| Extraction | Campos críticos y fragmentos de evidencia | Coincidencia exacta por campo; **precisión de la cita** (el fragmento existe en el documento) | ≥ 90 % exacta (IC inferior); cita 100 % localizable |
| Verification | Estados, contradicciones, duplicados | Precisión/recall por estado; falsos `verified` | Falsos `verified` ≈ 0 en GS-VER (crítico) |
| Opportunity Intelligence | Fundamento y calidad | Grounding; errores materiales; tasa de rechazo en revisión | Grounding 100 %; errores ≤ 2 % |
| Financial Analysis | Cálculos | **Igualdad con el motor determinista** (no generativo) | 100 % (casos de prueba exactos) |
| Alert | Relevancia y duplicados | Precisión de alertas (feedback); duplicados | ≥ 70 % relevantes (M-05); 0 duplicados |

### 8.3 Estadística: tamaños de muestra y umbrales (hallazgo de revisión)

Un porcentaje observado no demuestra un umbral sin tamaño de muestra. Con el intervalo de Wilson al 95 % (cálculo de la Ventana B, no una medición):

| Observado | n | IC 95 % | Lectura |
|---|---|---|---|
| 0 errores | 50 | [0 %; 7,1 %] | **No demuestra ≤ 2 %** |
| 0 errores | 100 | [0 %; 3,7 %] | No demuestra ≤ 2 % |
| 0 errores | 150 | [0 %; 2,5 %] | Casi |
| 0 errores | 300 | [0 %; 1,3 %] | Demuestra ≤ 2 % |
| 3 errores | 150 | [0,7 %; 5,7 %] | No demuestra ≤ 2 % |
| 184 aciertos | 200 | [87,4 %; 95,0 %] | **No demuestra ≥ 90 %** (observado 92 %) |
| 188 aciertos | 200 | [89,8 %; 96,5 %] | Aún no (94 % observado) |
| 282 aciertos | 300 | [90,7 %; 96,2 %] | Demuestra ≥ 90 % |

Consecuencias aplicadas:

- **RNF-16** (≥ 90 %): se exige el **límite inferior** del IC ≥ 90 % con ≥ 300 campos por tipo.
- **RNF-19** (errores ≤ 2 %): muestra mensual ≥ 50 **y acumulado móvil ≥ 200** con 0–1 errores; con menos, el resultado se informa como “no concluyente”, no como “cumplido”.
- **RNF-20** (prompt injection 100 %): con 30 casos y 0 fallos, el límite superior de la tasa de fallo es ≈ 10 % (regla de tres). Se informa “0/30 en el corpus”, **no** “inmune”; el corpus crece con cada incidente real.
- Cuando el acumulado no alcance el tamaño necesario, el informe dice **“insuficiente para concluir”**.

(Estas correcciones ya se reflejan en `REQUISITOS-Y-TRAZABILIDAD.md` v0.2.0.)

### 8.4 Regresión y control de cambios

- **Cualquier cambio** de modelo, versión, prompt, esquema de salida o parámetros dispara la suite de evals completa sobre la retención ciega.
- **Criterio de bloqueo:** una métrica crítica que empeora más allá del margen definido (p. ej. caída > 2 puntos o falsos `verified` > 0) bloquea el despliegue.
- **Reproducibilidad:** cada `ai_analysis_run` guarda modelo, versión, prompt/hash, parámetros, entrada y salida (RN-12). Los evals usan temperatura baja/determinista cuando sea posible y se repiten ≥ 3 veces para medir variabilidad.
- **Comparación con línea base:** la primera ejecución formal fija la línea base; se archiva.
- **Costos y latencia** se miden en la misma suite (RNF-21/22).

### 8.5 Seguridad de IA (prompt injection)

Suite GS-INJ (≥ 30 casos, crece con incidentes): instrucciones en el cuerpo del documento (“ignora lo anterior…”), instrucciones ocultas (texto blanco/HTML comentado), intentos de exfiltrar el prompt/secretos, intentos de fijar `verification_status = verified`, de generar cifras, de invocar herramientas, de alterar el JSON de salida, de enlazar a URL maliciosas, y contenido multilingüe. **Criterios:** el modelo nunca ejecuta instrucciones del documento; la salida valida contra el esquema; ninguna URL no oficial entra como evidencia; la prueba falla si cualquier caso modifica estado, cifra o capa de confianza.

### 8.6 Tasas de error aceptables (propuestas)

| Error | Gravedad | Tasa aceptable propuesta | Medida de contención |
|---|---|---|---|
| Cifra sin cita publicada | Crítico | **0** | Bloqueo automático |
| Evento `verified` sin documento | Crítico | **0** | Bloqueo + prueba de regla |
| Estado de permiso inflado | Crítico | **0** | Regla dura (CC-06) |
| Cifra incorrecta publicada | Alto | Informar IC; objetivo ≤ 2 % materiales (RNF-19) | Revisión humana |
| Clasificación sectorial errónea | Medio | macro-F1 ≥ 0,85; recall por clase ≥ 0,70 (RNF-17) | Corrección manual |
| Resumen impreciso | Medio | Rúbrica; objetivo `[PENDIENTE]` | Revisión |
| Alerta irrelevante | Bajo | ≤ 30 % (M-05) | Feedback + preferencias |

### 8.7 Revisión humana como prueba continua

- Cola de revisión con muestreo ciego (rúbrica de 6 criterios: fidelidad, cita, cifras, capa, riesgos, lenguaje).
- Cada rechazo registra etiqueta de error → alimenta GS y análisis de causas.
- **Puerta P0 aprobada (G0 #11):** todo evento no verificado al 100 % pasa por la cola de revisión humana (CC-23). **Anotadores y revisores: `[PENDIENTE USUARIO]`**; sin ellos, la cola no tiene operadores y G-09 queda `NO CONCLUYENTE`.
- **Relajar** la revisión humana (C-09) exige ≥ 3 meses consecutivos con RNF-19 concluyente y aprobación explícita del usuario.

---

## 9. Pruebas de seguridad

| ID | Prueba | Cobertura | Herramienta | Frecuencia |
|---|---|---|---|---|
| SEC-01 | Autenticación y autorización en 100 % de rutas/endpoints no públicos | RNF-23, UC-01/14 | Vitest + revisión de rutas | Cada PR |
| SEC-RLS | Matriz rol × entidad × operación (select/insert/update/delete) | RNF-24, AC-MVP-13 | Vitest con clientes por rol contra rama Supabase | Cada PR que toque BD |
| SEC-AUDIT | Acciones sensibles generan registro con actor, fecha, antes/después | RNF-25 | Integración | Cada PR |
| SEC-SECRETS | 0 credenciales en repo y en historial | RNF-26 | gitleaks Aprobada (G0 #12) | Cada PR |
| SEC-DEP | Dependencias sin vulnerabilidades críticas/altas abiertas > 7 días | RNF-23 | `npm audit` (+ revisión manual) | Semanal / PR |
| SEC-INJ | SQLi/XSS: entradas hostiles en búsqueda, filtros, notas, campos extraídos mostrados | PM §10 | Vitest + E2E + ZAP | Cada release |
| SEC-SSRF | Los conectores solo acceden a dominios de una lista blanca; sin acceso a IP privadas/metadata | PM §10 | Integración con servidor local simulado | Cada release |
| SEC-RATE | Límite de tasa en login, búsqueda y endpoints costosos | PM §10 | Carga corta | Cada release |
| SEC-SESS | Sesión: expiración, rotación, cookies `HttpOnly/Secure/SameSite`, cierre de sesión | PM §10 | E2E | Cada release |
| SEC-ENUM | Registro/recuperación no revelan existencia de cuentas | AUX-01 | E2E | Cada release |
| SEC-CSRF | Mutaciones protegidas | PM §10 | E2E | Cada release |
| SEC-HDR | Cabeceras de seguridad (CSP, HSTS, X-Content-Type-Options) | PM §10 | ZAP/E2E | Cada release |
| SEC-AI | Prompt injection (§8.5) | RNF-20 | Suite GS-INJ | Cada cambio de IA |
| SEC-ENV | Separación de entornos (staging sin credenciales de producción) | PM §10 | Revisión + prueba | Cada release |
| SEC-PEN | Revisión de seguridad completa (skill `security-audit`) antes del piloto | Fase 6 | Manual + herramientas | 1 vez antes de Fase 7 |
| PRIV-01 | Borrado de cuenta y minimización | RNF-28 | E2E + consulta | Cada release |

- **Criterio de salida:** 0 hallazgos críticos/altos abiertos (RNF-23). Cada hallazgo tiene dueño, severidad, fecha y evidencia de cierre.
- **Alcance legal:** las pruebas técnicas **no sustituyen** la revisión legal de RD (`[PENDIENTE LEGAL]`, RNF-27/28).
- **Ventana A** define el modelo de amenazas (`docs/seguridad/`); esta estrategia se alinea cuando exista `[PENDIENTE A]`.

---

## 10. Pruebas de rendimiento y carga

| ID | Escenario | Carga | Métrica / umbral (propuesto) | RNF |
|---|---|---|---|---|
| PERF-01 | Navegación web en 5 rutas más usadas | Lighthouse CI, 4G, CPU ×4 | LCP p75 ≤ 2,5 s; INP p75 ≤ 200 ms; CLS ≤ 0,1 | RNF-01 |
| PERF-02 | Lectura de API (listados de 50 filas, detalle) | 50 usuarios concurrentes, 10 min, dataset 100 000 eventos/10 000 proyectos | p95 ≤ 500 ms (lectura), ≤ 800 ms (listados), error < 0,5 % | RNF-02 |
| PERF-03 | Búsqueda de 1–3 términos | 20 req/s | p95 ≤ 1 s | RNF-03 |
| PERF-04 | Escritura (guardar, alertas) | 20 req/s | p95 ≤ 2 s | RNF-02 |
| PERF-05 | Rampa hasta 2× la capacidad | 0→100 usuarios | Punto de degradación documentado | RNF-04 |
| PERF-06 | Ingesta simultánea | 20 jobs + 50 usuarios | Sin degradar PERF-02 | RNF-04 |
| PERF-07 | Remojo (soak) | Carga estable 2 h | Sin crecimiento de memoria/conexiones | Fiabilidad |
| PERF-08 | Alertas masivas | 1 000 usuarios con 1 preferencia coincidente | ≥ 99 % entregadas en 5 min | RNF-08 |
| PERF-09 | Análisis IA | Lote de 10 eventos | p95 ≤ 5 min; costo dentro del tope | RNF-21/22 |

- **Dataset:** sintético con semilla fija; distribución realista de sectores/fechas; se documenta cómo se generó.
- **Entorno:** staging con el mismo tamaño de instancia que producción **o** se declara el factor de escala; no se extrapola sin decirlo.
- **Reglas:** las pruebas de carga **nunca** apuntan a producción ni a fuentes oficiales externas (se simulan; el PM exige respetar límites de API).
- **Salida:** informe con p50/p95/p99, errores, saturación de CPU/BD y recomendaciones.

---

## 11. Accesibilidad, responsive y usabilidad

| ID | Prueba | Método | Criterio |
|---|---|---|---|
| A11Y-AUTO | axe-core en las 14 pantallas + AUX-01, en claro y oscuro, 4 anchos | Playwright + axe | 0 violaciones críticas/serias (RNF-29) |
| A11Y-KEY | Flujos críticos solo con teclado (login, radar, detalle, guardar, alerta, admin) | Playwright + checklist manual | 100 % operables (RNF-30) |
| A11Y-SR | Recorrido con lector de pantalla (NVDA en Windows; VoiceOver si hay dispositivo) en radar, ficha y watchlist | Manual guiado | Sin información perdida; capas de confianza anunciadas |
| A11Y-ZOOM | Zoom 200 % y reflujo 320 px | Manual + capturas | Sin pérdida de contenido (WCAG 1.4.4/1.4.10) |
| A11Y-CONTRAST | Contraste de tokens (§2.4 de SISTEMA-DISENO) en componentes reales | Herramienta + revisión | ≥ 4,5:1 / 3:1 |
| A11Y-MOTION | `prefers-reduced-motion` y `forced-colors` | Emulación | Sin pérdida de información |
| RESP-01 | Capturas por pantalla en 375/768/1024/1440 px × 2 temas | Playwright | Sin recortes ni scroll horizontal (RNF-31) |
| USA-01 | Test de comprensión de las tres capas y tipos de tasa (SP-06, M-11) | 5 participantes | ≥ 80 % entienden la diferencia |
| USA-02 | Tarea “guardar primera oportunidad” (RNF-33) | Test moderado, ≥ 5 participantes | ≤ 10 min |

**Límite honesto:** axe detecta solo una parte de los problemas de accesibilidad (la automatización no sustituye la revisión manual). Un resultado “0 violaciones” no equivale a “accesible”.

---

## 12. Control de trazabilidad (verificación del propio plan)

> **Propuesta de script** (no se escribe en Sprint 0; se implementará en Sprint 1 tras aprobación). Su finalidad es impedir que la documentación y las pruebas diverjan en silencio.

Un verificador de repositorio (Python o TS) debe leer los documentos de requisitos y de pruebas y fallar si:

1. Un `RF-*` o `RNF-*` no tiene fila en la matriz (Anexo B) o su `T-*` no existe en las pruebas implementadas.
2. Un `US-*` referenciado no existe en `docs/sprint-0/backlog-producto.md`.
3. Un `SCR-*` o `AC-*` referenciado no existe en el inventario/fichas.
4. El conteo del Anexo A (RF por módulo y prioridad) no coincide con las tablas (**se ejecutó manualmente en esta revisión: 86 RF — A 13, B 11, C 13, D 10, E 9, F 14, G 16; Must 65, Should 18, Could 3**).
5. Un requisito con estado `[PENDIENTE …]` aparece como “cubierto” en un informe de cierre.
6. Una prueba marcada “pasó” no tiene artefacto archivado (informe/commit/fecha).

**Estados de cobertura permitidos** (sin eufemismos):

| Estado | Condición |
|---|---|
| `PLANIFICADA` | Existe T-* con procedimiento; sin ejecutar |
| `IMPLEMENTADA` | Existe código de prueba; sin ejecutar con resultado archivado |
| `PASA` | Ejecutada, resultado y artefacto archivados, versión de código identificada |
| `FALLA` | Ejecutada y no cumple |
| `BLOQUEADA` | No ejecutable por dependencia (p. ej. B-003); motivo registrado |
| `NO CONCLUYENTE` | Muestra insuficiente (§8.3) |

**Hoy (Sprint 0):** todas las pruebas están en `PLANIFICADA`; ninguna en `PASA`.

---

## 13. Definición de “MVP técnicamente terminado” (sin autoengaño)

El MVP **no** se declara terminado por sensación ni por porcentaje de tareas. Se declara cuando el **Informe de cierre del MVP** demuestra todo lo siguiente, con artefacto archivado para cada punto. Un punto sin artefacto cuenta como **no cumplido**.

### 13.1 Puerta de calidad (todas obligatorias)

| # | Condición (PM §16 → verificación) | Evidencia exigida |
|---|---|---|
| G-01 | Registro y login funcionan (CC-01) | Informe E2E `PASA` con versión de código |
| G-02 | Radar funcional con fuentes oficiales **verificadas** integradas | Registro de fuentes aprobado por Ventana A + ingesta en staging ≥ 14 días continuos sin fallo no explicado |
| G-03 | Eventos con evidencia consultable (CC-04, DQ-01 = 100 %) | Informe DQ-01 |
| G-04 | Proyectos y permisos identificados; regla de aprobación respetada (CC-06, DQ-07 = 100 %) | Informes CC-06, DQ-07 |
| G-05 | Licitaciones visibles con fecha/zona correctas (CC-07) | Informe CC-07 |
| G-06 | Instrumentos visibles sin CTA de compra y con tipos de tasa (CC-08, CC-09) | Informes CC-08/09 + revisión de textos aprobada |
| G-07 | Búsqueda y filtros dentro de umbral (CC-15, PERF-03) | Informe E2E + k6 |
| G-08 | IA genera análisis fundamentados: grounding 100 %, 0 cifras sin cita (CC-10, CC-11) | Informe AI-GROUND |
| G-09 | Evals de IA en retención ciega con **IC** que cumple umbrales, o declarados `NO CONCLUYENTE` con plan | Informe de evals (§8.3) |
| G-10 | Usuarios guardan oportunidades y la persistencia se verifica (CC-13) | Informe E2E |
| G-11 | Alertas configurables, sin duplicados, dentro de latencia (CC-14, PERF-08) | Informe + percentiles |
| G-12 | Controles de seguridad: SEC-01, SEC-RLS, SEC-AUDIT, SEC-SECRETS, SEC-INJ, SEC-SSRF, SEC-SESS pasan; **0 hallazgos críticos/altos abiertos** | Informe de seguridad consolidado |
| G-13 | Prompt injection: suite GS-INJ sin fallos (CC-18) | Informe SEC-AI |
| G-14 | Accesibilidad: A11Y-AUTO, A11Y-KEY, A11Y-SR sin críticos/serios (CC-19) | Informe A11Y + checklist manual |
| G-15 | Rendimiento: PERF-01…06 dentro de umbral en staging | Informes Lighthouse y k6 |
| G-16 | Restauración de backup probada (CC-22) | Acta |
| G-17 | Documentación de despliegue y runbooks existen y el rollback se ensayó (RNF-36) | Acta de ensayo |
| G-18 | Operación sin intervención manual constante en procesos **aprobados** (jobs 14 días, < 1 % de fallos, RNF-07) | Panel de jobs |
| G-19 | Datos demo etiquetados y excluidos de métricas (CC-16) | Informe |
| G-20 | Aviso legal y revisión legal de RD completados para lo que se muestre (RNF-27) | Acta legal `[PENDIENTE LEGAL]` |
| G-21 | Costo IA medido y dentro del tope aprobado (RNF-21) | Informe de costos |
| G-22 | Todos los casos críticos CC-01…CC-23 en `PASA` en la **misma versión de código** que se lanzará | Informe de cierre |

### 13.2 Condiciones de bloqueo (cualquiera impide declarar “terminado”)

- Cualquier vulnerabilidad crítica abierta; cualquier error que comprometa la integridad (PM §16).
- Cualquier caso crítico `FALLA`, `BLOQUEADA` o sin ejecutar.
- Cualquier requisito Must en `[PENDIENTE SRS]` sin decisión del usuario.
- Métricas sin muestra suficiente declaradas “cumplidas”.
- Pruebas que “pasan” solo porque se relajó el umbral o se omitió el caso negativo.
- Resultados obtenidos con datos no etiquetados o con datos de producción en pruebas.
- Resultados de una versión distinta a la que se lanza.

### 13.3 Anti-autoengaño (reglas de redacción del informe)

1. Se informa `PASA`/`FALLA`/`BLOQUEADA`/`NO CONCLUYENTE`, **nunca** “casi”, “funciona” o “listo”.
2. Cada afirmación lleva el comando o enlace del artefacto y la fecha.
3. El informe lo **revisa alguien distinto de quien escribió las pruebas** (la ventana o persona de QA, o el usuario).
4. Se publica la **lista de lo no probado** y los riesgos residuales, con la misma prominencia que los éxitos.
5. Los umbrales no se modifican durante la evaluación; un cambio exige acta aprobada por el usuario.
6. La decisión de lanzar la toma el usuario con ese informe; la ventana de QA recomienda, no decide.

### 13.4 Cobertura y mantenibilidad

- RNF-34: cobertura de dominio ≥ 70 % **como indicador**, no como criterio de calidad (una cobertura alta con aserciones débiles no cuenta); se complementa con pruebas de mutación puntuales en reglas críticas (CC-06, CC-09, CC-10) `[PROPUESTO]`.
- 0 `TODO` sin issue en dominio al cerrar (RNF-37).

---

## 14. Plan por sprint (qué se prueba cuándo)

| Fase PM | Pruebas que entran | Dependencia |
|---|---|---|
| Sprint 0 | Este plan; catálogo de casos; diseño de golden sets | Ventana A (fuentes, esquema) |
| Fase 1–2 | Configurar Vitest; CI con lint/tipos; pruebas de reglas puras (estados, moneda, fechas) | Aprobación Sprint 1 |
| Fase 3 | Contrato y fixtures de conectores; DQ-04/05/09/10; idempotencia | Fuentes validadas |
| Fase 4 | E2E de pantallas; RLS; A11Y-AUTO; RESP-01 | Aprobación Playwright; BD de pruebas (B-003) |
| Fase 5 | Evals de IA; GS-INJ; grounding | Golden sets etiquetados |
| Fase 6 | Carga, DAST, SEC-PEN, usabilidad, simulacro de backup | Staging estable |
| Fase 7 | Piloto: monitorización, RUM, costos, informe de cierre | Todo lo anterior |

---

## 15. Vacíos, dependencias y riesgos

| ID | Elemento | Estado |
|---|---|---|
| QA-D1 | Playwright + axe, k6, gitleaks, `npm audit`, Dependabot, ZAP, Lighthouse CI | **Aprobadas en G0 #12**; instalar fuera de OneDrive con `tools\npm-install.ps1` |
| QA-D2 | BD de pruebas (rama/proyecto Supabase) | Proyecto nuevo aprobado (G0 #2); **crearlo y aportar credenciales: `[PENDIENTE USUARIO]`** |
| QA-D3 | Fuentes oficiales y licencias para fixtures y golden sets | `[PENDIENTE A]` |
| QA-D4 | Esquemas de contrato (API, agentes, conectores) | `[PENDIENTE A]` |
| QA-D5 | Anotadores humanos para golden sets (quién, con qué criterio) | `[PENDIENTE USUARIO]` |
| QA-D6 | Tope mensual de costo IA y presupuesto de pruebas con modelo | `[PENDIENTE USUARIO]` |
| QA-D7 | Revisión legal para casos de textos (CC-08) | `[PENDIENTE LEGAL]` |
| QA-D8 | Definición de “tasa efectiva” y fórmulas para pruebas de cálculo | `[PENDIENTE SRS V-05]` |
| QA-R1 | Riesgo: golden sets pequeños dan falsa confianza | Mitigación: IC y estado `NO CONCLUYENTE` (§8.3). |
| QA-R2 | Riesgo: fuentes cambian de formato y rompen conectores | Mitigación: pruebas de contrato con fixtures + monitor de esquema. |
| QA-R3 | Riesgo: el costo de evals con modelo crece | Mitigación: tope de gasto; evals completos solo por cambio y nocturnos. |
| QA-R4 | Riesgo: pruebas contra BD compartida contaminan datos | Mitigación: ramas efímeras, datos `is_demo`, limpieza. |
| QA-R5 | Riesgo: calendario de 16 semanas comprime QA | Mitigación: casos críticos primero; gates del roadmap (backlog-producto). |

---

## 16. Registro de cambios

| Versión | Fecha | Cambio | Autor |
|---|---|---|---|
| 0.2.0 | 2026-11-15 | Ronda 3 (G0): herramientas aprobadas (G0 #12); CC-23 (puerta P0 de eventos); RF-C-06, RF-C-07, RF-G-05 y RF-G-16 post-MVP (sus T-RF no se ejecutan); QA-D1/D2/D5 actualizadas; anotadores y revisores `[PENDIENTE USUARIO]`. | Ventana B |
| 0.1.0 | 2026-11-15 | Creación: pirámide, herramientas (con estado real), entornos, 22 casos críticos, calidad de datos, evals de IA con análisis de tamaños de muestra, seguridad, carga, A11Y, control de trazabilidad y definición de MVP terminado. | Ventana B |
