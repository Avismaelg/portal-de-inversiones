import { describe, expect, it, vi } from "vitest";
import { collectNews, makeExcerpt, matchKeywords, parseRss, NEWS_HOSTS } from "@/lib/ingest/news";
import { PoliteClient } from "@/lib/ingest/polite-client";

const rss = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[Indotel firma concesión con Claro y Viettel por US$119.5 millones]]></title>
<link>https://www.indotel.gob.do/nota-1/</link><pubDate>Mon, 16 Nov 2026 17:26:55 +0000</pubDate>
<description><![CDATA[<p>El Indotel &amp; las empresas firmaron la concesión.</p><script>x()</script>]]></description></item>
<item><title>Acto de graduación interno</title><link>https://www.indotel.gob.do/nota-2/</link>
<pubDate>Fri, 13 Nov 2026 10:00:00 +0000</pubDate><description>Ceremonia</description></item>
<item><title>Sin enlace seguro</title><link>http://inseguro.example/x</link></item>
</channel></rss>`;

describe("news", () => {
  it("parsea RSS: CDATA, entidades, fechas y descarta enlaces no https", () => {
    const items = parseRss(rss);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "Indotel firma concesión con Claro y Viettel por US$119.5 millones",
      url: "https://www.indotel.gob.do/nota-1/",
      published_at: "2026-11-16T17:26:55.000Z",
    });
    expect(items[0].excerpt).toBe("El Indotel & las empresas firmaron la concesión.");
  });

  it("el extracto se acota sin cortar palabras", () => {
    const e = makeExcerpt("palabra ".repeat(100), 50)!;
    expect(e.length).toBeLessThanOrEqual(51);
    expect(e.endsWith("…")).toBe(true);
    expect(makeExcerpt(null)).toBeNull();
  });

  it("relevancia ignora tildes y mayúsculas", () => {
    expect(matchKeywords("Concesión de frecuencias", null)).toContain("concesion");
    expect(matchKeywords("Indotel gradúa a 1,500 personas", "programa de telecomunicaciones")).toEqual([]);
    expect(matchKeywords("Aprueban norma del sector energía", "para la industria")).toEqual(["sector", "industria", "energia"]);
    expect(matchKeywords("Sector turístico celebra aniversario", null)).toEqual([]);
    expect(matchKeywords("Acto de graduación interno", "Ceremonia")).toEqual([]);
  });

  it("recolecta solo lo relevante y reporta fallos por feed sin detener el resto", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response(rss, { status: 200 }))
      .mockResolvedValueOnce(new Response("", { status: 500 }));
    const client = new PoliteClient({
      allowedHosts: NEWS_HOSTS,
      clientName: "T/1",
      contact: "c@example.org",
      fetchImpl: f,
      maxRetries: 0,
      sleep: async () => undefined,
    });
    const { news, report } = await collectNews(client, [
      { key: "a", name: "A", url: "https://www.indotel.gob.do/feed/" },
      { key: "b", name: "B", url: "https://www.simv.gob.do/feed/" },
    ]);
    expect(news).toHaveLength(1);
    expect(news[0].source_key).toBe("a");
    expect(report).toEqual([
      { key: "a", ok: true, items: 2, relevant: 1 },
      { key: "b", ok: false, items: 0, relevant: 0 },
    ]);
  });
});
