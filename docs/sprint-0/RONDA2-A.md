# RONDA 2 — Ventana A (conciliación)

Instrucción del orquestador. Ejecutar ahora, sin pedir aprobación adicional.

## 1. Responde la bandeja

Lee `docs/sprint-0/BANDEJA.md`, entrada de B de las 11:53, y responde los **8 puntos**:

1. `verification_status.pending` — confirmar que nunca se publica en ese estado.
2. `tender_status.closing_soon` — confirmar que es estado derivado en UI (≤ 72 h), no columna.
3. `permit_status` — confirmar que B adopte vuestro enum.
4. Capa `calculation` — no cambiar el enum; queda a decisión del usuario.
5. Cobertura de fuentes — confirmar qué módulos quedan "cobertura pendiente".
6. Backlog técnico — ya existe (`docs/sprint-0/backlog-tecnico.md`); dar estimaciones a EN-01…EN-08.
7. Historial de auditoría — definir qué rol puede leerlo desde la UI.
8. Evals — entregar licencia de uso de documentos, contrato JSON de agentes, criterio de "fuente autorizada" y zona horaria asumida.

## 2. Lee lo que no leíste

Lee completos los 6 documentos de B que no revisaste:

- `docs/producto/PERSONAS-Y-CASOS-DE-USO.md`
- `docs/ux/INVENTARIO-PANTALLAS.md`
- `docs/ux/SISTEMA-DISENO.md`
- `docs/ux/FICHAS-CLAVE.md`
- `docs/qa/ESTRATEGIA-PRUEBAS.md`
- `docs/sprint-0/backlog-producto.md`

## 3. Reconcilia el calendario

Produce una tabla de conflicto entre:

- tu estimación de **168 días-persona ≈ 34 semanas-persona** (sin QA, UX ni legal), y
- el roadmap de B: **16 semanas, 8 sprints, 353 puntos Must**.

Para cada fila: supuesto, conflicto, resolución propuesta, impacto. No maquilles la cifra.

## 4. Corrige el SQL propuesto

En `docs/datos/schema-propuesto.sql`:

1. Habilita RLS en las **3 particiones de `audit_logs`** (`audit_logs_2026_11`, `audit_logs_2026_12`, `audit_logs_default`) y revoca cualquier grant directo sobre ellas. Hoy no hay grants, pero debe quedar explícito.
2. Deja el `ALTER TABLE users ADD CONSTRAINT users_auth_fk FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE` como paso **obligatorio** de la migración, no como comentario opcional. Si no se puede ejecutar en Postgres plano, separa el bloque en una sección "solo Supabase" claramente marcada.
3. Confirma si RNF-02/RNF-03 asumen 100.000 eventos reales o solo dataset de prueba.

## 5. Entrega

- Escribe `docs/sprint-0/CONCILIACION-A-B.md` con: respuestas a B, discrepancias encontradas, tabla de calendario, correcciones al SQL y riesgos.
- Actualiza `docs/sprint-0/ESTADO-VENTANA-A.md`.
- Añade la respuesta a B en `docs/sprint-0/BANDEJA.md`.
- No cambies el contrato, el alcance ni el enum `trust_layer`. No hagas commit.
- Cierra con el bloque `ESTADO` del contrato.
