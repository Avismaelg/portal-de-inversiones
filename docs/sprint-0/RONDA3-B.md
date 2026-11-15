# RONDA 3 — Ventana B (aplicar decisiones de G0)

Instrucción del orquestador. G0 está **cerrado** con el acta `docs/sprint-0/G0-ACTA.md` (2026-11-15). Ejecuta sin pedir aprobación adicional; no cambies el alcance más allá de lo que dice el acta.

## 1. Lee el acta

Lee `docs/sprint-0/G0-ACTA.md` completa. Las decisiones que te afectan son la 1, 6, 7, 8, 9, 11 y 13.

## 2. Recorta el alcance (G0 #9)

En `docs/sprint-0/backlog-producto.md`:

1. Mueve a una sección `## Post-MVP (aprobado en G0 #9)` estas cuatro cosas, con su IDs y puntos:
   - Comparador de oportunidades.
   - Calculadora de inversión (V-05).
   - Vistas/búsquedas guardadas (DM-06).
   - Capa `Cálculo` (D-08).
2. Quítalas de los totales Must/Should del MVP y del cálculo de carga de los sprints.
3. Deja explícito el alcance del MVP aprobado: **corte vertical DGCP + Crédito Público**, con radar de eventos, proyectos/permisos con carga manual asistida, licitaciones, watchlist, alertas in-app y oportunidades con revisión humana.
4. Marca también como excluidos: alertas por correo, facturación, multi-tenant y exportación CSV (G0 #13).

## 3. Calendario (G0 #6)

En `docs/sprint-0/backlog-producto.md` §5 y §7:

- El baseline aprobado es **20–24 semanas con 2–3 personas**.
- Las 16 semanas quedan como **escenario**, no como compromiso.
- La velocidad real se mide en S1–S2.
- No inventes nombres ni dedicación: quedan como `[PENDIENTE USUARIO]`.

## 4. Fuentes manuales (G0 #7 y #8)

- Marca los módulos con fuentes no verificadas (B, C-03, E) como **cobertura manual** y «cobertura pendiente» visible en la UI.
- El histórico DGCP será de los últimos N años; N se define en `T-SRC-01`. No prometas el histórico completo.

## 5. Revisión humana y supuestos (G0 #11 y #13)

- En `docs/qa/ESTRATEGIA-PRUEBAS.md` y en el backlog: todo evento no verificado al 100 % pasa por cola de revisión humana (puerta P0). Anotadores y revisores quedan `[PENDIENTE USUARIO]`.
- Confirma en el backlog: alertas solo in-app, sin facturación, una sola organización.

## 6. Renombrado DM-03 en tus documentos

Cambia `opportunity_evidence` → `evidence` solo en **tus** carpetas:

- `docs/ux/FICHAS-CLAVE.md` (líneas ~11 y ~145)
- `docs/producto/`, `docs/qa/` si aparece

No toques `docs/datos`, `docs/arquitectura`, `docs/ia` (son de A), ni `docs/prompts/PROMPT-MAESTRO.md` (lista el nombre original a propósito), ni los documentos históricos de `docs/sprint-0/`.

## 7. Cierra G0 en el documento de decisiones

En `docs/sprint-0/G0-DECISIONES.md`, añade al inicio (no borres la tabla):

```
> **CERRADO el 2026-11-15.** Las 14 decisiones fueron aprobadas. La resolución vinculante está en `G0-ACTA.md`.
```

## 8. Entrega

- Actualiza `docs/sprint-0/ESTADO-VENTANA-B.md`.
- Añade tu respuesta en `docs/sprint-0/BANDEJA.md` (sección nueva, no edites las anteriores).
- No hagas commit. No cambies el alcance más allá de las decisiones del acta.
- Cierra con el bloque `ESTADO` del contrato.
