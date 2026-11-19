// Muestra los datos actuales de la API BCRD usando el conector real (src/lib/ingest/bcrd.ts).
// Solo lectura: no escribe en la base ni guarda datos. Gasta 5 llamadas de la cuota diaria (500).
// Uso: node --import ./tools/ts-resolve.mjs tools/bcrd-show.ts
import { readFileSync } from "node:fs";
import dns from "node:dns";
import net from "node:net";
import {
  BCRD_MACRO_GROUPS,
  type BcrdMacroGroup,
  createBcrdClient,
  fetchHistoricoTasas,
  fetchMacro,
} from "../src/lib/ingest/bcrd";

// El BCRD solo admite IPv4.
dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const token = env.match(/^BCRD_API_TOKEN=(.*)$/m)?.[1]?.trim() ?? "";
// SG-05: contacto institucional aún [PENDIENTE].
const client = createBcrdClient({ clientName: "AviTech-Ingest/0.1", contact: "contacto-pendiente-SG-05" });

for (const group of Object.keys(BCRD_MACRO_GROUPS) as BcrdMacroGroup[]) {
  const rows = await fetchMacro(client, token, group);
  console.log(`\n## ${rows[0]?.group ?? group}`);
  console.table(
    rows.map((r) => ({
      categoria: r.path.join(" > "),
      indicador: r.indicator,
      valor: r.value,
      fecha: r.as_of ?? "—",
      avisos: r.data_quality_flags.join(", "),
    })),
  );
}

const to = new Date();
const from = new Date(to.getTime() - 30 * 86_400_000);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const page = await fetchHistoricoTasas(client, token, { fromDate: iso(from), toDate: iso(to), maxResultCount: 100 });
console.log(`\n## Histórico tasa de cambio ${iso(from)} a ${iso(to)} (total según API: ${page.totalCount}, rechazados: ${page.rejected.length})`);
console.table(page.items.map((r) => ({ fecha: r.rate_date, compra: r.buying, venta: r.selling })));
