import { csvFilename, toCsv } from "@/lib/csv";
import { todayInRD } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/**
 * Exporta los datos del BCRD guardados en AviTech (lo que el usuario ya puede ver con su sesión; RLS aplica).
 * `tipo=indicadores`: todas las observaciones con unidad, fecha del dato y detección.
 * `tipo=tasa-cambio`: tasa de cambio diaria guardada.
 */
export async function GET(request: Request) {
  const tipo = new URL(request.url).searchParams.get("tipo");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return new Response("Sesión requerida", { status: 401 });
  const today = todayInRD();

  if (tipo === "indicadores") {
    const { data, error } = await supabase
      .from("macro_observations")
      .select("group_name,category_path,indicator,value,unit,as_of,first_seen_at,data_quality_flags")
      .order("series_key", { ascending: true })
      .order("first_seen_at", { ascending: false })
      .limit(10000);
    if (error) return new Response("No se pudieron leer los datos", { status: 500 });
    const csv = toCsv(
      ["grupo", "categoria", "indicador", "valor", "unidad", "fecha_dato_bcrd", "detectado_por_avitech_utc", "avisos_calidad", "fuente"],
      (data ?? []).map((r) => [
        r.group_name,
        (r.category_path ?? []).join(" > "),
        r.indicator,
        Number(r.value),
        r.unit,
        r.as_of,
        r.first_seen_at,
        (r.data_quality_flags ?? []).join(" "),
        "BCRD (api.bancentral.gov.do)",
      ]),
    );
    return csvResponse(csv, csvFilename("avitech-bcrd-indicadores", today));
  }

  if (tipo === "tasa-cambio") {
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("rate_date,buying,selling,first_seen_at")
      .order("rate_date", { ascending: false })
      .limit(10000);
    if (error) return new Response("No se pudieron leer los datos", { status: 500 });
    const csv = toCsv(
      ["fecha", "compra", "venta", "detectado_por_avitech_utc", "fuente"],
      (data ?? []).map((r) => [r.rate_date, Number(r.buying), Number(r.selling), r.first_seen_at, "BCRD (api.bancentral.gov.do)"]),
    );
    return csvResponse(csv, csvFilename("avitech-bcrd-tasa-cambio", today));
  }

  return new Response("Tipo de exportación no válido", { status: 400 });
}

function csvResponse(body: string, filename: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
