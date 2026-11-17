#!/usr/bin/env node
/**
 * Puerta de auditoría de dependencias (CI).
 * - Producción: cualquier vulnerabilidad alta o crítica FALLA.
 * - Desarrollo: falla ante cualquier aviso alto/crítico NO listado en ACCEPTED.
 * - Un aviso aceptado vencido (review_by < hoy) también FALLA, para obligar a revisarlo.
 * Las excepciones se documentan en docs/seguridad/RIESGOS-DEPENDENCIAS.md.
 */
import { execFileSync } from "node:child_process";

const ACCEPTED = {
  // picomatch <=4.0.7: ReDoS con extglobs. Sin versión corregida publicada al 2026-11-17.
  // Solo en herramientas de desarrollo (vite, vitest, eslint); no llega al bundle ni al servidor.
  "GHSA-fc5q-39xc-vjpf": { review_by: "2026-12-17" },
};

function audit(args) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  try {
    return JSON.parse(execFileSync(npm, ["audit", "--json", ...args], { encoding: "utf8", shell: process.platform === "win32" }));
  } catch (e) {
    // npm audit sale con código ≠ 0 cuando hay hallazgos; el JSON viene en stdout.
    if (e.stdout) return JSON.parse(e.stdout);
    throw e;
  }
}

/** Avisos raíz (con id GHSA) de severidad alta o crítica. */
function rootAdvisories(report) {
  const out = new Map();
  for (const v of Object.values(report.vulnerabilities ?? {})) {
    for (const via of v.via) {
      if (typeof via === "object" && ["high", "critical"].includes(via.severity)) {
        const id = via.url?.split("/").pop() ?? via.title;
        out.set(id, { id, pkg: via.name, severity: via.severity, title: via.title });
      }
    }
  }
  return [...out.values()];
}

const today = new Date().toISOString().slice(0, 10);
let failed = false;

const prod = rootAdvisories(audit(["--omit=dev"]));
if (prod.length) {
  failed = true;
  console.error("✗ Producción: vulnerabilidades altas/críticas:");
  for (const a of prod) console.error(`  ${a.id} ${a.pkg} (${a.severity}) ${a.title}`);
} else {
  console.log("✓ Producción: 0 vulnerabilidades altas/críticas.");
}

for (const a of rootAdvisories(audit([]))) {
  const acc = ACCEPTED[a.id];
  if (!acc) {
    failed = true;
    console.error(`✗ Desarrollo: aviso nuevo no aceptado: ${a.id} ${a.pkg} (${a.severity}) ${a.title}`);
  } else if (acc.review_by < today) {
    failed = true;
    console.error(`✗ Desarrollo: excepción vencida (${acc.review_by}) para ${a.id} ${a.pkg}: revisar.`);
  } else {
    console.log(`• Desarrollo: ${a.id} ${a.pkg} aceptado hasta ${acc.review_by} (ver docs/seguridad/RIESGOS-DEPENDENCIAS.md).`);
  }
}

process.exit(failed ? 1 : 0);
