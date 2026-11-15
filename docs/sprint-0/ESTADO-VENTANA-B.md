# ESTADO — Ventana B

> Actualizar al final de **cada** turno. Es la fuente que lee el orquestador.
> No escribir aquí planes largos: solo estado. Los entregables van en sus archivos.

**Última actualización:** 2026-11-15 (Ronda 2)
**Sprint:** 0
**Estado:** RONDA 2 COMPLETA — pendiente de decisión del usuario en `G0-DECISIONES.md`. Ninguna prueba ejecutada; ningún código escrito.

## Hecho en este turno (Ronda 2)

- Leí completos los documentos de A: arquitectura, modelo de datos, fuentes, IA, seguridad, `backlog-tecnico` y ADR-0001…0007.
- Respondí en `BANDEJA.md` los 8 puntos de A y registré hallazgos sobre sus documentos.
- **Reconciliación de calendario** (`backlog-producto.md` §4.3–§4.5, v0.2.0):
  - Sumé las 61 tareas de A: 168,5 d-p (cuadra con su cifra).
  - Camino crítico propio con sus dependencias: 43,5 d ≈ 8,7 semanas (suelo teórico, personas ilimitadas, sin esperas).
  - Solo Must: 159,5 d; con habilitadores, brechas, QA y UX (rangos por juicio): 220–276 d. Aritmética: 16 semanas exigen ≈ 2,8–3,5 personas a dedicación plena. **No es una velocidad medida.**
- **Backlog alineado:** dependencias con IDs `T-*` de A; rangos para EN-01…EN-08; 0 conflictos de secuencia; US-A-11 movida a S4.
- **Verificación de Must sin dependencia técnica:** 4 con brecha en A (US-B-06, US-C-09 parcial, US-G-09, US-G-15). Pregunta abierta a A: si `T-WEB-03…09` incluyen la interfaz.
- Escrito `docs/sprint-0/G0-DECISIONES.md`: 14 decisiones del usuario en una página.
- Cambios derivados en mis documentos: REQUISITOS v0.3.0 (RNF-02/03: 100 000 eventos es dataset de prueba), PERSONAS v0.3.0 (§3.3 historial por rol), FICHAS-CLAVE v0.2.0 (FC-06, FC-13).

## En progreso

- Nada. Espero respuesta de A en la bandeja y decisiones del usuario.

## Bloqueos

- B-001/002 (SRS y Plan Maestro), B-003 (Supabase), B-004, B-005, B-006 heredados.
- B-013 (capacidad del equipo), B-014 (herramientas de prueba sin aprobar), B-015 (anotadores y revisores sin definir). A renumeró mis tres filas.

## Decisiones tomadas (con justificación)

- `closing_soon` es estado derivado (≤ 72 h, no se almacena).
- Historial para lectores = vista sanitizada, no acceso a `audit_logs`.
- Postura de producto (recomendaciones, decide el usuario): aprobar DM-01; renombrar DM-03 antes de ejecutar el SQL; recortar del MVP vistas guardadas, comparador y calculadora hasta cerrar V-05 y L-02.
- No se inventó velocidad de equipo: los totales son aritmética sobre los días de A más rangos de B por juicio, marcados como tales.

## Solicitudes a la Ventana A

- Confirmar si `T-WEB-03…09` incluyen la implementación de interfaz.
- Añadir tareas para historial público, ajustes y borrado de cuenta, y consentimiento.
- Fijar `creditopublico.gob.do` como fuente (Hacienda da 403).
- Estimar EN-01…EN-08 desde su lado.

## Solicitudes de cambio al contrato / alcance

- Ninguna al contrato. Alcance: las 14 decisiones de `G0-DECISIONES.md` (entre ellas recortar comparador, calculadora y vistas guardadas; calendario y equipo; cobertura manual de B/E).

## Próximo paso

- El usuario decide en `G0-DECISIONES.md`; B actualiza matriz, backlog y roadmap según lo aprobado.
- Sin G0 aprobado no hay Sprint 1.
