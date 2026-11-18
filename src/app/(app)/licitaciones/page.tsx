import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusBadge } from "@/components/trust-badge";
import { WatchButton } from "@/components/watch-button";
import { formatMoney } from "@/lib/format";
import { FTS } from "@/lib/search";
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

function timeLeft(deadline: string, now: Date): string {
  const ms = new Date(deadline).getTime() - now.getTime();
  if (ms <= 0) return "Cerrada";
  const h = Math.floor(ms / 3600000);
  return h < 24 ? `Cierra en ${h} h` : `Cierra en ${Math.floor(h / 24)} día(s)`;
}

async function Results({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const method = one(sp.metodo).trim().slice(0, 80);
  const status = one(sp.estado);
  const page = Math.max(1, Number(one(sp.pagina)) || 1);
  const orderRaw = one(sp.orden);
  const order = ["cierre", "monto", "recientes"].includes(orderRaw) ? orderRaw : "cierre";
  const onlyOpen = one(sp.vigentes) === "1" || Object.keys(sp).length === 0;
  const now = new Date();

  const supabase = await createClient();
  let query = supabase
    .from("public_tenders")
    .select("id,title,description,procurement_method,status,published_at,deadline_at,budget_amount,budget_currency,process_code", {
      count: "exact",
    })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.textSearch("search_vector", q, FTS);
  if (method) query = query.eq("procurement_method", method);
  if (status && STATUS[status]) query = query.eq("status", status as "open");
  if (onlyOpen) query = query.eq("status", "open").gte("deadline_at", now.toISOString());
  query =
    order === "monto"
      ? query.order("budget_amount", { ascending: false, nullsFirst: false })
      : order === "recientes"
        ? query.order("published_at", { ascending: false, nullsFirst: false })
        : query.order("deadline_at", { ascending: true, nullsFirst: false });

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
    u.set("orden", order);
    if (onlyOpen) u.set("vigentes", "1");
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
        <div>
          <label htmlFor="orden" className="mb-1 block text-sm font-medium">Ordenar por</label>
          <select id="orden" name="orden" defaultValue={order} className="field">
            <option value="cierre">Cierre más próximo</option>
            <option value="monto">Mayor monto</option>
            <option value="recientes">Más recientes</option>
          </select>
        </div>
        <label className="flex items-center gap-2 py-2 text-sm">
          <input type="checkbox" name="vigentes" value="1" defaultChecked={onlyOpen} />
          Solo vigentes
        </label>
        <button className="btn">Filtrar</button>
        {(q || method || status || !onlyOpen || order !== "cierre") && <Link href="/licitaciones" className="py-2 text-sm text-primary underline">Quitar filtros</Link>}
      </form>

      {!data?.length ? (
        <p className="empty-state">
          {q || method || status
            ? "No hay resultados con estos filtros."
            : "Aún no hay licitaciones cargadas. Un usuario con rol de gestión puede cargar una muestra en Carga de datos."}
        </p>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted" aria-live="polite">
            {count} resultado(s) · página {page} de {pages}
            {order === "monto" && " · el orden por monto compara cifras sin convertir monedas"}
          </p>
          <ul className="space-y-3">
            {data.map((t) => (
              <li key={t.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="headline"><Link href={`/licitaciones/${t.id}`} className="hover:text-primary hover:underline">{t.title}</Link></h2>
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
                  <div>
                    <dt className="text-muted">Cierre de ofertas</dt>
                    <dd>
                      {dateTime(t.deadline_at)}
                      {t.status === "open" && t.deadline_at && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {timeLeft(t.deadline_at, now)}
                        </span>
                      )}
                    </dd>
                  </div>
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
