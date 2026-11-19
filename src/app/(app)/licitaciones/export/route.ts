import { csvFilename, toCsv } from "@/lib/csv";
import { todayInRD } from "@/lib/format";
import { FTS } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { parseTenderFilters, TENDER_STATUS, type Params } from "@/lib/tender-filters";

const MAX_ROWS = 2000;

/** Exporta las licitaciones que el usuario ve con los filtros actuales (RLS aplica; máximo 2000 filas). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return new Response("Sesión requerida", { status: 401 });

  const sp: Params = Object.fromEntries(new URL(request.url).searchParams);
  const f = parseTenderFilters(sp);
  let query = supabase
    .from("public_tenders")
    .select("process_code,title,procurement_method,status,published_at,deadline_at,budget_amount,budget_currency,source_url")
    .limit(MAX_ROWS);
  if (f.q) query = query.textSearch("search_vector", f.q, FTS);
  if (f.method) query = query.eq("procurement_method", f.method);
  if (f.status) query = query.eq("status", f.status as "open");
  if (f.onlyOpen) query = query.eq("status", "open").gte("deadline_at", new Date().toISOString());
  query =
    f.order === "monto"
      ? query.order("budget_amount", { ascending: false, nullsFirst: false })
      : f.order === "recientes"
        ? query.order("published_at", { ascending: false, nullsFirst: false })
        : query.order("deadline_at", { ascending: true, nullsFirst: false });

  const { data, error } = await query;
  if (error) return new Response("No se pudieron leer las licitaciones", { status: 500 });
  const csv = toCsv(
    ["codigo_proceso", "titulo", "modalidad", "estado", "publicada_utc", "cierre_ofertas_utc", "monto_estimado", "moneda", "enlace_fuente", "fuente"],
    (data ?? []).map((t) => [
      t.process_code,
      t.title,
      t.procurement_method,
      TENDER_STATUS[t.status] ?? t.status,
      t.published_at,
      t.deadline_at,
      t.budget_amount === null ? null : Number(t.budget_amount),
      t.budget_currency,
      t.source_url,
      "DGCP (datos abiertos)",
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename("avitech-licitaciones", todayInRD())}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
