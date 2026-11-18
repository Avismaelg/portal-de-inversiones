# Bloqueos del proyecto

Registro único de impedimentos. Cualquier ventana puede **añadir** filas; nadie borra ni edita las existentes (se actualiza la columna Estado y se añade una nota al final).

| ID | Fecha | Bloqueo | Impacto | Responsable | Mitigación / siguiente acción | Estado |
|---|---|---|---|---|---|---|
| B-001 | 2026-11-15 | Falta `AviTech_Investment_Intelligence_SRS_IEEE830.docx` | Sin requisitos funcionales formales; la trazabilidad queda incompleta | Usuario | Colocar el archivo en `docs/requisitos/` | MITIGADO — G0 #1b (sigue ausente) |
| B-002 | 2026-11-15 | Falta `AviTech_Investment_Intelligence_Plan_Maestro.docx` | Sin fases, arquitectura ni estrategia oficiales | Usuario | Colocar el archivo en `docs/requisitos/` | MITIGADO — G0 #1b (sigue ausente) |
| B-003 | 2026-11-15 | Supabase vinculado (`ecmqmgpruxclmpnnpgzv`) no responde: "Database is possibly not accessible" | No se puede inspeccionar ni migrar la base | Usuario | Confirmar si es el proyecto correcto y reactivarlo, o vincular uno nuevo | RESUELTO PARCIALMENTE 2026-11-15 — proyecto nuevo `PORTAL DE INVERSIONES` (`xzlwrlgjsdymcidlmqew`, us-east-1, Postgres 17.11, ACTIVE_HEALTHY, vacío: 0 tablas en public/app); consultas de solo lectura OK. Falta `.env.local` y ejecutar el SQL (B-007). El antiguo `ecmqmgpruxclmpnnpgzv` sigue INACTIVE y no se usa |
| B-004 | 2026-11-15 | No existe `.env.local` | Nada conecta a Supabase ni a proveedores de IA | Usuario | Copiar `.env.example` y completar credenciales (Sprint 1) | ABIERTO — S1, tras proyecto nuevo |
| B-005 | 2026-11-15 | Repo sin commit inicial | No hay línea base para revisar cambios | Usuario | `git add` + primer commit al aprobar Sprint 0 | RESUELTO — commit `2494170` |
| B-006 | 2026-11-15 | Sin Supabase CLI, Docker ni psql | No hay entorno local reproducible de base de datos | Ventana A | Diseñar migraciones para MCP/SQL Editor; evaluar CLI en Sprint 1 | ABIERTO — evaluar CLI en S1 |
| B-007 | 2026-11-15 | `schema-propuesto.sql` no se ha ejecutado en ningún Postgres; la RLS y los triggers no están probados | El modelo de datos no puede declararse validado | Ventana A | T-INF-01/02/03 en Sprint 1 (requiere B-003 resuelto o un Postgres de pruebas) | PARCIALMENTE RESUELTO 2026-11-15 — el SQL se aplicó en Supabase `xzlwrlgjsdymcidlmqew` (7 migraciones) y las pruebas P0 principales dieron lo esperado (MODELO-DATOS §16). Sigue abierto: suite completa rol × tabla × operación, JWT real y flujo de alta de usuarios |
| B-008 | 2026-11-15 | Lector web recibe HTTP 403 en `simv.gob.do`, `hacienda.gob.do`, `bvrd.com.do` (y `cdn`/`boletin`), y HTTP 473 en `cne.gob.do` y `datos.gob.do` | Fuentes F-05, F-06, F-07 y F-09 sin verificar (API, formato, términos) | Ventana A / Usuario | Verificar desde navegador real o contactar a la institución; no se intenta evadir el bloqueo (T-SRC-05…07, T-SRC-09) | ABIERTO — G0 #7: cobertura manual |
| B-009 | 2026-11-15 | Sin licencia de reutilización explícita en BCRD, Crédito Público, MIMARENA, CNE, SIMV y ProDominicana; BVRD declara `ai-train=no` | No se puede activar ningún conector automático salvo DGCP (ODbL) tras su verificación | Usuario | Abogado dominicano (`REQUIERE ABOGADO`, SEGURIDAD §7; T-PRE-05) | ABIERTO — G0 #5: abogado |
| B-010 | 2026-11-15 | DGCP redirige (301) sus páginas de datos abiertos a `datosabiertos.dgcp.gob.do`, que no se leyó; frecuencia de actualización contradictoria entre fuentes | La estrategia de conector F-01 queda con puntos sin cerrar | Ventana A | T-SRC-01 | ABIERTO — T-SRC-01 |
| B-011 | 2026-11-15 | Sin proveedor de LLM ni presupuesto mensual definido | No se puede dimensionar costos ni implementar agentes | Usuario | T-PRE-06 | ABIERTO — G0 #4: un proveedor, tope bajo; falta elegirlo |
| B-012 | 2026-11-15 | Hosting del web y de workers sin decidir (ADR-0005) | Condiciona rate limiting, secretos, límites de ejecución y despliegue | Usuario | T-PRE-07 | ABIERTO — ADR-0005 antes de T-INF-08 |
| B-013 | 2026-11-15 | La capacidad y velocidad del equipo que construirá el MVP no están definidas; las estimaciones del backlog son puntos relativos sin calibrar | El roadmap de 16 semanas (`backlog-producto.md` §5) no se puede validar; Should/Could (89 pts) quedan fuera de plazo con el supuesto actual | Usuario | Definir equipo y medir velocidad en S1–S2; decidir recorte de alcance o ampliación de plazo (backlog-producto §7, decisiones 8 y 9) | MITIGADO — G0 #6: 20–24 sem, 2–3 personas; faltan nombres |
| B-014 | 2026-11-15 | Herramientas de prueba aprobadas en G0 #12; Vitest, Testing Library, Playwright, axe, gitleaks, `npm audit` y Dependabot instalados/configurados; k6, ZAP y Lighthouse siguen pendientes | E2E, A11Y y escaneo de secretos ya operativos; carga y DAST aún no se ejecutan | Ventana A | Instalar k6/ZAP/Lighthouse cuando exista API/UI estable; ver `docs/sprint-1/HERRAMIENTAS-PRUEBAS.md` | PARCIAL — S1: unitarias/E2E/secretos listos; k6/ZAP/Lighthouse pendientes |
| B-015 | 2026-11-15 | No hay responsables definidos para anotar los golden sets de IA ni para la revisión humana de oportunidades | RNF-16/19 y G-09 quedarían `NO CONCLUYENTE`; la cola de revisión (RF-F-11) no tendría operadores | Usuario | Designar anotadores y revisores en G0 (ESTRATEGIA-PRUEBAS §15 QA-D5) | ABIERTO — G0 #11: política aprobada; faltan anotadores |
| B-016 | 2026-11-15 | Política de publicación de eventos no verificados sin cerrar: A propone `opportunity_manager+`; B debe reconciliar CC-23 con AC-02-04; no se ha decidido si hay doble llave en `human_review` | El trigger P0 no tiene un criterio único contra el que probarse; CC-23 y AC-02-04 se contradicen | Usuario / A / B | Cerrado 2026-11-15: manager+, sin doble llave; auto-revisión auditada. Ver `MODELO-DATOS.md` §14 | RESUELTO — B-016; B debe reflejar CC-23/AC-02-04 |
| B-017 | 2026-11-15 | `economic_events.reviewed_by` e `investment_opportunities.reviewed_by` referencian `users(id)` sin `ON DELETE`; RNF-28 (borrado de cuenta) choca con conservar la identidad del revisor | No se puede borrar la cuenta de un revisor sin romper la FK o perder auditoría | Usuario / abogado | Cerrado técnicamente 2026-11-15: `app.pseudonymize_user` + `auth.users` deshabilitado/anonimizado; FK `ON DELETE RESTRICT`; auditoría redactada. Legal pendiente | RESUELTO TÉCNICAMENTE — B-017; `REQUIERE ABOGADO` |
| B-018 | 2026-11-15 | `review_notes` y `reviewed_by` se conceden con `GRANT SELECT` de tabla a `authenticated`; un `viewer` puede leer notas internas e identidad del revisor | Posible fuga de notas de revisión y datos personales en contenido publicado | Ventana A / seguridad | Cerrado 2026-11-15: `GRANT SELECT` por columna + vistas `staff_*`; `viewer` ve rol, no nombre; `analyst+` ve nombre y notas | RESUELTO — B-018 |
| B-019 | 2026-11-15 | `notification_status` no tiene estado `superseded`; B propone marcar así las notificaciones de un evento que vuelve a cola. Falta definir qué ve un `viewer` al abrir un enlace o entrada de watchlist de un evento despublicado | Notificaciones y enlaces pueden mostrar contenido que ya no está publicado o quedar en estado inconsistente | Ventana A / Ventana B | Cerrado 2026-11-15: `superseded` + redacción; enlace directo 404; watchlist «No disponible temporalmente (en revisión)»; nueva alerta al republicar | RESUELTO — B-019; B debe reflejar UX/QA |
| B-020 | 2026-11-18 | El token de la API BCRD está restringido por IP: `api.bancentral.gov.do` responde «Intento de acceso desde una dirección desconocida» desde la IP actual (IPv4 e IPv6). Además el inicio de sesión del portal `apibcrd.bancentral.gov.do` falla con «An unexpected server error occurred» | F-02 por API no devuelve datos; no se puede verificar la forma real de `result` ni registrar la IP desde el portal | Usuario | Pedir al BCRD que autorice la IP de origen (y la del hosting, ADR-0005) y revise el inicio de sesión; rotar el token al recuperar acceso (FUENTES-RD §3.1) | ABIERTO |

