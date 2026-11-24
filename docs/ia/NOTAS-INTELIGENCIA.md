# Notas de inteligencia multi-fuente (v1)

Fecha: 2026-11-23 · Rama: `feat/ia-extraccion` · Estado: **migración 27 aplicada y bloque P0 M27 verificado (19/19); sin ejecución real con IA**

## 1. Qué es y qué no es

Es una **nota de análisis generada por IA a partir de varias noticias**. Detecta patrones, decisiones de empresas o del gobierno, implicaciones, escenarios y verificaciones pendientes. Se lee como un artículo breve, pero no es una noticia de un medio.

**No es:**

- una noticia inventada ni un hecho confirmado;
- asesoría de inversión ni una recomendación personalizada;
- una predicción con probabilidad calculada;
- una sustitución de la revisión humana.

La nota queda en capa `ai_analysis`. Los hechos y decisiones que muestra llevan una cita literal; los escenarios son hipótesis y las acciones son de verificación o seguimiento.

## 2. Flujo

1. Un usuario `analyst` o superior entra a `/reportes` y elige un tema (opcional) y un periodo (7, 30 o 90 días).
2. El servidor lee hasta 8 noticias del periodo y, para cada una, intenta leer el artículo completo con `PoliteClient` (solo en memoria; máximo 6 000 caracteres por artículo).
3. `generateBrief()` envía las noticias al modelo con un esquema estricto.
4. `guardBrief()` filtra la salida contra las fuentes reales. Lo que no tiene respaldo se descarta y queda registrado en `warnings`.
5. Si la nota pasa las guardas, se guarda como **borrador** con `record_intelligence_brief` y el intento queda en `ai_analysis_runs`.
6. Un `opportunity_manager`, `org_admin` o `platform_admin` revisa y publica o rechaza con una nota de al menos 10 caracteres (`review_intelligence_brief`).
7. Los lectores solo ven notas publicadas. El contenido publicado es inmutable.

## 3. Reglas duras (código, no solo prompt)

| Regla | Implementación |
|---|---|
| Cita literal por hecho y por decisión | `verifyLiteral()` contra el texto de **esa** noticia (`source_id`), tras normalizar mayúsculas, tildes y espacios |
| Cifras sin inventar | `unsupportedNumbers()`: toda cifra del hecho, decisión, patrón, implicación o acción debe existir en las fuentes citadas |
| Patrón con recurrencia real | Exige al menos **dos noticias distintas** y que al menos dos de ellas tengan un hecho verificado |
| Decisiones atribuidas | El actor debe aparecer literalmente en la fuente; la cita debe ser literal; la fecha, si existe, debe estar respaldada |
| Escenarios sin falsa precisión | Se rechazan porcentajes; las cifras deben estar en las fuentes (se permiten años como horizonte) |
| Acciones permitidas | Solo `verify`, `monitor`, `request_document` o `analyze`; se descartan “comprar/vender/invertir” y textos personalizados (“tu cartera”, “tu empresa”) |
| Consejo de inversión | Si aparece en titular, entradilla, confianza o limitaciones, se rechaza la nota completa (`unsafe`) |
| Inyección de instrucciones | El texto de las fuentes se escapa (`<`/`>` → `&lt;`/`&gt;`) para que no cierre el delimitador `<noticia>` |
| Datos guardados | Solo titulares, enlaces, metadatos y citas cortas; **nunca el texto completo de la fuente** |

Si no hay hechos citables, la nota se rechaza (`unverifiable`). Si no hay un patrón de dos fuentes, se rechaza (`no_patterns`). No se rellena el hueco con una invención.

## 4. Salida

La nota contiene:

