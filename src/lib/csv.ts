/**
 * CSV para exportar datos (RFC 4180, separador coma, UTF-8 con BOM para que Excel respete las tildes).
 * Protege contra inyección de fórmulas: un texto que empiece por = + - @ (o tabulador / retorno) se
 * antepone con un apóstrofo. Los números se escriben tal cual (un negativo no es una fórmula).
 */
export type Cell = string | number | boolean | null | undefined;

const FORMULA = /^[=+\-@\t\r]/;

export function csvCell(v: Cell): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "boolean") return v ? "true" : "false";
  let s = v;
  if (FORMULA.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Nombre de archivo seguro: solo letras, números, guiones y puntos. */
export function csvFilename(base: string, date: string): string {
  return `${base.replace(/[^a-z0-9-]+/gi, "-")}-${date.replace(/[^0-9-]/g, "")}.csv`;
}
