import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StatusBadge, TrustBadge } from "@/components/trust-badge";
import { INSTRUMENT_TYPES, PUBLICATION, formatDate, formatMoney, formatPercent } from "@/lib/format";
import { getCurrentRole } from "@/lib/auth";
import { canPublishRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";
import { WatchButton } from "@/components/watch-button";
import { UnpublishForm } from "./unpublish-form";

export const metadata: Metadata = { title: "Detalle de instrumento" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVIDENCE_COLS = "id,claim_field,quote,page_or_section,literal_verified";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: i, error } = await supabase.from("financial_instruments").select("*").eq("id", id).maybeSingle();
  if (error) return <p role="alert" className="text-danger">No se pudo cargar el instrumento.</p>;
  if (!i) notFound();

  const [{ data: auctions }, { data: instEvidence }] = await Promise.all([
    supabase.from("instrument_auctions").select("*").eq("instrument_id", id).order("auction_date", { ascending: false }),
    supabase.from("evidence").select(EVIDENCE_COLS).eq("instrument_id", id),
  ]);
  const auctionIds = (auctions ?? []).map((a) => a.id);
  const { data: auctionEvidence } = auctionIds.length
    ? await supabase.from("evidence").select(EVIDENCE_COLS).in("auction_id", auctionIds)
    : { data: [] };
  const evidence = [...(instEvidence ?? []), ...(auctionEvidence ?? [])];
  const { data: watchRow } = await supabase
    .from("watchlists").select("id").eq("entity_type", "instrument").eq("entity_id", id).maybeSingle();
  const tone = i.publication_status === "published" ? "success" : "warning";

  return (
    <>
      <nav aria-label="Migas de pan" className="mb-3 text-sm">
        <Link href="/instrumentos" className="text-primary underline">
          Instrumentos
        </Link>{" "}
        / {i.name}
      </nav>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">{i.name}</h1>
        <TrustBadge layer={i.trust_layer} />
        <StatusBadge label={PUBLICATION[i.publication_status] ?? i.publication_status} tone={tone} />
        {i.is_demo && <StatusBadge label="DEMO" tone="warning" />}
        <WatchButton type="instrument" id={i.id} watching={!!watchRow} />
      </div>
      {i.publication_status !== "published" && (
        <p className="mb-4 rounded border border-dashed border-warning p-3 text-sm text-warning">
          Este registro aún no está publicado: lo ves por tu rol de revisión. No lo compartas como dato verificado.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="ficha" className="rounded border border-line p-4">
          <h2 id="ficha" className="mb-2 font-semibold">Ficha</h2>
          <dl className="divide-y divide-divider">
            <Row k="ISIN" v={<span className="font-mono">{i.isin ?? "No disponible"}</span>} />
            <Row k="Tipo" v={INSTRUMENT_TYPES[i.instrument_type] ?? i.instrument_type} />
            <Row k="Moneda" v={i.currency} />
            <Row k="Cupón" v={formatPercent(i.coupon_rate)} />
            <Row k="Emisión" v={formatDate(i.issue_date)} />
            <Row k="Vencimiento" v={formatDate(i.maturity_date)} />
            <Row
              k="Disponibilidad de compra"
              v={i.availability === "confirmed_by_source" ? "Confirmada por la fuente" : "No confirmada"}
            />
          </dl>
        </section>
        <section aria-labelledby="subastas" className="rounded border border-line p-4">
          <h2 id="subastas" className="mb-2 font-semibold">Subastas</h2>
          {!auctions?.length ? (
            <p className="text-sm text-muted">Sin subastas registradas.</p>
          ) : (
            auctions.map((a) => (
              <dl key={a.id} className="divide-y divide-divider">
                <Row k="Fecha" v={formatDate(a.auction_date)} />
                <Row k="Liquidación" v={formatDate(a.settlement_date)} />
                <Row k="Monto ofertado" v={formatMoney(a.offered_amount, a.currency)} />
                <Row k="Monto adjudicado" v={formatMoney(a.awarded_amount, a.currency)} />
                <Row k="Tasa de corte" v={formatPercent(a.cutoff_rate)} />
                <Row k="Tasa promedio ponderada" v={formatPercent(a.weighted_avg_rate)} />
              </dl>
            ))
          )}
        </section>
      </div>
      <section aria-labelledby="evidencia" className="mt-6 rounded border border-line p-4">
        <h2 id="evidencia" className="mb-2 font-semibold">Evidencia</h2>
        {!evidence.length ? (
          <p className="text-sm text-muted">Sin evidencia vinculada.</p>
        ) : (
          <ul className="divide-y divide-divider text-sm">
            {evidence.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span>
                  <span className="font-mono text-xs text-muted">{e.claim_field}</span> — «{e.quote}»
                </span>
                <StatusBadge
                  label={e.literal_verified ? "Cita verificada literalmente" : "Cita sin verificar"}
                  tone={e.literal_verified ? "success" : "warning"}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      {i.publication_status === "published" && canPublishRole(await getCurrentRole()) && <UnpublishForm id={i.id} />}
    </>
  );
}

export default function InstrumentoPage(props: PageProps<"/instrumentos/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Detail params={props.params} />
    </Suspense>
  );
}
