# ADR-0002 — Lenguaje de los workers: Python (propuesta) frente a TypeScript

| Campo | Valor |
|---|---|
| Estado | **PENDIENTE** — experimento en Sprint 1 antes de decidir (G0 #3) |
| Fecha | 2026-11-15 |
| Autor | Ventana A |
| Reversibilidad | **Reversible con coste moderado** mientras los contratos (esquemas JSON y SQL) sean independientes del lenguaje |
| Requisitos | PM §7: "TypeScript o Python según responsabilidades"; stack: "Python 3.12 para pipelines ETL/ELT" (`AGENTS.md`) |

## Contexto

Los workers parsean XLSX/CSV/JSONL/PDF, descargan archivos grandes y llaman a un LLM. El entorno tiene Node 24 y Python 3.12.10 (AUDITORIA §2). **No se ha medido** el rendimiento de ninguna alternativa ni se ha comparado la calidad de parsers de PDF.

## Opciones

| Opción | A favor | En contra |
|---|---|---|
| **A. Python** (propuesta) | Ecosistema maduro para tablas y PDF; streaming de JSONL sencillo; alinea con lo que el PM sugiere para ETL | Dos runtimes y dos CI; tipos compartidos requieren generar desde JSON Schema; despliegue de otro entorno (Docker no está instalado localmente, B-006) |
| **B. TypeScript** | Un solo lenguaje, tipos compartidos con el web, un solo CI | Parsing de PDF/XLSX menos cómodo `[no medido]`; hilos para cargas CPU |
| C. Mixto por fuente | Flexible | Complejidad máxima |

## Decisión propuesta

Python para ingesta/extracción/parsing, **detrás de contratos neutrales**: esquemas JSON (`ai/schemas`), tablas SQL y la tabla `ingestion_jobs`. Cualquier worker (Python o TS) puede sustituirse sin tocar el resto.

**Para tomar la decisión final**, ejecutar en Sprint 1 un experimento acotado (requiere aprobación, porque Sprint 0 prohíbe código): procesar el bulk DGCP real en ambas opciones y comparar memoria pico, tiempo y líneas de código. Hasta entonces **no se construye nada que dependa del lenguaje**.

## Consecuencias si se aprueba A

Se necesita: gestión de dependencias Python (el entorno actual no tiene `uv`/`pnpm`), imagen de ejecución para los workers (hosting, ADR-0005), pruebas y lint en CI para Python. Cada dependencia nueva requiere aprobación (Regla 5 del PM).

## Condiciones de revisión

Si el experimento no muestra ventaja clara de Python, preferir B (menos piezas).

## Resolución (G0, 2026-11-15)

Sigue **PENDIENTE** (`docs/sprint-0/G0-ACTA.md`, decisión #3): se decide tras el experimento de Sprint 1 descrito arriba. No se construye nada que dependa del lenguaje antes.
