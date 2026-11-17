import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCurrentRole } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { canPublishRole, isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";
import { TenderReviewForm } from "./review-form";

export const metadata: Metadata = { title: "Revisión de licitaciones" };

const PAGE_SIZE = 20;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const dt = (v: string | null) =>
  v ? new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(new Date(v)) : "No disponible";

/** «unmapped_status:Proceso con etapa cerrada» -> «Estado DGCP no reconocido: Proceso con etapa cerrada». */
function flagLabel(f: string): string {
  const [k, ...rest] = f.split(":");
  const v = rest.join(":");
  return (
    { unmapped_status: `Estado DGCP no reconocido: ${v}`, missing_title: "Sin título", negative_amount: "Monto negativo", amount_without_currency: "Monto sin moneda" }[k] ?? f
  );
}

async function Queue({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const role = await getCurrentRole();
  if (!isStaffRole(role)) return <p className="empty-state">No tienes permisos para ver esta sección.</p>;
  const page = Math.max(1, Number(one((await searchParams).pagina)) || 1);
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("public_tenders")
    .select("id,title,process_code,description,procurement_method,deadline_at,budget_amount,budget_currency,data_quality_flags,source_url,extracted_at", { count: "exact" })
    .in("publication_status", ["draft", "in_review"])
    .order("deadline_at", { ascending: true, nullsFirst: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) return <p role="alert" className="text-danger">No se pudo cargar la cola.</p>;
  if (!data?.length) return <p className="empty-state">No hay licitaciones pendientes de revisión.</p>;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const mayPublish = canPublishRole(role);
  return (
    <>
      <p className="mb-3 text-sm text-muted" aria-live="polite">
        {count} pendiente(s) · página {page} de {pages}
      </p>
      {!mayPublish && <p className="mb-3 text-sm text-warning">Tu rol puede ver la cola pero no publicar ni rechazar.</p>}
      <ul className="space-y-3">
        {data.map((t) => (
          <li key={t.id} className="card">
            <p className="text-xs text-muted">
              {t.process_code} · {t.procurement_method ?? "Modalidad no disponible"} · extraída {dt(t.extracted_at)}
            </p>
            <h2 className="headline mt-1">{t.title}</h2>
            {t.description && <p className="mt-1 text-sm text-muted">{t.description}</p>}
            <p className="mt-1 text-sm">
              Cierre: {dt(t.deadline_at)} · Monto: {t.budget_currency ? formatMoney(t.budget_amount, t.budget_currency) : "No disponible"}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
              {(t.data_quality_flags ?? []).map((f: string) => (
                <li key={f} className="rounded-full bg-warning/15 px-2 py-0.5 font-medium text-warning">{flagLabel(f)}</li>
              ))}
            </ul>
            {t.source_url ? (
              <a href={t.source_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-primary underline">
                Verificar en el portal de la DGCP ↗
              </a>
            ) : (
              <p className="mt-2 text-xs text-muted">Sin URL del procedimiento (carga anterior a la guardia): búscalo por su código en la DGCP.</p>
            )}
            {mayPublish && <TenderReviewForm id={t.id} />}
          </li>
        ))}
      </ul>
      <nav aria-label="Paginación" className="mt-6 flex gap-4 text-sm">
        {page > 1 && <Link href={`/revision/licitaciones?pagina=${page - 1}`} className="text-primary underline">← Anterior</Link>}
        {page < pages && <Link href={`/revision/licitaciones?pagina=${page + 1}`} className="text-primary underline">Siguiente →</Link>}
      </nav>
    </>
  );
}

export default function TenderReviewPage(props: PageProps<"/revision/licitaciones">) {
  return (
    <>
      <Link href="/revision" className="text-sm font-semibold text-muted hover:text-primary">← Revisión</Link>
      <h1 className="page-title mt-2">Revisión de licitaciones</h1>
      <p className="page-lead">
        Licitaciones cuyo estado en la DGCP no se reconoce o que cambiaron en la fuente. Publicar exige un gestor y una nota;
        la base registra quién y cuándo. Las que pasan la validación se publican al cargarlas (regla dgcp_auto_publish_v1).
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Queue searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
