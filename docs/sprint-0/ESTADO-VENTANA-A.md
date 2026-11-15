# ESTADO — Ventana A

> Actualizar al final de **cada** turno. Es la fuente que lee el orquestador.
> No escribir aquí planes largos: solo estado. Los entregables van en sus archivos.

**Última actualización:** 2026-11-15 (Ronda 4)
**Sprint:** 0 cerrado por G0; Sprint 1 autorizado con condiciones abiertas.
**Estado:** TRES CABOS CERRADOS EN DOCUMENTOS. Nada ejecutado: ni SQL, ni instalaciones, ni commit.

## Hecho en este turno (Ronda 4)

1. **Crédito Público:** nota de conciliación G0 #5/#7 en `FUENTES-RD.md` y en `ARQUITECTURA-MVP.md` §14, presentada como conciliación (no decisión nueva): alcance de producto sí, conector no; entra por carga manual; único conector activable en Sprint 1 = DGCP tras T-SRC-01.
2. **Backlog recalculado** (`backlog-tecnico.md` §10; filas marcadas en su sitio, sin borrar): T-AI-09 post-MVP; comparador fuera de T-WEB-06; T-ING-04/05/07 condicionadas; T-WEB-12 y T-SRC-09 Could; T-SRC-07/08 Should; T-ING-06 pasa a camino principal. **El total NO baja: 192,5 → 194,0 d (+0,8 %)**, porque los recortes retiran ≈ 5 d de este backlog y la carga manual principal + puerta P0 añaden ≈ 6,5 d. Base comprometible: 175 d (sin conectores condicionados ni Should/Could). Comparación con B (428 pts): el baseline 20–24 semanas solo es sostenible con 3 personas, o 2 personas a 24 semanas con ≈ 19 % de holgura; 2 personas × 20 semanas no cabe.
3. **Guardia de publicación de eventos** (`schema-propuesto.sql`): columnas `reviewed_by/reviewed_at/review_notes/released_at`, CHECK `economic_events_p0_review` y `economic_events_released`, trigger `economic_events_publish_guard` (función `app.enforce_event_publication`), privilegios por columna sobre `economic_events` y pruebas de humo P0-01…P0-11 (comentadas al final del SQL; sumadas a T-INF-03). **Propuesto, no ejecutado (B-007).**
4. **N provisional de DGCP = 5 años** `[PENDIENTE T-SRC-01]` con tabla de volumen (≈ 0,53 M filas de licitaciones+contratos, bajo un supuesto de reparto uniforme que es falso) y sugerencia de probar con ≈ 1,1 M filas.
5. `MODELO-DATOS.md` §13 documenta la guardia y sus límites.

## NO verificado

- El SQL sigue sin ejecutarse (B-007). El trigger de eventos, las restricciones y los GRANT por columna están revisados solo a mano; un GRANT por columna mal puesto rompería la inserción de eventos desde la app.
- Las cifras de N salen de la ficha de OCP y de un reparto uniforme por año; no hay medición.
- Todo lo de Supabase, fuentes bloqueadas, normas legales y Next 16 sigue como antes.

## Desviaciones respecto a la orden (explícitas)

- La orden pedía `published_at` en la guardia; en este modelo `published_at` es la **fecha de la fuente** (RF-A-06). Usé una columna nueva `released_at` (publicación en la plataforma).
- Añadí privilegios por columna sobre `economic_events` (no pedido): sin ellos un analista podía marcar `verified` y saltarse P0.

## Bloqueos

- Condiciones abiertas de G0 §3 (Supabase nuevo, proveedor LLM, abogado, equipo, anotadores, contacto del `User-Agent`, hosting) y B-007.

## Decisiones propuestas pendientes

- ¿Quién publica eventos no verificados: `analyst` o `opportunity_manager`+ (hoy gestor)? ¿Doble llave en `human_review`? ¿Seudonimizar al revisor en lugar de borrar su cuenta?
- DIS-02…DIS-08 (CONCILIACION §2) siguen abiertas.

## Solicitudes a la Ventana B

- Confirmar el conflicto AC-02-04 (evento `disputed` visible en lista) frente a CC-23 y la salida propuesta (un revisor puede publicar un `disputed`).
- Usar N = 5 provisional para dimensionar RNF-02/03 y aceptar que T-ING-04 queda condicionada.

## Solicitudes de cambio al contrato / alcance

- Ninguna.

## Próximo paso

1. Usuario: Supabase nuevo, abogado, equipo, proveedor LLM, anotadores, `User-Agent`.
2. A: T-SRC-01 (fija N) y, con Supabase, T-INF-01/02/03 (ejecutar el SQL y las pruebas P0).
