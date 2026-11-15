# ESTADO — Ventana B

> Actualizar al final de **cada** turno. Es la fuente que lee el orquestador.
> No escribir aquí planes largos: solo estado. Los entregables van en sus archivos.

**Última actualización:** 2026-11-15 (Ronda 5)
**Sprint:** 0 cerrado por `G0-ACTA.md`; Sprint 1 autorizado.
**Estado:** RONDA 5 COMPLETA. Política P0 reconciliada en todos los documentos de B. Ninguna prueba ejecutada; ningún código escrito.

## Hecho en este turno (Ronda 5)

- Leí la entrada de A de las 22:00, `schema-propuesto.sql` (`economic_events_publish_guard` y `app.enforce_event_publication`), CC-23 y AC-02-04. **La contradicción era real** y estaba en mis documentos.
- **Política P0 aplicada** (en cola = invisible para `viewer`; solo `opportunity_manager+` publica deliberadamente; entonces es visible con etiqueta y fuentes; worker nunca; `pending` nunca; si empeora, vuelve a cola):
  - `ESTRATEGIA-PRUEBAS` v0.3.0: CC-23 reescrito y nuevo **CC-24** (disputed en cola invisible → manager publica y se ve con etiqueta y fuentes → worker falla). 24 casos críticos; G-22 exige CC-01…CC-24.
  - `INVENTARIO-PANTALLAS` v0.3.0: AC-02-04 corregido y nuevo AC-02-05 (vuelta a cola).
  - `FICHAS-CLAVE` v0.4.0: `disputed` visible solo tras publicación deliberada, AC-FC-E-03/05, `released_at` en FC-04.
  - Alineados: RF-A-11 (REQUISITOS v0.4.1), PERSONAS (permiso de publicar eventos no verificados y ver la cola; UC-03), SISTEMA-DISENO, backlog v0.3.1 (US-A-11, gate G4).
- Revisadas todas las referencias a `disputed` en mis documentos: las demás (RF-F-01, CC-11, AC-FC-O-03, SISTEMA-DISENO §6.4) ya eran compatibles.
- Verificado por script: 24 CC sin referencias huérfanas; 82 historias MVP; AC-02-01…05.
- Respuesta a A en `BANDEJA.md` con las 3 recomendaciones pedidas.

## En progreso

- Nada.

## Bloqueos

- Condiciones abiertas de la acta §3 (todas `[PENDIENTE USUARIO]`): proyecto Supabase nuevo, proveedor LLM, abogado, nombres y dedicación del equipo, anotadores y revisores, contacto del `User-Agent`, hosting.
- **B-016** (política de publicación de eventos): B-lado resuelto con esta ronda; queda la decisión del usuario sobre las 3 recomendaciones.
- **B-017** (`reviewed_by` sin `ON DELETE`) y **B-018** (un `viewer` puede leer `review_notes` y `reviewed_by` por `GRANT` de tabla): abiertos en A/abogado. **B-018 afecta a mi UX:** mi recomendación es que el `viewer` vea “Revisado por [rol]” sin nombre ni notas internas; con el `GRANT` actual eso no está garantizado.

## Decisiones tomadas (con justificación)

- Ninguna de alcance. Apliqué la reconciliación aprobada por el orquestador.
- Recomendaciones a A (decide el usuario): publica `opportunity_manager+`, no `analyst`; sin doble llave en el MVP; seudonimizar cuentas de revisores, no borrarlas (pendiente del abogado, B-017).

## Solicitudes a la Ventana A

- Responder las dos preguntas de la bandeja: qué ve un `viewer` al abrir el enlace de un evento que volvió a cola, y si las notificaciones ya enviadas se marcan `superseded`.
- Resolver B-018 antes de que la UI muestre “Revisado por”.
- Reflejar `evidence` (G0 #10) en el SQL y confirmar `released_at` para el KPI del dashboard.

## Solicitudes de cambio al contrato / alcance

- Ninguna.

## Próximo paso

- El usuario decide sobre B-016, B-017 y B-018; B ajusta la UX de “Revisado por” y de enlaces a eventos en cola según la respuesta de A.
