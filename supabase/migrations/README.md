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
