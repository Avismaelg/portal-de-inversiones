import { describe, expect, it } from "vitest";
import {
  buildMacroNotifications,
  buildPulse,
  fxDailyMoves,
  ipcToIndicators,
  parseFxThreshold,
  unitFor,
  type MacroAlertPref,
  type ObservationRow,
} from "@/lib/macro";

const now = new Date("2026-11-19T00:00:00Z");
const row = (o: Partial<ObservationRow>): ObservationRow => ({
  id: "00000000-0000-0000-0000-000000000001",
  series_key: "Inflación › Inflación › Interanual",
  group_name: "Inflación",
  category_path: ["Inflación"],
  indicator: "Interanual",
  value: 5.14,
  as_of: "2026-10-16",
  unit: null,
  first_seen_at: "2026-11-18T20:00:00Z",
  last_seen_at: "2026-11-18T20:00:00Z",
  data_quality_flags: [],
  ...o,
});
const pref = (o: Partial<MacroAlertPref>): MacroAlertPref => ({
  id: "p1", name: "Macro", macro_new_data: false, macro_trend_change: false, fx_daily_move_pct: null, ...o,
});

describe("unidades e IPC", () => {
  it("asigna unidades verificadas y deja sin unidad la tasa de cambio", () => {
    expect(unitFor("Sector Externo › Reservas Internacionales › Brutas")).toBe("US$ millones");
    expect(unitFor("Sector Externo › Cuentas Corrientes › 2025")).toBe("% del PIB");
    expect(unitFor("Monetarias › Tasas de interés › Activa")).toBe("% (promedio ponderado)");
    expect(unitFor("Sector Externo › Tasas de cambio › Venta")).toBeNull();
    expect(unitFor("IPC › Índice de precios al consumidor")).toBe("índice");
  });

  it("convierte el IPC en una serie mensual", () => {
    expect(ipcToIndicators([{ month_start: "2025-01-01", value: 131.2 }])).toEqual([
      { group: "IPC", path: [], indicator: "Índice de precios al consumidor", value: 131.2, as_of: "2025-01-01", data_quality_flags: [] },
    ]);
  });
});

describe("pulso: novedad, dirección y unidad", () => {
  const ipcRow = (as_of: string, value: number) =>
    row({ series_key: "IPC › Índice de precios al consumidor", group_name: "IPC", category_path: [], indicator: "Índice", as_of, value });

  it("una carga inicial con varios meses no cuenta como nuevo pero sí detecta el cambio de dirección", () => {
    const [p] = buildPulse([ipcRow("2026-10-01", 140), ipcRow("2026-09-01", 141), ipcRow("2026-08-01", 139)], now);
    expect(p.value).toBe(140);
    expect(p.is_new).toBe(false);
    expect(p.trend_reversal).toBe(true);
    expect(p.unit).toBe("índice");
    expect(p.points).toBe(3);
  });

  it("sin reversa cuando sigue la misma dirección", () => {
    const rows = [
      row({ value: 3, first_seen_at: "2026-11-18T00:00:00Z" }),
      row({ value: 2, first_seen_at: "2026-10-18T00:00:00Z" }),
      row({ value: 1, first_seen_at: "2026-09-18T00:00:00Z" }),
    ];
    expect(buildPulse(rows, now)[0].trend_reversal).toBe(false);
  });
});

describe("umbral del dólar", () => {
  it("acepta coma o punto y rechaza fuera de rango", () => {
    expect(parseFxThreshold("")).toBeNull();
    expect(parseFxThreshold(null)).toBeNull();
    expect(parseFxThreshold("0,5")).toBe(0.5);
    expect(parseFxThreshold("1.25")).toBe(1.25);
    expect(parseFxThreshold("0")).toBe("invalid");
    expect(parseFxThreshold("25")).toBe("invalid");
    expect(parseFxThreshold("abc")).toBe("invalid");
  });

  it("calcula la variación diaria de la venta", () => {
    expect(
      fxDailyMoves([
        { rate_date: "2026-11-17", buying: 1, selling: 100 },
        { rate_date: "2026-11-18", buying: 1, selling: 101 },
      ]),
    ).toEqual([{ rate_date: "2026-11-18", buying: 1, selling: 101, daily_pct: 1 }]);
  });
});

describe("buildMacroNotifications", () => {
  const points = [
    row({ id: "a", value: 5.14, first_seen_at: "2026-11-18T00:00:00Z", last_seen_at: "2026-11-18T20:00:00Z" }),
    row({ id: "b", value: 5.5, first_seen_at: "2026-10-18T00:00:00Z", last_seen_at: "2026-10-18T00:00:00Z" }),
    row({ id: "c", value: 5.0, first_seen_at: "2026-09-18T00:00:00Z", last_seen_at: "2026-09-18T00:00:00Z" }),
  ];

  it("sin condiciones activas no avisa", () => {
    expect(buildMacroNotifications([pref({})], buildPulse(points, now), [], now)).toEqual([]);
  });

  it("avisa de dato nuevo y de cambio de dirección con la unidad", () => {
    const items = buildMacroNotifications(
      [pref({ id: "n", name: "Nuevos", macro_new_data: true }), pref({ id: "t", name: "Giros", macro_trend_change: true })],
      buildPulse(points.map((r) => ({ ...r, unit: "variación %" })), now),
      [],
      now,
    );
    expect(items.map((i) => [i.kind, i.preference_id, i.entity_id])).toEqual([
      ["new_data", "n", "a"],
      ["trend", "t", "a"],
    ]);
    expect(items[0].title).toBe("BCRD publicó Inflación: Inflación · Interanual: 5.14 (variación %)");
    expect(items[0].reason).toContain("antes 5.5");
    expect(items[1].title).toContain("baja a 5.14");
    expect(items[1].priority).toBe(2);
  });

  it("avisa del dólar solo si supera el umbral del usuario y es reciente", () => {
    const fx = [
      { id: "f3", rate_date: "2026-11-18", buying: 1, selling: 61.2, first_seen_at: "2026-11-18T20:00:00Z" },
      { id: "f2", rate_date: "2026-11-17", buying: 1, selling: 60, first_seen_at: "2026-11-17T20:00:00Z" },
      { id: "f1", rate_date: "2026-11-16", buying: 1, selling: 60.1, first_seen_at: "2026-10-01T00:00:00Z" },
    ];
    const items = buildMacroNotifications(
      [pref({ id: "x", name: "Dólar", fx_daily_move_pct: 1 }), pref({ id: "y", name: "Dólar fino", fx_daily_move_pct: 0.1 })],
      [],
      fx,
      now,
    );
    expect(items.map((i) => [i.entity_id, i.preference_id])).toEqual([
      ["f3", "y"],
      ["f2", "y"],
    ]);
    expect(items[0].title).toBe("Dólar sube 2 % el 2026-11-18 (venta 61.2)");
    expect(buildMacroNotifications([pref({ fx_daily_move_pct: 5 })], [], fx, now)).toEqual([]);
  });
});