## Notas de cierre G0 (2026-11-15)

- Acta: `docs/sprint-0/G0-ACTA.md`. Veredicto: **aprobado con recortes y condiciones**.
- **B-001/B-002** no se cierran: los documentos siguen ausentes. Dejan de bloquear por la decisión 1b, pero la matriz de 86 RF queda provisional y la aceptación será contra el Prompt Maestro.
- **B-005** resuelto con el commit inicial `2494170d6a8754a5fe7ddaa0b75652c63d9edc61`.
- **B-016…B-019** resueltos el 2026-11-15 (B-017 técnicamente, sujeto a abogado). Detalle: `MODELO-DATOS.md` §14; handoff UX/QA en `BANDEJA.md`.
- **B-013** mitigado, no resuelto: hay baseline de calendario (20–24 semanas, 2–3 personas), pero no nombres ni dedicación.
- **B-014** parcialmente resuelto: Vitest, Testing Library, Playwright, axe, gitleaks, `npm audit` y Dependabot están operativos; k6, ZAP y Lighthouse quedan pendientes de API/UI estable.
- Las condiciones que dependen del usuario están listadas en `G0-ACTA.md` §3.

## Cómo añadir un bloqueo

1. Usa el siguiente ID libre (B-00N).
2. Fecha en formato `YYYY-MM-DD`.
3. Describe el hecho, no la interpretación.
4. Indica impacto concreto y responsable.
5. No cierres un bloqueo sin evidencia de que se resolvió.

