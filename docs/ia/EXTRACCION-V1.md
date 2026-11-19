# Agente de extracción — implementación v1

| Campo | Valor |
|---|---|
| Documento | `docs/ia/EXTRACCION-V1.md` |
| Fecha | 2026-11-18 |
| Autor | Ventana A |
| Estado | **Implementado y probado con un cliente simulado.** Migración 26 aplicada y bloque P0 M26 verificado el 2026-11-18. No ejecutado contra la API real (B-011: falta `AI_API_KEY`) |
| Base | `docs/ia/SISTEMA-IA.md` §3, §4.2, §6, §8; ADR-0006; tareas T-AI-01, T-AI-02 y T-AI-04 del backlog técnico |

## 1. Qué se implementó

| Tarea | Entrega | Archivos |
|---|---|---|
| **T-AI-01** — interfaz `LlmClient` independiente del proveedor | `LlmClient`, `LlmRequest`, `LlmResult` y un adaptador Anthropic. Ningún agente importa el SDK | `src/lib/ai/types.ts`, `src/lib/ai/anthropic-client.ts` |
| **T-AI-02** — verificador literal y validador de esquemas | Normalización (mayúsculas, tildes, espacios), cita mínima, comprobación de que la cita contiene el dato, cifras generadas que no están en la fuente | `src/lib/ai/literal.ts` |
| **T-AI-04 (parcial)** — Agente 2 Extraction | Esquema estricto del `EventCandidate`, prompt versionado, delimitador escapado, detección de injection, filtrado determinista y registro en `ai_analysis_runs` | `src/lib/ai/extraction.ts`, `src/lib/ai/injection.ts`, `src/lib/ai/amounts.ts` |
| Interfaz | Sección «Datos estructurados del acontecimiento» en la ficha de una noticia, solo para staff (RLS de `ai_analysis_runs`) | `src/app/(app)/noticias/[id]/extraction-section.tsx`, `src/app/(app)/noticias/extract-button.tsx`, `src/app/(app)/noticias/extract-actions.ts` |
| Datos | Función `record_extraction_run` para guardar la salida filtrada con `agent = 'extraction'` | `supabase/migrations/20261118180000_init_26_extraction_runs.sql` |
| Pruebas | 26 unitarias nuevas (contrato, verificador, importes, injection, adaptador) y bloque M26 de la suite P0 | `src/__tests__/extraction.test.ts`, `literal.test.ts`, `amounts.test.ts`, `llm-client.test.ts`, `supabase/tests/p0_suite.sql` |

## 2. Qué hace

1. Una persona con rol de análisis pulsa **«Extraer datos con IA»** en una noticia.
2. El servidor lee el texto de la fuente (solo en memoria, como el análisis de impacto) y lo envía dentro de un bloque `<documento id="…">` escapado.
3. El modelo devuelve un candidato de acontecimiento con citas literales: organizaciones, ubicación, fecha, importes, condiciones y estado.
4. El código, no el modelo:
   - verifica cada cita contra el texto enviado;
   - descarta la organización, ubicación, importe o fecha cuya cita no exista o no contenga el dato;
   - calcula el importe y detecta la moneda (el modelo solo copia la expresión literal);
   - rechaza cifras del titular, resumen o condiciones que no estén en la fuente;
   - rebaja `permit_approved`/`under_construction`/`operating` a `permit_applied`/`announced`, porque una noticia no es un documento de aprobación;
   - si ninguna cita del acontecimiento se verifica, no publica un evento.
5. El resultado filtrado se guarda en `ai_analysis_runs.output` (staff-only) con modelo, versión de prompt, versión de esquema, tokens, costo y latencia. El texto de la fuente **no** se guarda.

## 3. Reglas de defensa aplicadas

| Control de `SISTEMA-IA` §8 | Cómo |
|---|---|
| I-1 sin herramientas con efectos | El agente solo devuelve JSON; la escritura la hace una función SQL con `SECURITY DEFINER` y rol staff |
| I-2/I-3 separación y delimitadores | Instrucciones en `system`; documento en `<documento id="uuid">`; se escapa `</documento` |
| I-4 esquema estricto | `z.strictObject` en todos los objetos del contrato; enums cerrados |
| I-5 verificador literal | `verifyLiteral` sobre el texto exacto enviado; sin cita, el dato se descarta |
| I-6 detección de injection | Heurística en español e inglés; se marca y se muestra, no se descarta en silencio |
| I-7 sin red ni archivos | El agente no tiene herramientas |
| I-8 entradas reducidas | Titular, extracto y texto principal; nunca credenciales |
| I-10 límites | Texto limitado a 60 000 caracteres y salida a 6 000 tokens; salida guardada < 256 KB |
| I-12 revisión humana | La extracción no publica ni crea eventos: es un candidato para una persona |

