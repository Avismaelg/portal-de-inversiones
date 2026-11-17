import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusBadge, TrustBadge } from "@/components/trust-badge";
import { INSTRUMENT_TYPES, PUBLICATION, formatDate, formatPercent } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Instrumentos" };

async function List() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_instruments")
    .select("id,name,isin,instrument_type,currency,coupon_rate,maturity_date,trust_layer,publication_status,is_demo")
    .order("maturity_date", { ascending: true });
  if (error) return <p role="alert" className="text-danger">No se pudieron cargar los instrumentos.</p>;
  if (!data?.length) {
    return (
      <p className="empty-state">
        Aún no hay instrumentos visibles. Los datos entran por carga manual o por conectores verificados, y se
        publican tras revisión humana.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded border border-line">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Instrumentos financieros</caption>
        <thead className="bg-bg-subtle">
          <tr>
            {["Instrumento", "Tipo", "Moneda", "Cupón", "Vencimiento", "Estado"].map((h) => (
              <th key={h} scope="col" className="p-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {data.map((i) => (
            <tr key={i.id}>
              <th scope="row" className="p-3 font-medium">
                <Link href={`/instrumentos/${i.id}`} className="text-primary underline">
                  {i.name}
                </Link>
                {i.is_demo && <StatusBadge label="DEMO" tone="warning" />}
                <div className="font-mono text-xs font-normal text-muted">{i.isin}</div>
              </th>
              <td className="p-3">{INSTRUMENT_TYPES[i.instrument_type] ?? i.instrument_type}</td>
              <td className="p-3">{i.currency}</td>
              <td className="p-3">{formatPercent(i.coupon_rate)}</td>
              <td className="p-3">{formatDate(i.maturity_date)}</td>
              <td className="space-x-1 p-3">
                <StatusBadge
                  label={PUBLICATION[i.publication_status] ?? i.publication_status}
                  tone={i.publication_status === "published" ? "success" : "warning"}
                />
                <TrustBadge layer={i.trust_layer} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function InstrumentosPage() {
  return (
    <>
      <h1 className="page-title mb-2">Instrumentos financieros</h1>
      <p className="mb-6 text-sm text-muted">
        Información con fines informativos; no constituye asesoría de inversión. La disponibilidad de compra no está
        confirmada salvo que la fuente lo indique.
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <List />
      </Suspense>
    </>
  );
}
