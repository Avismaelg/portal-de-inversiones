# ADR-0001 — Monolito modular con workers asíncronos para el MVP

| Campo | Valor |
|---|---|
| Estado | **ACEPTADO** — G0, 2026-11-15 |
| Fecha | 2026-11-15 |
| Autor | Ventana A |
| Reversibilidad | **Parcialmente reversible**: separar un módulo en servicio es posible si los límites se respetan; rehacer un monolito acoplado no |
| Documentos | `docs/arquitectura/ARQUITECTURA-MVP.md` |
| Requisitos | `[PENDIENTE SRS]`; PM §7 ("evitar microservicios innecesarios… monolito modular con trabajadores asíncronos desacoplados") |

## Contexto

Producto con 6 módulos (A–F) que comparten datos relacionales fuertes (evento → oportunidad → evidencia), un equipo pequeño `[PENDIENTE: tamaño]`, un plan de 16 semanas sujeto a validación y ninguna medición de carga. El PM prefiere Next.js + TypeScript + Supabase y desaconseja microservicios.

## Decisión

1. **Una sola aplicación Next.js 16** (TypeScript) con módulos de dominio en carpetas separadas y reglas de dependencia verificadas por lint (`A–F → ingest → core`; los módulos de negocio no se leen tablas entre sí).
2. **Workers asíncronos desacoplados** del proceso web para ingesta, extracción, verificación, oportunidades y alertas (ADR-0002, ADR-0003).
3. **PostgreSQL (Supabase) como única fuente de verdad**; la comunicación entre web y workers pasa por la base (estados y cola), no por llamadas directas.
4. Contratos entre módulos con esquemas (`zod`/JSON Schema) versionados.

## Consecuencias

**Positivas:** un solo despliegue y una sola base que operar; transacciones simples; coste bajo; límites claros que permiten extraer un módulo después.
**Negativas:** un fallo no capturado del web puede afectar a todos los módulos; escalado por unidad completa (aceptable al volumen esperado `[a medir]`); disciplina necesaria para que no se rompan los límites.

## Alternativas descartadas

| Alternativa | Motivo |
|---|---|
| Microservicios por módulo | Sin evidencia de necesidad; costos de red, contratos, observabilidad distribuida, despliegue y consistencia; modelo de datos muy relacional |
| Monolito sin workers | La ingesta (cientos de MB, parseo, LLM) no cabe en peticiones web ni en funciones serverless con límite de tiempo |
| Arquitectura orientada a eventos con broker | Pieza adicional sin necesidad demostrada (ver ADR-0003) |

## Condiciones de revisión

Reabrir si una medición (RNF-02/04 de B) muestra que un módulo no cumple su objetivo por escala, o si el equipo crece al punto de necesitar despliegues independientes.

## Verificación

Lint de imports falla ante una dependencia prohibida (T-INF-05); informe de carga (Fase 6).

## Resolución (G0, 2026-11-15)

Aceptado en `docs/sprint-0/G0-ACTA.md` (decisión #3). Sin cambios al contenido técnico.
