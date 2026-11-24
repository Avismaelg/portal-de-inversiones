/**
 * Prueba de integración OPT-IN contra la API real de Anthropic.
 *
 * No se ejecuta con `npm test` ni en CI: requiere `RUN_REAL_AI=1` y `AI_API_KEY`
 * (cargada desde `.env.local` por el comando que la lanza). Hace una llamada real
 * que cuesta dinero (céntimos) y lee una noticia pública de Indotel.
 *
 * No escribe en la base de datos: valida el pipeline de extracción (lectura del
 * artículo, llamada al modelo, esquema, verificación literal y filtrado). El
 * registro en `ai_analysis_runs` se cubre con el bloque P0 M26.
 *
 * Uso (PowerShell, sin imprimir la clave):
 *   $env:RUN_REAL_AI="1"
 *   Get-Content .env.local | ForEach-Object {
 *     if ($_ -match '^([A-Za-z0-9_]+)=(.*)$') {
 *       [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
 *     }
 *   }
 *   npx vitest run src/__tests__/extraction-live.test.ts --reporter=verbose
 */
import { describe, expect, it } from "vitest";
import { createLlmClient, resolveModel } from "@/lib/ai/anthropic-client";
import { opencodeRequested } from "@/lib/ai/opencode-client";
import { extractNews } from "@/lib/ai/extraction";
import { estimateCostUsd } from "@/lib/ai/pricing";
import { fetchArticleText } from "@/lib/ingest/article";
import { NEWS_HOSTS, parseRss, type NewsItem } from "@/lib/ingest/news";
import { PoliteClient } from "@/lib/ingest/polite-client";

const RUN = process.env.RUN_REAL_AI === "1";

/** Noticia de referencia: concesión con dos operadores, con hechos y cifras probables. */
const DEFAULT_URL =
  "https://indotel.gob.do/indotel-firma-concesion-con-claro-y-viettel-abre-paso-a-mayor-competencia-en-las-telecomunicaciones-de-rd/";
const FEED_URL = "https://indotel.gob.do/feed/";

function makeClient() {
  return new PoliteClient({
    allowedHosts: NEWS_HOSTS,
    clientName: "AviTech-Extraction/0.1",
    contact: process.env.INGEST_CONTACT?.trim() || "contacto-pendiente",
    maxPerMinute: 10,
    maxRetries: 1,
    baseBackoffMs: 2_000,
  });
}

describe.runIf(RUN)("extracción con la API real (opt-in)", () => {
  it(
    "extrae un acontecimiento de una noticia real y verifica sus citas",
    async () => {
      const url = process.env.LIVE_NEWS_URL?.trim() || DEFAULT_URL;
      const client = makeClient();

      // Metadatos reales del feed; si el feed falla, se usan los mínimos de la propia URL.
      let item: NewsItem = { url, title: "Concesión de telecomunicaciones en República Dominicana", excerpt: null, published_at: null };
      try {
        const feed = await client.get(FEED_URL, { headers: { Accept: "application/rss+xml, application/xml" } });
        if (feed.ok) {
          const found = parseRss(await feed.text()).find((n) => n.url === url);
          if (found) item = found;
        }
      } catch {
        // La prueba sigue con los metadatos mínimos: lo importante es el texto del artículo.
      }

      const body = await fetchArticleText(client, url);
      expect(body, "no se pudo leer el artículo de la fuente").not.toBeNull();
      expect((body ?? "").length).toBeGreaterThanOrEqual(200);

      const llm = createLlmClient();
      expect(llm, "falta AI_API_KEY en el entorno de la prueba").not.toBeNull();

      const model = resolveModel("AI_MODEL_EXTRACTION");
      const started = Date.now();
      const out = await extractNews(
        llm!,
        { ...item, source_name: "Indotel", body },
        { model, documentId: crypto.randomUUID() },
      );
      const latencyMs = Date.now() - started;

      if (!out.ok) {
        throw new Error(`la extracción real falló con motivo «${out.reason}» (modelo ${model})`);
      }

      const { result } = out;
      const cost = estimateCostUsd(model, result.input_tokens, result.output_tokens);
      const evidence = result.extraction.event
        ? {
            kind: result.extraction.event.event_kind,
            status: result.extraction.event.administrative_status,
            organizations: result.extraction.event.organizations.length,
            amounts: result.extraction.event.amounts.length,
            sector_codes: result.extraction.event.sector_codes,
          }
        : null;

      // Evidencia para la documentación: sin claves, sin texto de la fuente y sin citas completas.
      console.log(
        JSON.stringify(
          {
            live_ai: true,
            url,
            title: item.title,
            model,
            latency_ms: latencyMs,
            input_tokens: result.input_tokens,
            output_tokens: result.output_tokens,
            cost_usd: cost,
            prompt_version: result.prompt_version,
            schema_version: result.schema_version,
            used_full_text: result.used_full_text,
            truncated: result.truncated,
            injection_suspected: result.injection_suspected,
            stats: result.extraction.stats,
            event: evidence,
            not_event_reason: result.extraction.not_event_reason,
            warnings: result.extraction.warnings,
          },
          null,
          2,
        ),
      );

      // El CLI de opencode no informa tokens y sus modelos gratuitos cuestan 0: solo se exige con Anthropic.
      if (!opencodeRequested()) {
        expect(result.input_tokens).toBeGreaterThan(0);
        expect(result.output_tokens).toBeGreaterThan(0);
        expect(cost).toBeGreaterThan(0);
      }
      expect(latencyMs).toBeGreaterThan(0);
      expect(result.extraction.stats.evidence_verified).toBeGreaterThan(0);
      expect(result.extraction.event, "la noticia no produjo un acontecimiento").not.toBeNull();
    },
    180_000,
  );
});
