# RONDA 4 — Ventana A (cierre de coherencia)

G0 está cerrado. Esta ronda cierra tres cabos que quedaron abiertos en la ronda 3. **No cambia el alcance aprobado.**

## 1. Aclaración del acta: Crédito Público

Lee `G0-ACTA.md` §2. La interpretación de cierre es:

- «DGCP + Crédito Público» es alcance **de producto**, no autorización de conectores.
- Crédito Público entra con **carga manual** (G0 #7) hasta que el abogado autorice su automatización (G0 #5).
- El único conector activable en Sprint 1 es DGCP, y solo tras cerrar `T-SRC-01`.

Añade esta nota en `docs/fuentes/FUENTES-RD.md` y en `docs/arquitectura/ARQUITECTURA-MVP.md` donde corresponda. No la presentes como decisión nueva: es la conciliación de las decisiones 5 y 7.

## 2. Recalcula el backlog técnico con los recortes de G0 #9

En `docs/sprint-0/backlog-tecnico.md`:

1. Retira `T-AI-09` (calculadora, 4 d) y la parte del comparador de `T-WEB-06`.
2. Revisa si `T-WEB-12`, `T-SRC-07/08/09` u otras tareas solo servían a Should/Could recortados. Márcalas **Post-MVP** o **Could**, sin borrarlas.
3. Actualiza el total (hoy 192,5 d) y la tabla de §9.
4. Recalcula la comparación con B: su backlog MVP es **428 pts** (Must 353, Should 65, Could 10) tras retirar 22 pts.
5. No maquilles: si el total baja poco, dilo y explica por qué.

## 3. Guardia de publicación de eventos (pregunta de B)

B añadió CC-23: todo evento no verificado al 100 % va a cola y no es visible para `viewer`.

Verifica el esquema: el trigger `investment_opportunities_publish_guard` solo cubre oportunidades; `economic_events` solo tiene un `CHECK` de `verification_status <> 'pending'`. **Falta la guardia equivalente.**

1. Añade al `schema-propuesto.sql` la guardia para `economic_events`: trigger + función (o CHECK + trigger) que exija revisor humano, `reviewed_by`, `reviewed_at` y `published_at` antes de publicar.
2. Añade la prueba de humo correspondiente a `T-INF-02/03` o a la tarea que corresponda.
3. Marca todo como **propuesto, no ejecutado** (B-007).
4. Responde a B en `BANDEJA.md`.

## 4. Histórico DGCP: N provisional

B necesita N para dimensionar RNF-02/03. Propón un N provisional con rationale (por ejemplo, 5 años) y déjalo marcado `[PENDIENTE T-SRC-01]`. No lo presentes como decidido.

## 5. Entrega

- Actualiza `docs/sprint-0/ESTADO-VENTANA-A.md`.
- Añade tu respuesta en `docs/sprint-0/BANDEJA.md`.
- No ejecutes SQL, no instales nada, no hagas commit.
- Cierra con el bloque `ESTADO` del contrato.
