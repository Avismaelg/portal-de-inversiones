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

| 20261115195000 | `rls_auto_enable()` sin `EXECUTE` para `PUBLIC`, `anon` y `authenticated` (migración 08) |
| 20261115200000 | Alta de usuarios: trigger `on_auth_user_created` sobre `auth.users` (migración 09) |

**Alta de usuarios (migración 09):** cada registro en Auth crea su fila en `public.users` con rol `viewer` y en la **primera organización de tipo `tenant`** (MVP de una sola organización, G0 #13). Si no existe esa organización, **el registro falla a propósito**: hay que crearla antes del primer alta. El rol y los metadatos del cliente se ignoran; los roles superiores solo se asignan con `app.set_user_role`. Las versiones registradas por Supabase de las migraciones 08 y 09 pueden diferir en el número de versión de los nombres de archivo de este repositorio.

**Suite de pruebas:** `supabase/tests/p0_suite.sql` (3 bloques, se revierten solos).
| 20261115201000 | `rate_kind` gana el valor `coupon` (migración 10; un valor de enum no se puede quitar) |

## Aplicado el 2026-11-16

- `20261116120000_init_11_unpublish_reason.sql`: `unpublished_at` y `unpublish_reason` en `financial_instruments` e `instrument_auctions` (despublicar con motivo). Aplicada en el proyecto «PORTAL DE INVERSIONES».
- `20261116130000_init_12_news_items.sql`: tabla `news_items` (titular, extracto ≤ 400, enlace, fechas, capa `inference`), RLS: lectura para autenticados, inserción solo staff. Aplicada.
- `20261117100000_init_15_news_analyses_deep.sql` — análisis profundo de noticias (escenarios, cadena de valor, oportunidades, qué vigilar). Aplicada.
- `20261117120000_init_16_tender_publication_guard.sql` — guardia de publicación de licitaciones (borrador por defecto, gestor + nota, revisor inmutable, procedencia). Aplicada el 2026-11-17; verificada con `supabase/tests/p0_suite.sql` bloque D.
- `20261117130000_init_17_entity_type_news.sql` — valor `news` en `entity_type` (notificaciones y ejecuciones IA sobre noticias). Aplicada.
- `20261117140000_init_18_guards_ops_ai_notifications.sql` — licitaciones publicadas editables solo por gestores; guardia de publicación de proyectos y permisos; operación de fuentes (`record_ingestion_run`); registro y gasto de IA (`record_ai_run`, `ai_spend_month`); notificaciones in-app (`push_my_notifications`). Aplicada; verificada con bloque E.
- `20261117150000_init_19_propose_opportunity.sql` — `propose_opportunity_from_news`: noticia → documento fuente → acontecimiento (pendiente) → oportunidad en borrador. Aplicada; verificada con bloque F.
