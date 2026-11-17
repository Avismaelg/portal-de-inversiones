import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatMoney } from "@/lib/format";
import { matchesAlert } from "@/lib/radar";
import { createClient } from "@/lib/supabase/server";
import { AlertForm } from "./alert-form";
import { deleteAlert } from "./actions";

export const metadata: Metadata = { title: "Alertas" };

const fmt = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(new Date(v))
    : "Sin fecha";

async function Alerts() {
  await connection();
  const supabase = await createClient();
  const [prefs, news, tenders] = await Promise.all([
    supabase.from("user_alert_preferences").select("id,name,keywords,is_paused").order("created_at", { ascending: false }),
    supabase
      .from("news_items")
      .select("id,source_name,title,url,excerpt,published_at,media_source,media_url")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(300),
    supabase
      .from("public_tenders")
      .select("id,title,description,deadline_at,budget_amount,budget_currency,process_code")
      .eq("status", "open")
      .gte("deadline_at", new Date().toISOString())
      .order("deadline_at", { ascending: true })
      .limit(500),
  ]);
  if (prefs.error || news.error || tenders.error) return <p role="alert" className="text-danger">No se pudieron cargar las alertas.</p>;
  const active = (prefs.data ?? []).filter((p) => !p.is_paused);
  const hits = (news.data ?? [])
    .map((n) => ({
      n,
      why: active.filter((p) => matchesAlert(n.title, n.excerpt, (p.keywords ?? []) as string[]).length > 0).map((p) => p.name),
    }))
    .filter((h) => h.why.length)
    .slice(0, 30);
  const tenderHits = (tenders.data ?? [])
    .map((t) => ({
      t,
      why: active.filter((p) => matchesAlert(t.title, t.description, (p.keywords ?? []) as string[]).length > 0).map((p) => p.name),
    }))
    .filter((h) => h.why.length)
    .slice(0, 20);
  return (
    <>
      <AlertForm />
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <section aria-labelledby="mis" className="card self-start">
          <h2 id="mis" className="text-lg font-semibold">Mis alertas</h2>
          {prefs.data?.length ? (
            <ul className="mt-3 divide-y divide-divider">
              {prefs.data.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-2 py-2 text-sm">
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <span className="block text-xs text-muted">{((p.keywords ?? []) as string[]).join(", ")}</span>
                  </span>
                  <form action={deleteAlert}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn-ghost" aria-label={`Eliminar alerta ${p.name}`}>Quitar</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Aún no tienes alertas. Crea una con las palabras que quieras vigilar.</p>
          )}
        </section>
        <section aria-labelledby="coinc">
          <h2 id="coinc" className="mb-3 text-lg font-semibold">Coincidencias en noticias</h2>
          {hits.length ? (
            <ul className="space-y-3">
              {hits.map(({ n, why }) => (
                <li key={n.id} className="card">
                  <p className="text-xs text-muted">{n.source_name} · {fmt(n.published_at)} · alerta: {why.join(", ")}</p>
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                    {n.title}
                  </a>
                  <p className="mt-1 text-xs text-muted">
                    {n.media_url ? `Ya en prensa: ${n.media_source}` : "Sin cobertura de prensa localizada"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">{active.length ? "Ninguna noticia coincide todavía." : "Crea una alerta para ver coincidencias."}</p>
          )}
        </section>
      </div>
      <section aria-labelledby="lic" className="mt-6">
        <h2 id="lic" className="mb-3 text-lg font-semibold">Licitaciones vigentes que coinciden</h2>
        {tenderHits.length ? (
          <ul className="space-y-3">
            {tenderHits.map(({ t, why }) => (
              <li key={t.id} className="card">
                <p className="text-xs text-muted">{t.process_code} · alerta: {why.join(", ")}</p>
                <Link href="/licitaciones" className="font-semibold text-primary hover:underline">{t.title}</Link>
                <p className="mt-1 text-xs text-muted">
                  Cierra {fmt(t.deadline_at)} · Monto: {t.budget_currency ? formatMoney(t.budget_amount, t.budget_currency) : "No disponible"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">{active.length ? "Ninguna licitación vigente coincide todavía." : "Crea una alerta para ver licitaciones que coincidan."}</p>
        )}
      </section>
    </>
  );
}

export default function AlertasPage() {
  return (
    <>
      <p className="eyebrow">Alertas tempranas</p>
      <h1 className="page-title">Vigila lo que te importa</h1>
      <p className="page-lead">
        Define palabras clave y verás aquí las noticias de fuentes primarias y las licitaciones vigentes que coinciden. Alertas solo dentro de la aplicación (sin correo todavía).
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Alerts />
      </Suspense>
    </>
  );
}
