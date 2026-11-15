# Migraciones de Supabase

`docs/datos/schema-propuesto.sql` es el **diseño de referencia**, no una migración ejecutable todavía.

## Estado

- No hay proyecto Supabase válido (B-003).
- El SQL no se ha ejecutado nunca (B-007); RLS, triggers y funciones no están probados.
- Antes de partirlo en migraciones hay que resolver:
  - **B-017:** borrado/seudonimización de cuentas de revisores.
  - **B-018:** `review_notes` y `reviewed_by` legibles por `viewer`.
  - **B-019:** estado `superseded` en notificaciones y comportamiento de enlaces despublicados.
- Las decisiones de G0 ya están aplicadas al diseño (DM-03 `evidence`, guardia P0 de eventos, recortes de alcance).

## Convención

- Nombre: `YYYYMMDDHHMMSS_descripcion.sql`.
- Una migración por cambio coherente; **nunca** editar una migración ya aplicada.
- Sin secretos, sin datos personales y sin datos reales.
- Semilla de desarrollo en `supabase/seed.sql`; datos de demostración con `is_demo = true`.

## Orden previsto

1. `0001_init.sql` — extensiones, tipos, esquema `app`, tablas y restricciones.
2. `0002_rls.sql` — RLS, políticas y `GRANT` por columna.
3. `0003_triggers.sql` — auditoría, publicación, verificación y particiones.
4. `0004_views.sql` — vistas y funciones de lectura.
5. `0005_seed_dev.sql` — datos sintéticos de desarrollo (nunca en producción).

## Regla de ejecución

Ninguna migración se ejecuta contra un proyecto real sin:

1. Proyecto Supabase nuevo y exclusivo (G0 #2a).
2. Rama o proyecto de pruebas.
3. Suite RLS y P0 en verde.
4. Copia de seguridad y plan de reversión.

## Aplicado el 2026-11-15 (actualiza lo anterior)

Las 7 migraciones de esta carpeta se aplicaron al proyecto Supabase `PORTAL DE INVERSIONES` (`xzlwrlgjsdymcidlmqew`) con la herramienta MCP, en orden. **Los archivos son la copia del SQL aplicado** (sin comentarios ni blancos, para reducir tamaño); la versión comentada y de referencia sigue en `docs/datos/schema-propuesto.sql`. El orden real **no** sigue la lista "prevista" de arriba: se partió el SQL en bloques contiguos y se añadió `07` para fijar `search_path` en 5 funciones. Las condiciones B-017/B-018/B-019 de arriba ya estaban resueltas.

| Versión | Contenido |
|---|---|
| 20261115194248 | Extensión `pg_trgm` (en `extensions`), esquema `app`, tipos, funciones base, referencia, `users` y `users_auth_fk` |
| 20261115194320 | Fuentes, jobs, documentos, trazabilidad de IA, eventos y su guardia P0 |
| 20261115194411 | Proyectos, permisos, licitaciones, contratos, instrumentos, subastas, oportunidades, evidencia, relaciones, verificaciones |
| 20261115194457 | Funciones de visibilidad, watchlist, alertas, notificaciones, auditoría particionada, `set_user_role`, `pseudonymize_user` |
| 20261115194526 | Vistas `staff_*` y privilegios |
| 20261115194527 | RLS y políticas |
| 20261115194548 | `search_path` fijo en 5 funciones (aviso del *advisor*) |

Sin datos de negocio: solo los 11 sectores. Pruebas P0 ejecutadas en una transacción revertida: ver `docs/datos/MODELO-DATOS.md` §16.
