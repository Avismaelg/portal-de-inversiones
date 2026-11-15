# Bloqueos del proyecto

Registro único de impedimentos. Cualquier ventana puede **añadir** filas; nadie borra ni edita las existentes (se actualiza la columna Estado y se añade una nota al final).

| ID | Fecha | Bloqueo | Impacto | Responsable | Mitigación / siguiente acción | Estado |
|---|---|---|---|---|---|---|
| B-001 | 2026-11-15 | Falta `AviTech_Investment_Intelligence_SRS_IEEE830.docx` | Sin requisitos funcionales formales; la trazabilidad queda incompleta | Usuario | Colocar el archivo en `docs/requisitos/` | MITIGADO — G0 #1b (sigue ausente) |
| B-002 | 2026-11-15 | Falta `AviTech_Investment_Intelligence_Plan_Maestro.docx` | Sin fases, arquitectura ni estrategia oficiales | Usuario | Colocar el archivo en `docs/requisitos/` | MITIGADO — G0 #1b (sigue ausente) |
| B-003 | 2026-11-15 | Supabase vinculado (`ecmqmgpruxclmpnnpgzv`) no responde: "Database is possibly not accessible" | No se puede inspeccionar ni migrar la base | Usuario | Confirmar si es el proyecto correcto y reactivarlo, o vincular uno nuevo | ABIERTO — G0 #2a: crear proyecto nuevo |
| B-004 | 2026-11-15 | No existe `.env.local` | Nada conecta a Supabase ni a proveedores de IA | Usuario | Copiar `.env.example` y completar credenciales (Sprint 1) | ABIERTO — S1, tras proyecto nuevo |
| B-005 | 2026-11-15 | Repo sin commit inicial | No hay línea base para revisar cambios | Usuario | `git add` + primer commit al aprobar Sprint 0 | RESUELTO — commit `2494170` |
| B-006 | 2026-11-15 | Sin Supabase CLI, Docker ni psql | No hay entorno local reproducible de base de datos | Ventana A | Diseñar migraciones para MCP/SQL Editor; evaluar CLI en Sprint 1 | ABIERTO — evaluar CLI en S1 |
| B-007 | 2026-11-15 | `schema-propuesto.sql` no se ha ejecutado en ningún Postgres; la RLS y los triggers no están probados | El modelo de datos no puede declararse validado | Ventana A | T-INF-01/02/03 en Sprint 1 (requiere B-003 resuelto o un Postgres de pruebas) | ABIERTO — depende de B-003 |
| B-008 | 2026-11-15 | Lector web recibe HTTP 403 en `simv.gob.do`, `hacienda.gob.do`, `bvrd.com.do` (y `cdn`/`boletin`), y HTTP 473 en `cne.gob.do` y `datos.gob.do` | Fuentes F-05, F-06, F-07 y F-09 sin verificar (API, formato, términos) | Ventana A / Usuario | Verificar desde navegador real o contactar a la institución; no se intenta evadir el bloqueo (T-SRC-05…07, T-SRC-09) | ABIERTO — G0 #7: cobertura manual |
| B-009 | 2026-11-15 | Sin licencia de reutilización explícita en BCRD, Crédito Público, MIMARENA, CNE, SIMV y ProDominicana; BVRD declara `ai-train=no` | No se puede activar ningún conector automático salvo DGCP (ODbL) tras su verificación | Usuario | Abogado dominicano (`REQUIERE ABOGADO`, SEGURIDAD §7; T-PRE-05) | ABIERTO — G0 #5: abogado |
| B-010 | 2026-11-15 | DGCP redirige (301) sus páginas de datos abiertos a `datosabiertos.dgcp.gob.do`, que no se leyó; frecuencia de actualización contradictoria entre fuentes | La estrategia de conector F-01 queda con puntos sin cerrar | Ventana A | T-SRC-01 | ABIERTO — T-SRC-01 |
| B-011 | 2026-11-15 | Sin proveedor de LLM ni presupuesto mensual definido | No se puede dimensionar costos ni implementar agentes | Usuario | T-PRE-06 | ABIERTO — G0 #4: un proveedor, tope bajo; falta elegirlo |
| B-012 | 2026-11-15 | Hosting del web y de workers sin decidir (ADR-0005) | Condiciona rate limiting, secretos, límites de ejecución y despliegue | Usuario | T-PRE-07 | ABIERTO — ADR-0005 antes de T-INF-08 |
| B-013 | 2026-11-15 | La capacidad y velocidad del equipo que construirá el MVP no están definidas; las estimaciones del backlog son puntos relativos sin calibrar | El roadmap de 16 semanas (`backlog-producto.md` §5) no se puede validar; Should/Could (89 pts) quedan fuera de plazo con el supuesto actual | Usuario | Definir equipo y medir velocidad en S1–S2; decidir recorte de alcance o ampliación de plazo (backlog-producto §7, decisiones 8 y 9) | MITIGADO — G0 #6: 20–24 sem, 2–3 personas; faltan nombres |
| B-014 | 2026-11-15 | Herramientas de prueba propuestas (Playwright, axe-core, k6, gitleaks, OWASP ZAP, Lighthouse CI) no están aprobadas ni instaladas | No se pueden ejecutar E2E, A11Y automatizada, carga ni escaneo de secretos (ESTRATEGIA-PRUEBAS §3) | Usuario | Aprobar o descartar cada herramienta en Sprint 1; instalar con `tools\npm-install.ps1` y fuera de OneDrive | APROBADO — G0 #12; pendiente instalar en S1 |
| B-015 | 2026-11-15 | No hay responsables definidos para anotar los golden sets de IA ni para la revisión humana de oportunidades | RNF-16/19 y G-09 quedarían `NO CONCLUYENTE`; la cola de revisión (RF-F-11) no tendría operadores | Usuario | Designar anotadores y revisores en G0 (ESTRATEGIA-PRUEBAS §15 QA-D5) | ABIERTO — G0 #11: política aprobada; faltan anotadores |
| B-016 | 2026-11-15 | Política de publicación de eventos no verificados sin cerrar: A propone `opportunity_manager+`; B debe reconciliar CC-23 con AC-02-04; no se ha decidido si hay doble llave en `human_review` | El trigger P0 no tiene un criterio único contra el que probarse; CC-23 y AC-02-04 se contradicen | Usuario / A / B | Decidir en S1 antes de `T-INF-03`; default propuesto: manager+, sin doble llave en el MVP | ABIERTO — Ronda 4 |
| B-017 | 2026-11-15 | `economic_events.reviewed_by` e `investment_opportunities.reviewed_by` referencian `users(id)` sin `ON DELETE`; RNF-28 (borrado de cuenta) choca con conservar la identidad del revisor | No se puede borrar la cuenta de un revisor sin romper la FK o perder auditoría | Usuario / abogado | Seudonimizar en lugar de borrar; decidir con `T-PRE-05` antes de `T-INF-02` | ABIERTO — Ronda 4 |
| B-018 | 2026-11-15 | `review_notes` y `reviewed_by` se conceden con `GRANT SELECT` de tabla a `authenticated`; un `viewer` puede leer notas internas e identidad del revisor | Posible fuga de notas de revisión y datos personales en contenido publicado | Ventana A / seguridad | Decidir si son columnas staff-only (SELECT por columna o vista pública) antes de `T-INF-02` | ABIERTO — Ronda 4 |
| B-019 | 2026-11-15 | `notification_status` no tiene estado `superseded`; B propone marcar así las notificaciones de un evento que vuelve a cola. Falta definir qué ve un `viewer` al abrir un enlace o entrada de watchlist de un evento despublicado | Notificaciones y enlaces pueden mostrar contenido que ya no está publicado o quedar en estado inconsistente | Ventana A / Ventana B | Añadir `superseded` al enum y definir 404/aviso «No disponible temporalmente» antes de `T-INF-02` | ABIERTO — Ronda 5 |

## Notas de cierre G0 (2026-11-15)

- Acta: `docs/sprint-0/G0-ACTA.md`. Veredicto: **aprobado con recortes y condiciones**.
- **B-001/B-002** no se cierran: los documentos siguen ausentes. Dejan de bloquear por la decisión 1b, pero la matriz de 86 RF queda provisional y la aceptación será contra el Prompt Maestro.
- **B-005** resuelto con el commit inicial `2494170d6a8754a5fe7ddaa0b75652c63d9edc61`.
- **B-013** mitigado, no resuelto: hay baseline de calendario (20–24 semanas, 2–3 personas), pero no nombres ni dedicación.
- **B-014** aprobado, no resuelto: las herramientas aún no están instaladas.
- Las condiciones que dependen del usuario están listadas en `G0-ACTA.md` §3.

## Cómo añadir un bloqueo

1. Usa el siguiente ID libre (B-00N).
2. Fecha en formato `YYYY-MM-DD`.
3. Describe el hecho, no la interpretación.
4. Indica impacto concreto y responsable.
5. No cierres un bloqueo sin evidencia de que se resolvió.
