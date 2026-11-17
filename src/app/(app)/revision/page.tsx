import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusBadge } from "@/components/trust-badge";
import { getCurrentRole } from "@/lib/auth";
import { PUBLICATION, formatDate, formatPercent } from "@/lib/format";
import { canPublishRole, evidenceBlockers, isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";
import { ReviewButtons } from "./review-buttons";

export const metadata: Metadata = { title: "Revisión" };

async function Queue() {
  await connection();
  const role = await getCurrentRole();
  if (!isStaffRole(role)) {
    return <p className="empty-state">No tienes permisos para ver esta sección.</p>;
  }
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("financial_instruments")
    .select("id,name,isin,coupon_rate,maturity_date,publication_status")
    .in("publication_status", ["draft", "in_review"])
    .order("created_at");
  if (error) return <p role="alert" className="text-danger">No se pudo cargar la cola.</p>;
  if (!items?.length) {
    return <p className="empty-state">No hay registros pendientes de revisión.</p>;
  }

  const mayPublish = canPublishRole(role);
  const cards = await Promise.all(
    items.map(async (i) => {
      const [{ data: auctions }, { data: ev }] = await Promise.all([
        supabase.from("instrument_auctions").select("id,auction_date").eq("instrument_id", i.id),
        supabase.from("evidence").select("literal_verified").eq("instrument_id", i.id),
      ]);
      const ids = (auctions ?? []).map((a) => a.id);
      const { data: aev } = ids.length
        ? await supabase.from("evidence").select("literal_verified,auction_id").in("auction_id", ids)
        : { data: [] as { literal_verified: boolean; auction_id: string }[] };
      const blockers = [
        ...evidenceBlockers("Instrumento", ev ?? []),
        ...(auctions ?? []).flatMap((a) =>
          evidenceBlockers(`Subasta ${a.auction_date}`, (aev ?? []).filter((e) => e.auction_id === a.id)),
        ),
      ];
      return { i, auctions: auctions ?? [], blockers };
    }),
  );

  return (
    <>
      {!mayPublish && (
        <p className="mb-4 rounded border border-dashed border-warning p-3 text-sm text-warning">
          Tu rol puede revisar pero no publicar.
        </p>
      )}
      <ul className="space-y-4">
        {cards.map(({ i, auctions, blockers }) => (
          <li key={i.id} className="card">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/instrumentos/${i.id}`} className="font-semibold text-primary underline">
                {i.name}
              </Link>
              <StatusBadge label={PUBLICATION[i.publication_status] ?? i.publication_status} tone="warning" />
            </div>
            <p className="mt-1 text-sm text-muted">
              {i.isin} · cupón {formatPercent(i.coupon_rate)} · vence {formatDate(i.maturity_date)} · {auctions.length}{" "}
              subasta(s)
            </p>
            {blockers.length ? (
              <ul className="mt-2 list-disc pl-5 text-sm text-danger">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-success">
                Toda la evidencia está verificada literalmente. Abre la ficha y compara con el documento oficial antes
                de publicar.
              </p>
            )}
            {mayPublish && <ReviewButtons id={i.id} blocked={blockers.length > 0} />}
          </li>
        ))}
      </ul>
    </>
  );
}

export default function RevisionPage() {
  return (
    <>
      <h1 className="page-title mb-2">Revisión y publicación</h1>
      <p className="mb-6 text-sm text-muted">
        Publicar es una decisión humana y queda en la auditoría. Solo se puede publicar con toda la evidencia verificada.
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Queue />
      </Suspense>
    </>
  );
}
