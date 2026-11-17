import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusBadge } from "@/components/trust-badge";
import { WatchButton } from "@/components/watch-button";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Licitaciones" };

const PAGE_SIZE = 25;
const STATUS: Record<string, string> = {
  open: "Abierta",
  closed: "Cerrada",
  awarded: "Adjudicada",
  cancelled: "Cancelada",
  planned: "Planificada",
  unknown: "Estado no mapeado",
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const dateTime = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(
        new Date(v),
      )
    : "No disponible";

async function Results({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const method = one(sp.metodo).trim().slice(0, 80);
  const status = one(sp.estado);
  const page = Math.max(1, Number(one(sp.pagina)) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("public_tenders")
    .select("id,title,description,procurement_method,status,published_at,deadline_at,budget_amount,budget_currency,process_code", {
      count: "exact",
    })
    .order("published_at", { ascending: false, nullsFirst: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.textSearch("search_vector", q, { type: "websearch", config: "spanish" });
  if (method) query = query.eq("procurement_method", method);
  if (status && STATUS[status]) query = query.eq("status", status as "open");

  const [{ data, count, error }, methods, watched] = await Promise.all([
    query,
    supabase.from("public_tenders").select("procurement_method").not("procurement_method", "is", null).limit(1000),
    supabase.from("watchlists").select("entity_id").eq("entity_type", "tender"),
  ]);
  if (error) return <p role="alert" className="text-danger">No se pudieron cargar las licitaciones.</p>;
  const watchedIds = new Set((watched.data ?? []).map((w) => w.entity_id));
  const methodList = [...new Set((methods.data ?? []).map((m) => m.procurement_method as string))].sort();
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const link = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (method) u.set("metodo", method);
    if (status) u.set("estado", status);
    u.set("pagina", String(p));
    return `/licitaciones?${u}`;
  };

  return (
    <>
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3" role="search">
        <div>
          <label htmlFor="q" className="mb-1 block text-sm font-medium">Buscar</label>
          <input id="q" name="q" defaultValue={q} className="w-64 field" />
        </div>
        <div>
          <label htmlFor="metodo" className="mb-1 block text-sm font-medium">Modalidad</label>
          <select id="metodo" name="metodo" defaultValue={method} className="field">
            <option value="">Todas</option>
            {methodList.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="estado" className="mb-1 block text-sm font-medium">Estado</label>
          <select id="estado" name="estado" defaultValue={status} className="field">
            <option value="">Todos</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button className="btn">Filtrar</button>
        {(q || method || status) && <Link href="/licitaciones" className="py-2 text-sm text-primary underline">Quitar filtros</Link>}
      </form>

      {!data?.length ? (
        <p className="empty-state">
          {q || method || status
            ? "No hay resultados con estos filtros."
            : "Aún no hay licitaciones cargadas. Un usuario con rol de gestión puede cargar una muestra en Carga de datos."}
        </p>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted" aria-live="polite">{count} resultado(s) · página {page} de {pages}</p>
          <ul className="space-y-3">
            {data.map((t) => (
              <li key={t.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-semibold">{t.title}</h2>
                  <WatchButton type="tender" id={t.id} watching={watchedIds.has(t.id)} />
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span className="font-mono text-xs">{t.process_code}</span>
                  <StatusBadge label={STATUS[t.status] ?? t.status} tone={t.status === "open" ? "success" : "neutral"} />
                  {t.procurement_method && <span>{t.procurement_method}</span>}
                </p>
                {t.description && <p className="mt-2 text-sm">{t.description}</p>}
                <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
                  <div><dt className="text-muted">Publicada</dt><dd>{dateTime(t.published_at)}</dd></div>
                  <div><dt className="text-muted">Cierre de ofertas</dt><dd>{dateTime(t.deadline_at)}</dd></div>
                  <div>
                    <dt className="text-muted">Monto estimado</dt>
                    <dd>{t.budget_currency ? formatMoney(t.budget_amount, t.budget_currency) : "No disponible"}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <nav aria-label="Paginación" className="mt-6 flex gap-4 text-sm">
            {page > 1 && <Link href={link(page - 1)} className="text-primary underline">← Anterior</Link>}
            {page < pages && <Link href={link(page + 1)} className="text-primary underline">Siguiente →</Link>}
          </nav>
        </>
      )}
    </>
  );
}

export default function LicitacionesPage(props: PageProps<"/licitaciones">) {
  return (
    <>
      <h1 className="page-title mb-2">Licitaciones</h1>
      <p className="mb-6 text-sm text-muted">
        Fuente: DGCP (datos abiertos), con estado legal pendiente de revisión. Dato confirmado según la fuente; la
        veracidad es de cada institución. Información sin carácter de asesoría.
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
