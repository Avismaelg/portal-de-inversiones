# ESTADO — Ventana A

> Actualizar al final de **cada** turno. Es la fuente que lee el orquestador.

**Última actualización:** 2026-11-15 (retoma tras la sesión anterior de A)
**Supabase nuevo localizado:** `PORTAL DE INVERSIONES` (`xzlwrlgjsdymcidlmqew`), vacío y sano; comprobaciones de solo lectura en `MODELO-DATOS.md` §15.
**Estado:** SQL APLICADO EN SUPABASE (9 migraciones); tenant, 2 fuentes y 1 documento real de Crédito Público cargados en borrador (MODELO-DATOS §18). Pendiente: decidir `coupon` en `rate_kind`, publicar tras revisión, cerrar T-SRC-01.

## Qué encontré al retomar (evidencia: `git status`, `git log`, diff, BANDEJA)

- **Commiteado:** documentos hasta la Ronda 4 (`1c73d8b`), respuesta de B a la guardia (`fcdb6d6`) y habilitadores técnicos de Sprint 1: CI, Vitest, Playwright + axe, Dependabot, gitleaks (`afed0e0`, `86df0f2`, `c234cc2`).
- **Sin commitear (10 archivos):** Ronda 5 de A — `schema-propuesto.sql` (v0.1.1, +311 líneas), `MODELO-DATOS.md` §14, `SEGURIDAD-Y-CUMPLIMIENTO.md` §6.3.1, `SISTEMA-IA.md`, `ARQUITECTURA-MVP.md`, `BLOQUEOS.md`, `BANDEJA.md`, `PLAN-SPRINT-1.md`, `README.md`, `AGENTS.md`.
- **Contenido de la Ronda 5:** B-016 manager+ publica eventos no verificados, sin doble llave; B-017 `app.pseudonymize_user`, FK de revisión `ON DELETE RESTRICT`, PII fuera de `audit_logs`; B-018 `publisher_role`/`reviewer_role` públicos, `review_notes`/`reviewed_by`/`reviewer_id` solo staff vía vistas `staff_*` y GRANT por columna; B-019 estado `superseded`, redacción de notificaciones, republicación con nuevo `dedup_key`. Pruebas P0-12…P0-25 (comentadas, no ejecutadas).
- La entrada de A de las 14:49 en la bandeja pide a B actualizar UX/QA; **B aún no ha respondido**.
- `supabase/migrations/` solo tiene su README; su condición "resolver B-017/18/19 antes de partir el SQL" **ya se cumple**, pero partir sigue bloqueado por B-003 y B-007 (no hay dónde ejecutarlo).

## Hecho en este turno

- Revisión estática del SQL de la Ronda 5: `BEGIN`/`COMMIT` únicos, 54 `$$`, 810/810 paréntesis, sin duplicados de nombres, 23 entidades. Anotado en `MODELO-DATOS.md` §14.1 junto con 5 puntos abiertos (el principal: `pseudonymize_user` no limpia `watchlists`, preferencias ni notificaciones).
- Reescrito este estado (estaba desactualizado: describía la Ronda 4).

## NO verificado

- El SQL YA se aplicó (Supabase `xzlwrlgjsdymcidlmqew`); falta la suite completa de P0 y probar con un JWT real. El script de pruebas se ejecutó y se revirtió.
- No volví a ejecutar lint/tests/build del código de Sprint 1; los resultados del `PLAN-SPRINT-1.md` son del orquestador.
- Qué modelo/sesión hizo la Ronda 5: no consta en el repo; solo lo que dice la bandeja.

## Bloqueos

- B-003 (Supabase), B-006/B-007 (sin Postgres), proveedor LLM, abogado, equipo, anotadores, `User-Agent`, hosting (ADR-0005).

## Decisiones pendientes

- DIS-02…DIS-08. (`pseudonymize_user` ya borra también los datos privados: Ronda 6, no ejecutado.)

## Próximo paso

1. Commit de la Ronda 5 y 6 hecho a petición del usuario.
2. Crear el proyecto Supabase nuevo; ejecutar el SQL en rama y correr P0-01…P0-25 antes de partirlo en migraciones.
3. Esperar la respuesta de B a la entrada de las 14:49.
