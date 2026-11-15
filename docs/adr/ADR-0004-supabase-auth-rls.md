# ADR-0004 — Supabase (Postgres + Auth + Storage) con RLS como red de seguridad

| Campo | Valor |
|---|---|
| Estado | **PROPUESTO** — condicionado a la prueba de humo T-INF-01 y a confirmar el proyecto (B-003) |
| Fecha | 2026-11-15 |
| Autor | Ventana A |
| Reversibilidad | **Difícil** en Auth (identidades y JWT) y en RLS (políticas ligadas a `auth.*`); **moderada** en datos (Postgres estándar). Es la decisión con mayor acoplamiento |
| Requisitos | PM §7 ("Supabase como opción inicial", "RLS donde corresponda"), RNF-24 de B |

## Contexto

El PM prefiere Supabase. **No se pudo verificar nada contra el proyecto real**: el proyecto vinculado (`ecmqmgpruxclmpnnpgzv`) no responde y puede pertenecer a otro producto (B-003). El conocimiento de Supabase usado aquí no se contrastó en esta sesión con su documentación oficial.

## Decisión

1. Usar **Supabase** como Postgres administrado, Auth y Storage, en un **proyecto nuevo y exclusivo** de este producto (staging y producción separados).
2. **Defensa en profundidad:** autorización en servidor **y** RLS en la base. `anon` sin acceso; `authenticated` con políticas por rol de aplicación; `service_role` solo en servidor/workers (`MODELO-DATOS.md` §7).
3. El esquema SQL sigue siendo **Postgres estándar** salvo tres puntos acotados: `auth.users` (FK opcional), el JWT en variables de sesión (`app.current_user_id()` lo abstrae) y los roles `anon/authenticated/service_role`. Esa capa de abstracción (`app.*`) limita el coste de salida.
4. Migraciones versionadas en `supabase/migrations/`; sin cambios manuales en producción.

## Alternativas

| Alternativa | Motivo |
|---|---|
| Postgres autogestionado + Auth propia (p. ej. biblioteca) | Más código de seguridad propio; contradice la preferencia del PM |
| Neon/RDS + Auth0/Clerk | Más proveedores y costos; sin ventaja demostrada |
| Firebase | No es Postgres; el PM exige PostgreSQL |

## Consecuencias

**Positivas:** menos código de autenticación y almacenamiento; RLS integrada con PostgREST; una sola consola.
**Negativas:** acoplamiento a Supabase Auth; privilegios por defecto del esquema `public` hay que revocar explícitamente (el SQL lo hace); límites del plan `[VERIFICAR]`; falta CLI/Docker local (B-006).

## Preguntas abiertas

- ¿Qué plan y región? Región y transferencia internacional de datos personales: `REQUIERE ABOGADO` (L-06).
- ¿Disponibilidad de `pg_cron`, `pgvector`, `pg_trgm` en el plan elegido? (T-INF-01)
- ¿Retención y frecuencia de backups del plan? (RNF-09)

## Condiciones de revisión

Si T-INF-01 revela que algo esencial no está disponible (p. ej. `BYPASSRLS`, extensiones, límites), reabrir.
