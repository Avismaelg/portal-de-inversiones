# ADR-0006 — IA independiente del proveedor, sin herramientas con efectos y con revisión humana en el MVP

| Campo | Valor |
|---|---|
| Estado | **ACEPTADO** — G0, 2026-11-15 |
| Fecha | 2026-11-15 |
| Autor | Ventana A |
| Reversibilidad | La interfaz y los esquemas son reversibles; **publicar sin revisión humana, una vez hecho público, no se "deshace"** (daño reputacional/legal) — por eso es el valor por defecto conservador |
| Requisitos | PM §5 y §7; RN-07, C-09 y S-06 de B; RNF-16…22 |
| Documentos | `docs/ia/SISTEMA-IA.md` |

## Contexto

El PM exige: arquitectura independiente del proveedor, salidas estructuradas, trazabilidad, protección contra prompt injection, cálculos financieros deterministas y evaluación antes de publicación automática. No hay proveedor ni presupuesto elegidos, ni conjunto de evaluación.

## Decisión

1. **Interfaz `LlmClient`** con entrada de mensajes + esquema y salida JSON + uso; ningún agente conoce el proveedor.
2. **Los agentes no tienen herramientas con efectos**: solo producen JSON; el código valida y escribe. Sin búsqueda web en el MVP.
3. **Cálculo determinista en código** (finanzas, estados, fechas, monedas, dedup exacta); el LLM extrae, clasifica y redacta; todo número de salida debe existir en entrada o en un cálculo.
4. **Cita literal obligatoria** verificada por código; sin cita, el dato se descarta o se degrada a `inference`.
5. **Revisión humana obligatoria para publicar oportunidades** y, por defecto, para eventos no totalmente verificados. La publicación automática solo se habilita tras superar los umbrales de evals y con aprobación explícita del usuario (puertas P1/P2 de SISTEMA-IA §7.3). El trigger de base de datos impide que un worker o `service_role` publique oportunidades.
6. Cada ejecución se registra en `ai_analysis_runs` (modelo, versión, prompt, tokens, costo, hashes).
7. Presupuesto mensual duro (`AI_MONTHLY_BUDGET_USD`).

## Alternativas

| Alternativa | Motivo |
|---|---|
| Usar el SDK del proveedor directamente en cada agente | Acopla y complica el cambio; contradice PM §7 |
| Agentes autónomos con herramientas (búsqueda, escritura) | Aumenta el riesgo de prompt injection y de acciones no auditadas |
| Publicación automática desde el MVP | Sin golden set ni mediciones, sería declarar calidad sin evidencia (Reglas 1 y 6 del PM) |
| RAG con base vectorial dedicada | Sin requisito que lo exija; la verificación usa citas literales |

## Consecuencias

**Positivas:** superficie de ataque pequeña; trazabilidad completa; costo controlado; cumplimiento de PM.
**Negativas:** cuello de botella humano (C-09 de B); más código determinista; evals y golden sets cuestan tiempo (T-AI-03).

## Condiciones de revisión

Tras cumplir RNF-19 (≤ 2 % de errores materiales) durante el período acordado y obtener visto bueno legal, reconsiderar la revisión por muestreo.

## Resolución (G0, 2026-11-15)

Aceptado en `docs/sprint-0/G0-ACTA.md` (decisiones #3, #4 y #11). G0 #11a: todo evento no verificado al 100 % pasa por cola de revisión humana (puerta P0). G0 #4: un solo proveedor de LLM al inicio y tope mensual bajo; proveedor, clave y cifra siguen pendientes del usuario. Anotadores y revisores sin designar (B-015).