## Actualización 2026-11-17 (sprint de estabilización)

- **B-003:** en uso. `xzlwrlgjsdymcidlmqew` tiene 16 migraciones aplicadas; `.env.local` configurado por el usuario. El antiguo `ecmqmgpruxclmpnnpgzv` no se usa.
- **B-011:** proveedor elegido por el usuario: Anthropic (Claude, SDK `@anthropic-ai/sdk` 1.9.0, modelo por defecto `claude-sonnet-5-5`). **Sigue abierto:** falta `AI_API_KEY` en `.env.local` y el tope de gasto mensual (`AI_MONTHLY_BUDGET_USD`) no se aplica todavía en código.
- **B-020 (nuevo):** no existe un proyecto Supabase de pruebas separado ni usuarios de prueba por rol. Impide E2E con sesión real y pruebas de RLS desde la interfaz sin tocar datos reales. Responsable: usuario (crear proyecto o rama de Supabase). ABIERTO.
- **B-021 (nuevo):** `picomatch` ≤4.0.7 (GHSA-fc5q-39xc-vjpf, alta) sin versión corregida; solo afecta herramientas de desarrollo. Excepción temporal hasta 2026-12-17, **pendiente de aceptación formal** del responsable de seguridad. Ver `docs/seguridad/RIESGOS-DEPENDENCIAS.md`. ABIERTO.