## 4. Desviaciones conscientes del diseño

| Punto | Decisión | Motivo |
|---|---|---|
| `source_document_id` en `evidence` | No se usa; el sujeto es la noticia (`subject_type = 'news'`, `subject_id`) | El texto de las noticias no se almacena (términos de las fuentes, B-009), así que no existe un `source_document` al que apuntar |
| Varios acontecimientos por documento | Uno por noticia en v1 | El producto muestra una ficha por noticia; el esquema permite ampliarlo |
| Moneda | La calcula el código a partir del texto y la cita | Evita que el modelo invente «USD» donde la fuente no lo dice |
| Fecha | Exige cita con día, mes y año | Evita inventar el día cuando el texto solo dice «2027» |
| Importes | Se conserva la expresión literal y un valor calculado; si el parseo es ambiguo, `value = null` | Preferible no mostrar una cifra que inventarla |
| Salida cruda del modelo | No se guarda; solo el candidato filtrado | Reduce el riesgo de almacenar contenido inyectado sin revisar |
| `agent` del registro | `'extraction'` en una función propia | `record_ai_run` fija `'financial_analysis'`, incorrecto para este agente |

## 5. Evidencia local

| Comando | Resultado |
|---|---|
| `npm run lint` | OK |
| `npm run typecheck` | OK |
| `npx vitest run` (archivos nuevos) | 26/26 OK |
| `npm run build` | OK; `/noticias/[id]` sigue siendo parcialmente prerenderizada |
| Ejecución con la API real | **No realizada**: falta `AI_API_KEY` |
| Migración 26 aplicada | **Sí** (2026-11-18, SQL Editor del proyecto `xzlwrlgjsdymcidlmqew`); bloque P0 M26 con los 7 casos en el resultado esperado |

## 6. Cómo habilitarlo

1. **Migración 26** — ya aplicada en `xzlwrlgjsdymcidlmqew` (2026-11-18). Si se recrea el entorno, aplicar `supabase/migrations/20261118180000_init_26_extraction_runs.sql` (SQL Editor o `supabase db push`). Sin ella, el botón genera la extracción pero no puede guardarla y la ficha no la muestra.
2. **Configurar la clave** en `.env.local` (nunca en el repo):
   ```
   AI_API_KEY=…
   AI_MODEL_EXTRACTION=            # vacío = AI_MODEL_ANALYSIS o claude-sonnet-5-5
   AI_MONTHLY_BUDGET_USD=5
   ```
3. Entrar con un usuario `analyst`, `opportunity_manager`, `org_admin` o `platform_admin`, abrir una noticia y pulsar «Extraer datos con IA».
4. Verificar en la ficha: el aviso de tope, las citas mostradas y el costo estimado.

## 7. Qué falta (no se declara hecho)

- **T-AI-03**: golden set de extracción con anotación humana (≥ 300 campos por tipo crítico). Sin documentos reales ni anotadores no existe.
- **T-AI-07**: suite adversarial de ≥ 30 casos. Hoy hay heurística y pruebas unitarias, no la suite completa.
- **T-AI-12**: evals en CI e informe mensual de costos por agente.
- Medición de exactitud (RNF-16): no se afirma ningún porcentaje.
- Revisión legal de enviar texto de fuentes a un tercero (B-009/B-017).

## 8. Riesgos residuales

- Una cita puede existir literalmente y no respaldar la interpretación completa del modelo. El código comprueba nombre, ubicación, importe y fecha, pero no la semántica de todas las frases.
- La heurística de injection puede producir falsos positivos (una noticia que cita un intento de manipulación). Se muestra el aviso; no bloquea.
- El costo por extracción no se ha medido con la API real; el registro lo calculará con la tabla de precios de `pricing.ts`.
- El resultado es un candidato: **no crea `economic_events`, no publica y no genera alertas**.
