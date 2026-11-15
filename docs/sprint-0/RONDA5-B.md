# RONDA 5 — Ventana B (reconciliar la puerta P0)

A respondió en `BANDEJA.md` (entrada de las 22:00) y añadió el trigger `economic_events_publish_guard` al esquema propuesto. Hay una contradicción entre tus documentos y la puerta P0. Esta ronda la cierra. No cambia el alcance.

## 1. Lee

- `docs/sprint-0/BANDEJA.md`, entrada de A de las 22:00.
- `docs/datos/schema-propuesto.sql`, líneas 539–605 (trigger y función de eventos).
- `docs/qa/ESTRATEGIA-PRUEBAS.md`, CC-23.
- `docs/ux/INVENTARIO-PANTALLAS.md`, AC-02-04.

## 2. Reconciliación aprobada (orquestador)

La política P0 queda así:

- Un evento `pending`, `partially_verified`, `disputed` o `unverifiable` **entra en cola** y **no es visible para `viewer` mientras está en cola**.
- Solo una persona con rol `opportunity_manager+` puede **publicarlo deliberadamente**; queda registrada como `reviewed_by`.
- Si se publica, el evento **sí es visible** para `viewer`, con la etiqueta de su estado («En disputa», «Parcialmente verificado») y las fuentes en conflicto.
- Un worker o `service_role` **nunca** publica un evento no verificado. `pending` nunca se publica.
- Si un evento publicado empeora su verificación, **vuelve a la cola** y deja de ser visible hasta que un humano lo republique.

Esto concilia CC-23 con AC-02-04: no es «nunca visible», es «no visible hasta revisión humana».

## 3. Cambios

1. En `docs/qa/ESTRATEGIA-PRUEBAS.md`: reescribe CC-23 con la política anterior. Añade un caso (CC-23b o el siguiente libre) que cubra:
   - evento `disputed` en cola → invisible para `viewer`;
   - manager lo publica → visible con etiqueta y fuentes;
   - worker intenta publicar → error.
2. En `docs/ux/INVENTARIO-PANTALLAS.md`: ajusta AC-02-04 para decir que el evento `disputed` se muestra **solo después de publicación humana deliberada**, con etiqueta y tooltip de fuentes.
3. Revisa otras referencias a `disputed` visible para `viewer` y alinéalas.

## 4. Responde a A en la bandeja

Con recomendaciones, no decisiones finales:

1. **Quién publica eventos no verificados:** `opportunity_manager+` (recomendado), no `analyst`.
2. **Doble llave en `human_review`:** no en el MVP; una persona con auditoría; post-MVP.
3. **Cuentas de revisores:** seudonimizar, no borrar; queda pendiente del abogado (B-017).

## 5. Entrega

- Actualiza `docs/sprint-0/ESTADO-VENTANA-B.md`.
- Añade tu respuesta en `docs/sprint-0/BANDEJA.md`.
- No hagas commit.
- Cierra con el bloque `ESTADO` del contrato.
