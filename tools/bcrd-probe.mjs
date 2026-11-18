// Prueba manual de solo lectura de la API BCRD (F-02). No escribe en la base ni guarda datos.
// Uso: node tools/bcrd-probe.mjs [monetarias|inflacion|sectorReal|sectorExterno]
// Lee BCRD_API_TOKEN de .env.local y nunca lo imprime.
import { readFileSync } from "node:fs";
import dns from "node:dns";
import net from "node:net";

// El BCRD solo admite IPv4: resolver primero A y no intentar IPv6 en paralelo.
dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

const PATHS = {
  monetarias: "/api/services/app/MacroVariables/Monetarias",
  inflacion: "/api/services/app/MacroVariables/Inflacion",
  sectorReal: "/api/services/app/MacroVariables/SectorReal",
  sectorExterno: "/api/services/app/MacroVariables/SectorExterno",
};

const group = process.argv[2] ?? "monetarias";
if (!PATHS[group]) {
  console.error(`Grupo desconocido: ${group}. Opciones: ${Object.keys(PATHS).join(", ")}`);
  process.exit(2);
}

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const token = env.match(/^BCRD_API_TOKEN=(.*)$/m)?.[1]?.trim();
if (!token) {
  console.error("Falta BCRD_API_TOKEN en .env.local");
  process.exit(2);
}

const res = await fetch(`https://api.bancentral.gov.do${PATHS[group]}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "AviTech-Ingest/0.1 (probe)" },
  body: JSON.stringify({ token }),
});
const text = await res.text();
console.log(`HTTP ${res.status} ${res.headers.get("content-type") ?? ""}`);
let json;
try {
  json = JSON.parse(text);
} catch {
  console.log(text.slice(0, 500));
  process.exit(1);
}
if (!json.success) {
  console.log(`Error BCRD: ${json.error?.message ?? "(sin mensaje)"}`);
  process.exit(1);
}
const vars = Array.isArray(json.result) ? json.result : [json.result];
for (const v of vars) {
  console.log(`- ${v?.name ?? "(sin nombre)"}: ${Array.isArray(v?.values) ? v.values.length : 0} valores`);
}
console.log("Muestra (primer valor de la primera variable):");
console.log(JSON.stringify(vars[0]?.values?.[0] ?? null, null, 2));
