import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { WatchButton } from "@/components/watch-button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mi lista" };

async function Items() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("watchlists")
    .select("entity_type,entity_id,created_at")
    .order("created_at", { ascending: false });
  if (error) return <p role="alert" className="text-danger">No se pudo cargar tu lista.</p>;
  if (!rows?.length) {
    return (
      <p className="empty-state">
        Aún no sigues nada. Usa «Seguir» en una licitación o un instrumento.
      </p>
    );
  }
  const tenderIds = rows.filter((r) => r.entity_type === "tender").map((r) => r.entity_id);
  const instIds = rows.filter((r) => r.entity_type === "instrument").map((r) => r.entity_id);
  const [tenders, insts] = await Promise.all([
    tenderIds.length ? supabase.from("public_tenders").select("id,title,deadline_at").in("id", tenderIds) : { data: [] },
    instIds.length ? supabase.from("financial_instruments").select("id,name,maturity_date").in("id", instIds) : { data: [] },
  ]);
  return (
    <ul className="space-y-3">
      {(tenders.data ?? []).map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-3 card">
          <span><span className="text-xs text-muted">Licitación · </span>{t.title}</span>
          <WatchButton type="tender" id={t.id} watching />
        </li>
      ))}
      {(insts.data ?? []).map((i) => (
        <li key={i.id} className="flex items-center justify-between gap-3 card">
          <span>
            <span className="text-xs text-muted">Instrumento · </span>
            <Link href={`/instrumentos/${i.id}`} className="text-primary underline">{i.name}</Link>
          </span>
          <WatchButton type="instrument" id={i.id} watching />
        </li>
      ))}
    </ul>
  );
}

export default function WatchlistPage() {
  return (
    <>
      <h1 className="page-title mb-6">Mi lista</h1>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Items />
      </Suspense>
    </>
  );
}
