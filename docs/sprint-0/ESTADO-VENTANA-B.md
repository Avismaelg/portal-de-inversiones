# ESTADO — Ventana B

> Actualizar al final de **cada** turno. Es la fuente que lee el orquestador.
> No escribir aquí planes largos: solo estado. Los entregables van en sus archivos.

**Última actualización:** 2026-11-15 (Ronda 3)
**Sprint:** 0 cerrado por `G0-ACTA.md` (APROBADO CON RECORTES Y CONDICIONES); Sprint 1 autorizado.
**Estado:** RONDA 3 COMPLETA. Documentos de B alineados con el acta. Ninguna prueba ejecutada; ningún código escrito.

## Hecho en este turno (Ronda 3)

- Leída `G0-ACTA.md` (decisiones 1, 6, 7, 8, 9, 11 y 13 son las que me afectan).
- **Backlog (`backlog-producto.md` v0.3.0):**
  - Sección `## Post-MVP (aprobado en G0 #9)` con comparador de instrumentos (US-C-06, 8 pts), calculadora (US-C-07, 8), vistas guardadas (US-G-05, 3), exportación CSV (US-G-16, 3) y capa `Cálculo` (D-08, sin historia). Retirados 22 pts.
  - Totales y carga por sprint recalculados sin ellos: MVP = 82 historias, 428 pts (Must 353, Should 65, Could 10).
  - Alcance aprobado explícito: corte vertical DGCP + Crédito Público; exclusiones listadas (correo, facturación, multi-tenant, CSV).
  - Baseline **20–24 semanas con 2–3 personas** (S1–S10 + reserva S11–S12); 16 semanas como escenario (§5.5). Equipo: `[PENDIENTE USUARIO]`.
  - Cobertura manual / “cobertura pendiente” marcada en B, C-03 y E; histórico DGCP de N años (N en `T-SRC-01`); §7 convertido en estado de condiciones abiertas.
- **ESTRATEGIA-PRUEBAS v0.2.0:** puerta P0 (nuevo CC-23: evento no verificado → cola de revisión, 23 casos críticos); herramientas aprobadas (G0 #12); T-RF post-MVP no se ejecutan; anotadores y revisores `[PENDIENTE USUARIO]`.
- **Renombrado DM-03** `opportunity_evidence` → `evidence` en FICHAS-CLAVE (solo mis carpetas; sin tocar A, el Prompt Maestro ni documentos históricos).
- REQUISITOS v0.4.0 (§2.4 efecto de G0), PERSONAS (UC-08/09/15 post-MVP), INVENTARIO y SISTEMA-DISENO (post-MVP marcado).
- `G0-DECISIONES.md`: añadida la cabecera de cierre.
- Comprobaciones por script: 82 historias en tablas MVP + 4 post-MVP = 86; 23 CC definidos y sin referencias huérfanas; ningún `opportunity_evidence` fuera del registro de cambios.

## En progreso

- Nada.

## Bloqueos (condiciones abiertas de la acta §3, todas `[PENDIENTE USUARIO]`)

- Proyecto Supabase nuevo y credenciales (B-003 sigue abierto hasta crearlo); proveedor LLM, clave y tope; abogado; nombres y dedicación del equipo (B-013); anotadores y revisores (B-015); contacto del `User-Agent` (SG-05); hosting (ADR-0005).
- B-014 (herramientas) queda resuelto en decisión (G0 #12); falta instalarlas en Sprint 1.
- B-001/002 (SRS y Plan Maestro) permanecen como vacíos `[PENDIENTE SRS]` (G0 #1).

## Decisiones tomadas (con justificación)

- Ninguna de alcance: solo apliqué el acta.
- Interpretación señalada (no resuelta): el acta pide “comparador de oportunidades”, pero RF-C-06 es el comparador de **instrumentos**; moví ese requisito.

## Solicitudes a la Ventana A

- Reflejar el renombrado `evidence` (G0 #10) en el SQL antes de ejecutarlo.
- Aclarar si `T-WEB-03…09` incluyen la interfaz y añadir tareas para historial público, ajustes/borrado de cuenta y consentimiento (de la Ronda 2).

## Solicitudes de cambio al contrato / alcance

- Ninguna. **Una aclaración para el usuario/orquestador:** el acta incluye Crédito Público en el corte vertical, pero la decisión #5 limita la automatización a DGCP hasta contratar abogado. B lo trata como carga manual de Crédito Público hasta esa opinión (backlog §7).

## Próximo paso

- Sprint 1 puede empezar con lo que no depende de las condiciones abiertas; B arranca EN-01/EN-03 y las entrevistas de personas (PERSONAS §7.3) cuando haya equipo.