- `headline` y `lead`;
- `facts[]`: hecho + `source_id` + cita;
- `patterns[]`: patrón + qué cambió + al menos dos fuentes;
- `decisions[]`: actor, tipo, decisión, estado, fecha y cita;
- `implications[]`: categoría de actor afectada, efecto y dirección;
- `scenarios[]`: hipótesis, horizonte y señales observables;
- `actions[]`: qué verificar o vigilar y por qué;
- `confidence` (baja/media/alta, rebajada por código si hay pocos hechos), `confidence_reason`, `limitations`, `stats` y `warnings`.

La interfaz muestra una caja «Cómo leer esta nota» con la cobertura de evidencia y los controles aplicados.

## 5. Persistencia y permisos (migración 27)

Archivo: `supabase/migrations/20261123120000_init_27_intelligence_briefs.sql`.

| Elemento | Regla |
|---|---|
| `intelligence_briefs` | Nota, periodo, `payload` filtrado, `input_news_ids`, modelo/versiones, `ai_run_id`, revisor y estado |
| `record_intelligence_brief` | Solo staff autenticado; registra el intento en `ai_analysis_runs` (éxito o fallo) y crea la nota en `draft` |
| `review_intelligence_brief` | Solo gestor; exige nota ≥10 caracteres; solo desde `draft` |
| Trigger `enforce_brief_publication` | Al publicar fija revisor y fecha; una nota publicada no se puede despublicar ni editar |
| RLS | Lectores: solo `published`; staff: todo |
| Grants | `SELECT` por columna; los campos de revisión solo se leen desde `staff_intelligence_briefs` |
| Trazabilidad | `ai_analysis_runs`: `agent='opportunity_intelligence'`, `task='intelligence_brief'`, `output` = nota filtrada |

**Nota:** el enum `agent_name` no tiene todavía un valor propio para este flujo; se reutiliza `opportunity_intelligence` con la tarea `intelligence_brief`. Es una deuda de nomenclatura, no un cambio de comportamiento.

## 6. Costo y tope

- Entrada acotada: 2–8 noticias × 6 000 caracteres (más el encargo).
- Salida máxima: 6 000 tokens.
- Con `claude-sonnet-5-5` (2/10 USD por millón de tokens), una nota típica se estima en **US$0,03–0,09**; no se ha medido con la API real.
- Cada intento registra tokens, costo estimado y latencia en `ai_analysis_runs`.
- El tope mensual es `AI_MONTHLY_BUDGET_USD` (5 USD por defecto). Antes de llamar al modelo se consulta `ai_spend_month()`.
- La lectura de hasta 8 artículos puede tardar cerca de un minuto por el límite de 10 peticiones/minuto de `PoliteClient`; en producción depende del límite de ejecución del hosting (B-012).

## 7. Evidencia local (2026-11-23)

| Comprobación | Resultado |
|---|---|
| `npm run lint` | OK |
| `npm run typecheck` | OK |
| `npm run build` | OK; rutas `/reportes` y `/reportes/[id]` generadas |
| `npx vitest run src/__tests__/pattern-brief.test.ts` | 25/25 OK |
| `npm run verify` | OK (lint + typecheck + coverage + build) |
| `npm run test:coverage` | 182 pasan, 2 se saltan; `src/lib` 95,94 % sentencias / 92,05 % ramas / 97,75 % funciones / 97,26 % líneas; `src/lib/ai` 89,73 / 82,4 / 98,5 / 90,04 |
| Migración 27 | **Aplicada** (2026-11-23, MCP `apply_migration` en `xzlwrlgjsdymcidlmqew`, nombre `init_27_intelligence_briefs`) |
| Bloque P0 M27 (`supabase/tests/p0_suite.sql`) | **19/19 en el resultado esperado**; revertido (0 notas, 0 noticias, 0 usuarios y 0 ejecuciones de prueba tras la corrida) |
| Advisors de seguridad de Supabase | Sin clases nuevas: `staff_intelligence_briefs` aparece como *security definer view* y las dos RPC como *SECURITY DEFINER ejecutable por authenticated*, igual que las vistas `staff_*` y RPC existentes (diseño intencionado: filtran con `app.is_staff()` / `app.is_manager()`) |
| Ejecución con IA real | **No realizada**: `AI_API_KEY` existe en `.env.local` pero está vacía (B-011) |
| Prueba en navegador con sesión real | **Parcial (2026-11-23)**: `npm run dev` + Chrome con la sesión del propietario (`platform_admin`). `/reportes` carga y lee `intelligence_briefs` sin error (lista vacía, formulario visible para staff); «Generar nota» responde «Falta la clave de IA (AI_API_KEY) en .env.local.» sin llamar al proveedor ni escribir en la base. Sin probar con roles `viewer`/`analyst`/gestor en interfaz ni con una nota real (B-011, B-020) |
| Golden set / evals / exactitud | **No existen**; no se declara ninguna métrica de exactitud |

