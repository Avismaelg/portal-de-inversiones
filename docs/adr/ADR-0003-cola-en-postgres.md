# ADR-0003 — Cola de trabajos en PostgreSQL (`ingestion_jobs`)

| Campo | Valor |
|---|---|
| Estado | **ACEPTADO** — G0, 2026-11-15 |
| Fecha | 2026-11-15 |
| Autor | Ventana A |
| Reversibilidad | **Reversible** si el acceso se encapsula en una interfaz `JobQueue` |
| Requisitos | PM §7 ("colas de trabajo cuando sean necesarias", "procesamiento idempotente"); RNF-06, RNF-07 de B |

## Contexto

Se necesita ejecutar trabajos con reintentos, concurrencia y trazabilidad. El volumen esperado es **desconocido** `[PENDIENTE: SRS y medición]`; el hecho conocido más pesado es el bulk de DGCP (cientos de MB), que es **poco frecuente y de gran tamaño**, no de muchos mensajes pequeños.

## Decisión

Usar la tabla `ingestion_jobs` como cola: reclamo con `SELECT … FOR UPDATE SKIP LOCKED`, lease (`locked_until`), `attempts`/`max_attempts`, `idempotency_key` único por `(job_type, idempotency_key)`, estados `queued → running → succeeded|failed|failed_schema|dead|skipped_duplicate`. Los jobs hijos (extract, verify…) los crea el worker padre.

## Alternativas

| Alternativa | Motivo de descarte (en el MVP) |
|---|---|
| Redis + BullMQ / SQS / RabbitMQ | Otra pieza que operar, asegurar y monitorizar; sin necesidad demostrada de rendimiento |
| Funciones serverless encadenadas | Límite de tiempo/memoria `[VERIFICAR hosting]`; mala trazabilidad de reintentos |
| `pgmq` u otra extensión | Disponibilidad en Supabase `[VERIFICAR Sprint 1]`; dependencia adicional |
| Programador externo sin cola | No cubre reintentos ni concurrencia |

## Consecuencias

**Positivas:** atomicidad con el resto de los datos (insertar documento y encolar en una transacción), una sola herramienta de respaldo, trazabilidad por SQL.
**Negativas:** la cola comparte recursos con la base transaccional; no está pensada para miles de mensajes por segundo; el *polling* consume conexiones.
**Mitigación:** índice parcial `WHERE status='queued'`, lease corto, concurrencia limitada, prueba de concurrencia (T-INF-09), interfaz `JobQueue` para migrar.

## Condiciones de revisión

Migrar si el tiempo de reclamo p95 supera `[umbral a definir]` o si los jobs encolados por minuto superan el valor medido en T-INF-09.

## Resolución (G0, 2026-11-15)

Aceptado en `docs/sprint-0/G0-ACTA.md` (decisión #3). Sin cambios al contenido técnico.
