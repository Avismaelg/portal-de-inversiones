import { describe, expect, it } from "vitest";
import { buildPulse, observationKeyOf, seriesKeyOf, summarizeFx, type ObservationRow } from "@/lib/macro";

const ind = { group: "Inflación", path: ["Inflación Subyacente"], indicator: "Interanual", value: 4.54, as_of: "2026-10-16", data_quality_flags: [] };

const row = (o: Partial<ObservationRow>): ObservationRow => ({
  series_key: "Inflación › Inflación › Interanual",
  group_name: "Inflación",
  category_path: ["Inflación"],
  indicator: "Interanual",
  value: 5.14,
  as_of: "2026-10-16",
  first_seen_at: "2026-11-18T20:00:00Z",
  last_seen_at: "2026-11-18T20:00:00Z",
  data_quality_flags: [],
  ...o,
});

describe("claves", () => {
  it("serie y observación estables", () => {
    expect(seriesKeyOf(ind)).toBe("Inflación › Inflación Subyacente › Interanual");
    expect(observationKeyOf(ind)).toBe("Inflación › Inflación Subyacente › Interanual@2026-10-16=4.54");
    expect(observationKeyOf({ ...ind, as_of: null })).toContain("@-=");
  });
});

describe("buildPulse", () => {
  const now = new Date("2026-11-19T00:00:00Z");

  it("devuelve vacío sin filas", () => {
    expect(buildPulse([], now)).toEqual([]);
  });

  it("toma el último valor, el anterior y la diferencia; marca nuevo", () => {
    const rows = [
      row({ value: 5.14, as_of: "2026-10-16", first_seen_at: "2026-11-17T10:00:00Z", last_seen_at: "2026-11-18T20:00:00Z" }),
      row({ value: 4.9, as_of: "2026-09-16", first_seen_at: "2026-10-20T10:00:00Z", last_seen_at: "2026-11-10T10:00:00Z" }),
    ];
    const [p] = buildPulse(rows, now);
    expect(p.value).toBe(5.14);
    expect(p.previous).toEqual({ value: 4.9, as_of: "2026-09-16" });
    expect(p.change).toBe(0.24);
    expect(p.is_new).toBe(true);
  });

  it("no marca nuevo la primera carga ni lo antiguo", () => {
    expect(buildPulse([row({})], now)[0].is_new).toBe(false);
    const old = [
      row({ first_seen_at: "2026-10-01T00:00:00Z" }),
      row({ value: 1, first_seen_at: "2026-09-01T00:00:00Z", last_seen_at: "2026-09-01T00:00:00Z" }),
    ];
    expect(buildPulse(old, now)[0].is_new).toBe(false);
  });

  it("excluye series que la última carga ya no trajo", () => {
    const rows = [
      row({ series_key: "Sector Real › Imaes › Octubre 2026", indicator: "Octubre 2026" }),
      row({ series_key: "Sector Real › Imaes › Septiembre 2026", indicator: "Septiembre 2026", last_seen_at: "2026-11-01T00:00:00Z", first_seen_at: "2026-10-01T00:00:00Z" }),
    ];
    expect(buildPulse(rows, now).map((p) => p.indicator)).toEqual(["Octubre 2026"]);
  });
});

describe("summarizeFx", () => {
  it("calcula variaciones de la venta y rango", () => {
    const s = summarizeFx([
      { rate_date: "2026-11-17", buying: 60.0061, selling: 60.3424 },
      { rate_date: "2026-11-18", buying: 59.9459, selling: 60.2983 },
      { rate_date: "2026-10-20", buying: 61.0876, selling: 61.52 },
    ])!;
    expect(s.latest.rate_date).toBe("2026-11-18");
    expect(s.previous?.rate_date).toBe("2026-11-17");
    expect(s.daily_pct).toBe(-0.0731);
    expect(s.window_pct).toBe(-1.9859);
    expect(s.window_start).toBe("2026-10-20");
    expect([s.min_selling, s.max_selling, s.days]).toEqual([60.2983, 61.52, 3]);
  });

  it("maneja vacío y un solo día", () => {
    expect(summarizeFx([])).toBeNull();
    const one = summarizeFx([{ rate_date: "2026-11-18", buying: 1, selling: 2 }])!;
    expect([one.daily_pct, one.window_pct, one.previous]).toEqual([null, null, null]);
  });
});