La prueba opt-in de la extracción (`src/__tests__/extraction-live.test.ts`) y la de la nota multi-fuente (`src/__tests__/brief-live.test.ts`) están listas y se saltan por defecto. Ninguna se ha ejecutado: la clave está vacía.

## 8. Cómo habilitarlo

1. ~~Aplicar la migración 27~~ (hecho el 2026-11-23).
2. Completar `AI_API_KEY` en `.env.local` (nunca en el repo) y, si se desea, `AI_MODEL_BRIEF` (vacío = `AI_MODEL_ANALYSIS` o `claude-sonnet-5-5`).
3. Entrar con un usuario staff, abrir `/reportes`, generar una nota y revisar la caja de controles.
4. Entrar con un gestor, comprobar las citas y publicar o rechazar con una nota.
5. Verificar en `ai_analysis_runs` el modelo, tokens, costo, latencia y estado del intento.

Prueba real opt-in (sin escribir en la base):

```powershell
$env:RUN_REAL_AI="1"
Get-Content .env.local | ForEach-Object {
  if ($_ -match '^([A-Za-z0-9_]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim(), 'Process')
  }
}
npx vitest run src/__tests__/brief-live.test.ts --reporter=verbose
```

La prueba lee hasta 3 noticias del feed de Indotel, llama al modelo y exige hechos citados y al menos un patrón de dos fuentes. Si el feed no tiene dos noticias o no se puede leer el texto, falla con un mensaje explícito; no se inventa el resultado.

## 9. Límites y pendientes

- **B-011:** falta la clave real; sin ella no hay ninguna llamada al proveedor.
- **B-023:** resuelto el 2026-11-23 (migración 27 aplicada, M27 19/19).
- **B-020:** no hay proyecto/usuarios de prueba para validar RLS y revisión desde la interfaz.
- **B-012:** el hosting puede limitar una acción que tarda cerca de un minuto.
- **B-009/B-017:** revisión legal de enviar texto de fuentes públicas a un tercero y de la línea editorial; la nota evita consejo personalizado, pero el encuadre legal sigue pendiente.
- **T-AI-03/T-AI-07/T-AI-12:** golden set, suite adversarial y evals en CI siguen sin existir para este flujo.
- **UX (Ventana B):** `/reportes` no figuraba en el inventario de pantallas; hay que incorporarlo y revisar el texto de navegación.
- **Nomenclatura:** añadir un valor propio a `agent_name` cuando se pueda migrar el enum sin reutilizar `opportunity_intelligence`.

## 10. Archivos

- Motor y guardas: `src/lib/ai/pattern-brief.ts`
- Pruebas: `src/__tests__/pattern-brief.test.ts`
- Acciones: `src/app/(app)/reportes/actions.ts`
- Lista: `src/app/(app)/reportes/page.tsx`
- Detalle y revisión: `src/app/(app)/reportes/[id]/page.tsx`, `review-form.tsx`
- Formulario de generación: `src/app/(app)/reportes/new-brief-form.tsx`
- Migración: `supabase/migrations/20261123120000_init_27_intelligence_briefs.sql`
- Navegación: `src/app/(app)/layout.tsx`
