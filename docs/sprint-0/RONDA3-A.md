# RONDA 3 — Ventana A (aplicar decisiones de G0)

Instrucción del orquestador. G0 está **cerrado** con el acta `docs/sprint-0/G0-ACTA.md` (2026-11-15). Ejecuta sin pedir aprobación adicional; no cambies el alcance más allá de lo que dice el acta.

## 1. Lee el acta

Lee `docs/sprint-0/G0-ACTA.md` completa. Las decisiones que te afectan son la 2, 3, 4, 5, 7, 8, 10, 11, 12 y 14.

## 2. Actualiza el estado de los ADR

En la tabla de cada ADR, cambia la fila `Estado`:

| ADR | Nuevo estado |
|---|---|
| ADR-0001 | `**ACEPTADO** — G0, 2026-11-15` |
| ADR-0003 | `**ACEPTADO** — G0, 2026-11-15` |
| ADR-0004 | `**ACEPTADO** — G0, 2026-11-15; condicionado a T-INF-01 y al proyecto Supabase nuevo (G0 #2a)` |
| ADR-0006 | `**ACEPTADO** — G0, 2026-11-15` |
| ADR-0007 | `**ACEPTADO** — G0, 2026-11-15` |
| ADR-0005 | `**PENDIENTE** — decidir antes de T-INF-08 (G0 #3)` |
| ADR-0002 | `**PENDIENTE** — experimento en Sprint 1 antes de decidir (G0 #3)` |

No cambies el contenido técnico de los ADR; solo el estado y, si hace falta, una línea de resolución al final.

## 3. Aplica DM-03: `opportunity_evidence` → `evidence`

Solo en **tus** archivos:

- `docs/datos/schema-propuesto.sql`
- `docs/datos/MODELO-DATOS.md`
- `docs/arquitectura/ARQUITECTURA-MVP.md` (línea ~99)
- `docs/ia/SISTEMA-IA.md` (líneas ~102 y ~151)

Reglas:

1. Renombra la tabla, los índices, las políticas RLS, los `ALTER TABLE`, los comentarios y el diagrama Mermaid. El nombre nuevo es `evidence`.
2. **No** renombres la columna `opportunity_id` ni el índice `evidence_opp_idx`: siguen siendo válidos.
3. **No** toques `docs/prompts/PROMPT-MAESTRO.md` (es la fuente y lista el nombre original), ni `docs/producto`, `docs/ux`, `docs/qa` (son de B), ni los documentos históricos de `docs/sprint-0/` (BANDEJA, G0-DECISIONES, RONDA2).
4. En `MODELO-DATOS.md`, la fila DM-03 debe decir: `**Aprobado en G0 #10** — renombrar a evidence antes de ejecutar el SQL`.
5. Añade una nota de cabecera en el SQL: `-- G0 #10 (2026-11-15): opportunity_evidence renombrada a evidence. No ejecutar el esquema anterior.`

## 4. Fuentes: decisión G0 #7

En `docs/fuentes/FUENTES-RD.md`, añade una sección `## Decisión G0 #7 (2026-11-15)` que diga, sin ambigüedad:

- Los módulos con fuentes no verificadas (B, C-03, E y las fuentes F-05…F-09) se declaran **cobertura manual**.
- La UI debe mostrar «cobertura pendiente» en esos módulos.
- Solo se automatiza lo que verifiquen `T-SRC-04…06`.
- DGCP sigue siendo la única fuente con licencia verificada (ODbL), y su conector no se activa hasta cerrar `T-SRC-01`.
- El histórico DGCP será de los últimos N años; N se define en `T-SRC-01` (G0 #8).

## 5. Seguridad: decisiones G0 #5, #12 y #14

En `docs/seguridad/SEGURIDAD-Y-CUMPLIMIENTO.md`, añade una sección `## Decisiones G0 aplicadas (2026-11-15)`:

- Abogado dominicano contratado antes de activar fuentes sin licencia y antes de G5 (G0 #5).
- Herramientas aprobadas: gitleaks, `npm audit`, Dependabot, Playwright + axe, k6, OWASP ZAP y Lighthouse CI (G0 #12). Instalación fuera de OneDrive.
- MFA para admin, `.env.local` para secretos y primer commit tras revisión (G0 #14). El contacto del `User-Agent` queda pendiente de que el usuario lo defina (SG-05).
- Recordatorio: no se afirma que nada de esto esté ejecutado; solo aprobado.

## 6. Entrega

- Actualiza `docs/sprint-0/ESTADO-VENTANA-A.md`.
- Añade tu respuesta en `docs/sprint-0/BANDEJA.md` (sección nueva, no edites las anteriores).
- No ejecutes SQL, no instales nada, no hagas commit.
- Cierra con el bloque `ESTADO` del contrato.
