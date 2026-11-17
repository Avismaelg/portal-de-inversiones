import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deadlineLabel, formatDate, formatMoney, formatPercent, hoursAgoIso, todayInRD } from "@/lib/format";
import { extractArticleText, fetchArticleText } from "@/lib/ingest/article";
import { collectMedia, MEDIA_HOSTS } from "@/lib/ingest/news";
import { PoliteClient } from "@/lib/ingest/polite-client";
import { initials, timeAgo } from "@/lib/news-format";

describe("news-format", () => {
  const now = new Date("2026-11-17T12:00:00Z");
  it("timeAgo en minutos, horas, días y fecha absoluta", () => {
    expect(timeAgo(null, now)).toBe("sin fecha");
    expect(timeAgo("2026-11-17T11:59:50Z", now)).toBe("ahora");
    expect(timeAgo("2026-11-17T11:45:00Z", now)).toBe("hace 15 min");
    expect(timeAgo("2026-11-17T09:00:00Z", now)).toBe("hace 3 h");
    expect(timeAgo("2026-11-16T11:00:00Z", now)).toBe("hace 1 día");
    expect(timeAgo("2026-11-10T11:00:00Z", now)).toBe("hace 7 días");
    expect(timeAgo("2026-08-01T12:00:00Z", now)).toMatch(/2026/);
  });
  it("initials ignora conectores cortos", () => {
    expect(initials("Hacienda y Economía")).toBe("HE");
    expect(initials("Indotel")).toBe("IN");
    expect(initials("SIMV")).toBe("SI");
    expect(initials("")).toBe("?");
  });
});

describe("format", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("deadlineLabel: sin fecha, cerrada, horas y días", () => {
    expect(deadlineLabel(null)).toBeNull();
    expect(deadlineLabel("2026-11-17T11:00:00Z")).toBe("Cerrada para ofertas");
    expect(deadlineLabel("2026-11-17T17:30:00Z")).toBe("Cierra en 5 h");
    expect(deadlineLabel("2026-11-20T13:00:00Z")).toBe("Cierra en 3 día(s)");
  });
  it("hoursAgoIso y todayInRD usan la hora actual y la zona de RD", () => {
    expect(hoursAgoIso(2)).toBe("2026-11-17T10:00:00.000Z");
    expect(todayInRD()).toBe("2026-11-17");
    expect(todayInRD(15)).toBe("2026-12-02");
  });
  it("vacíos muestran «No disponible»", () => {
    expect(formatMoney(null, "DOP")).toBe("No disponible");
    expect(formatPercent(undefined)).toBe("No disponible");
    expect(formatDate("fecha-mala")).toBe("No disponible");
    expect(formatDate(null)).toBe("No disponible");
  });
});

const client = (f: typeof fetch, hosts: readonly string[]) =>
  new PoliteClient({ allowedHosts: hosts, clientName: "T/1", contact: "c@example.org", fetchImpl: f, maxRetries: 0, sleep: async () => undefined });

describe("article", () => {
  const long = "Texto principal de la nota institucional. ".repeat(10);
  it("prefiere <article> y quita menús y scripts", () => {
    const html = `<html><body><nav>Menú</nav><article><h1>Título</h1><script>x()</script><p>${long}</p></article><footer>Pie</footer></body></html>`;
    const t = extractArticleText(html);
    expect(t).toContain("Texto principal");
    expect(t).not.toContain("Menú");
    expect(t).not.toContain("x()");
  });
  it("recorta a 8000 caracteres", () => {
    expect(extractArticleText(`<main>${"a ".repeat(6000)}</main>`).length).toBe(8001);
  });
  it("fetchArticleText: texto útil, texto corto, error HTTP y host no permitido", async () => {
    const f: typeof fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(`<article>${long}</article>`, { status: 200 }))
      .mockResolvedValueOnce(new Response("<article>corto</article>", { status: 200 }))
      .mockResolvedValueOnce(new Response("", { status: 404 }));
    const c = client(f, ["indotel.gob.do"]);
    expect(await fetchArticleText(c, "https://indotel.gob.do/a")).toContain("Texto principal");
    expect(await fetchArticleText(c, "https://indotel.gob.do/b")).toBeNull();
    expect(await fetchArticleText(c, "https://indotel.gob.do/c")).toBeNull();
    expect(await fetchArticleText(c, "https://otro.example/d")).toBeNull();
  });
});

describe("collectMedia", () => {
  it("toma solo ítems con fecha y sigue si un medio falla", async () => {
    const rss = `<rss><channel>
      <item><title>Nota con fecha</title><link>https://eldinero.com.do/a</link><pubDate>Mon, 16 Nov 2026 18:00:00 +0000</pubDate></item>
      <item><title>Nota sin fecha</title><link>https://eldinero.com.do/b</link></item>
    </channel></rss>`;
    const f: typeof fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response(rss, { status: 200 }))
      .mockRejectedValueOnce(new Error("red caída"));
    const out = await collectMedia(client(f, MEDIA_HOSTS), [
      { key: "x", name: "X", url: "https://www.diariolibre.com/rss/economia.xml" },
      { key: "eldinero", name: "El Dinero", url: "https://eldinero.com.do/feed/" },
      { key: "dt", name: "DT", url: "https://dominicantoday.com/feed/" },
    ]);
    expect(out).toEqual([
      { source_key: "eldinero", source_name: "El Dinero", url: "https://eldinero.com.do/a", title: "Nota con fecha", published_at: "2026-11-16T18:00:00.000Z" },
    ]);
  });
});
