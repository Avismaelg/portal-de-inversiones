/**
 * Prueba de integración OPT-IN de la nota de inteligencia multi-fuente contra la API real.
 *
 * No se ejecuta con `npm test` ni en CI: requiere `RUN_REAL_AI=1` y `AI_API_KEY`
 * (cargada desde `.env.local` por el comando que la lanza). Hace una llamada real que
 * cuesta céntimos y lee noticias públicas del feed de Indotel.
 *
 * No escribe en la base de datos: valida lectura de fuentes, llamada al modelo, esquema,
 * verificación literal, patrón de dos fuentes y guardas de consejo de inversión.
 *
 * Uso (PowerShell, sin imprimir la clave):
 *   $env:RUN_REAL_AI="1"
 *   Get-Content .env.local | ForEach-Object {
 *     if ($_ -match '^([A-Za-z0-9_]+)=(.*)$') {
 *       [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
 *     }
 *   }
 *   npx vitest run src/__tests__/brief-live.test.ts --reporter=verbose
 */
import { describe, expect, it } from "vitest";
import { createLlmClient, DEFAULT_ANALYSIS_MODEL } from "@/lib/ai/anthropic-client";
import { estimateCostUsd } from "@/lib/ai/pricing";
import { generateBrief, type BriefSource } from "@/lib/ai/pattern-brief";
import { todayInRD } from "@/lib/format";
import { fetchArticleText } from "@/lib/ingest/article";
import { NEWS_HOSTS, parseRss } from "@/lib/ingest/news";
import { PoliteClient } from "@/lib/ingest/polite-client";

const RUN = process.env.RUN_REAL_AI === "1";
const FEED_URL = "https://indotel.gob.do/feed/";

function makeClient() {
  return new PoliteClient({
    allowedHosts: NEWS_HOSTS,
    clientName: "AviTech-Brief-Live/0.1",
    contact: process.env.INGEST_CONTACT?.trim() || "contacto-pendiente",
    maxPerMinute: 10,
    maxRetries: 1,
    baseBackoffMs: 2_000,
  });
}

describe.runIf(RUN)("nota de inteligencia con la API real (opt-in)", () => {
  it(
    "genera una nota con hechos citados y al menos un patrón de dos fuentes",
    async () => {
      const client = makeClient();
      const feed = await client.get(FEED_URL, { headers: { Accept: "application/rss+xml, application/xml" } });
      expect(feed.ok, "el feed de Indotel no respondió").toBe(true);

      const items = parseRss(await feed.text()).filter((n, i, all) => all.findIndex((x) => x.url === n.url) === i).slice(0, 3);
      expect(items.length, "el feed no trajo al menos dos noticias").toBeGreaterThanOrEqual(2);

      const sources: BriefSource[] = [];
      for (const item of items) {
        const body = await fetchArticleText(client, item.url);
        sources.push({ ...item, id: item.url, source_name: "Indotel", body });
      }
      expect(sources.some((s) => (s.body ?? "").length >= 200), "ninguna noticia tuvo texto legible").toBe(true);

      const llm = createLlmClient();
      expect(llm, "falta AI_API_KEY en el entorno de la prueba").not.toBeNull();

      const model = process.env.AI_MODEL_BRIEF?.trim() || process.env.AI_MODEL_ANALYSIS?.trim() || DEFAULT_ANALYSIS_MODEL;
      const started = Date.now();
      const out = await generateBrief(llm!, sources, {
        model,
        scope: { label: "Prueba en vivo de Indotel", start: todayInRD(-59), end: todayInRD(0) },
      });
      const latencyMs = Date.now() - started;

      if (!out.ok) {
        throw new Error(
          `la nota real falló con motivo «${out.reason}» (modelo ${out.model ?? model}, tokens ${out.usage?.input_tokens ?? 0}/${out.usage?.output_tokens ?? 0})`,
        );
      }

      const { result } = out;
      const cost = estimateCostUsd(result.model, result.input_tokens, result.output_tokens);
      console.log(
        JSON.stringify(
          {
            live_brief: true,
            model: result.model,
            sources: sources.length,
            sources_with_text: sources.filter((s) => (s.body ?? "").length >= 200).length,
            latency_ms: latencyMs,
            input_tokens: result.input_tokens,
            output_tokens: result.output_tokens,
            cost_usd: cost,
            headline: result.headline,
            stats: result.stats,
            warnings: result.warnings,
          },
          null,
          2,
        ),
      );

      expect(result.facts.length).toBeGreaterThan(0);
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.scenarios.length).toBeGreaterThan(0);
      expect(result.stats.evidence_coverage).toBeGreaterThan(0);
      expect(result.input_tokens).toBeGreaterThan(0);
      expect(result.output_tokens).toBeGreaterThan(0);
      expect(cost).toBeGreaterThan(0);
      expect(latencyMs).toBeGreaterThan(0);
    },
    240_000,
  );
});
