import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusBadge, TrustBadge } from "@/components/trust-badge";
import { getCurrentRole } from "@/lib/auth";
import { formatDate, PUBLICATION } from "@/lib/format";
import { PERMIT_STATUS, PERMIT_TYPE, PROJECT_STATUS } from "@/lib/registry-labels";
import { canPublishRole, isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";
import { DecideForm, PermitForm, StatusForm } from "../forms";

export const metadata: Metadata = { title: "Proyecto" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLE: Record<string, string> = {
  analyst: "analista",
  opportunity_manager: "gestor",
  org_admin: "administrador",
  platform_admin: "administrador de plataforma",
};
const when = (v: string) =>
  new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(new Date(v));
const statusLabel = (s: string | null) => (s ? PROJECT_STATUS[s] ?? PERMIT_STATUS[s] ?? s : "—");

type Doc = { id: string; canonical_url: string; title: string | null; published_at: string | null };

function DocLink({ doc, label }: { doc: Doc | undefined; label: string }) {
  if (!doc) return null;
  return (
    <li className="text-sm">
      <span className="text-muted">{label}: </span>
      <a href={doc.canonical_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
        {doc.title ?? new URL(doc.canonical_url).hostname} ↗
      </a>
      {doc.published_at && <span className="text-xs text-muted"> · {formatDate(doc.published_at)}</span>}
    </li>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: p }, role] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,description,status,status_changed_at,announced_amount,currency,trust_layer,publication_status,review_notes,reviewed_at,primary_source_document_id,official_document_id,amount_source_document_id,created_at")
      .eq("id", id)
      .maybeSingle(),
    getCurrentRole(),
  ]);
  if (!p) notFound();
  const staff = isStaffRole(role);
  const [permits, history] = await Promise.all([
    supabase
      .from("permits")
      .select("id,permit_type,status,file_number,requested_at,decided_at,official_document_id,publication_status")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("registry_status_changes")
      .select("id,project_id,permit_id,from_status,to_status,document_id,changed_by_role,changed_at")
      .eq("project_id", id)
      .order("changed_at", { ascending: false })
      .limit(100),
  ]);
  const permitIds = (permits.data ?? []).map((m) => m.id);
  const permitHistory = permitIds.length
    ? await supabase
        .from("registry_status_changes")
        .select("id,project_id,permit_id,from_status,to_status,document_id,changed_by_role,changed_at")
        .in("permit_id", permitIds)
        .order("changed_at", { ascending: false })
        .limit(100)
    : { data: [] };
  const timeline = [...(history.data ?? []), ...(permitHistory.data ?? [])].sort((a, b) => b.changed_at.localeCompare(a.changed_at));
  const docIds = [
    ...new Set(
      [p.primary_source_document_id, p.official_document_id, p.amount_source_document_id, ...(permits.data ?? []).map((m) => m.official_document_id), ...timeline.map((t) => t.document_id)].filter(
        (x): x is string => !!x,
      ),
    ),
  ];
  const { data: docs } = docIds.length
    ? await supabase.from("source_documents").select("id,canonical_url,title,published_at").in("id", docIds)
    : { data: [] as Doc[] };
  const docById = new Map((docs ?? []).map((d) => [d.id, d as Doc]));
  const permitById = new Map((permits.data ?? []).map((m) => [m.id, m]));

  return (
    <div className="space-y-4">
      <Link href="/proyectos" className="text-sm font-semibold text-muted hover:text-primary">← Volver a proyectos</Link>

      <article className="card space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <TrustBadge layer={p.trust_layer} />
          <StatusBadge label={PUBLICATION[p.publication_status] ?? p.publication_status} tone={p.publication_status === "published" ? "success" : "warning"} />
        </div>
        <h1 className="page-title">{p.name}</h1>
        <p className="text-sm">
          <span className="font-semibold">Estado: </span>
          {PROJECT_STATUS[p.status] ?? p.status}
          {p.status_changed_at && <span className="text-muted"> · desde {when(p.status_changed_at)}</span>}
        </p>
        {p.description && <p className="text-sm">{p.description}</p>}
        <p className="num text-sm">
          <span className="font-semibold">Monto anunciado: </span>
          {p.announced_amount != null ? `${p.currency ?? ""} ${Number(p.announced_amount).toLocaleString("es-DO")}` : "No disponible"}
        </p>
        <ul className="space-y-1 border-t border-divider pt-2">
          <DocLink doc={docById.get(p.primary_source_document_id ?? "")} label="Documento fuente" />
          {p.official_document_id !== p.primary_source_document_id && (
            <DocLink doc={docById.get(p.official_document_id ?? "")} label="Documento oficial del estado" />
          )}
          {p.amount_source_document_id && p.amount_source_document_id !== p.primary_source_document_id && (
            <DocLink doc={docById.get(p.amount_source_document_id)} label="Fuente del monto" />
          )}
        </ul>
        {staff && p.review_notes && (
          <p className="text-xs text-muted">Nota de revisión: {p.review_notes}{p.reviewed_at ? ` (${when(p.reviewed_at)})` : ""}</p>
        )}
      </article>

      <section className="card" aria-labelledby="permisos">
        <h2 id="permisos" className="text-base font-semibold">Permisos</h2>
        {permits.data?.length ? (
          <ul className="mt-2 divide-y divide-divider">
            {permits.data.map((m) => (
              <li key={m.id} className="py-2 text-sm">
                <span className="font-semibold">{PERMIT_TYPE[m.permit_type] ?? m.permit_type}</span>
                <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-semibold ${m.status === "approved" ? "bg-success/15 text-success" : "bg-surface-2"}`}>
                  {PERMIT_STATUS[m.status] ?? m.status}
                </span>
                {m.publication_status !== "published" && <span className="ml-2 text-xs text-muted">({PUBLICATION[m.publication_status] ?? m.publication_status})</span>}
                <p className="text-xs text-muted">
                  {m.file_number ? `Expediente ${m.file_number} · ` : ""}
                  {m.requested_at ? `Solicitado ${formatDate(m.requested_at)}` : "Fecha de solicitud no indicada"}
                  {m.decided_at ? ` · Decidido ${formatDate(m.decided_at)}` : ""}
                </p>
                <ul><DocLink doc={docById.get(m.official_document_id ?? "")} label="Documento" /></ul>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">Sin permisos registrados.</p>
        )}
        {staff && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-primary">Añadir permiso</summary>
            <div className="mt-3"><PermitForm projectId={p.id} /></div>
          </details>
        )}
      </section>

      <section className="card" aria-labelledby="linea">
        <h2 id="linea" className="text-base font-semibold">Línea de tiempo</h2>
        {timeline.length ? (
          <ol className="mt-2 space-y-2 border-l-2 border-divider pl-4">
            {timeline.map((t) => {
              const permit = t.permit_id ? permitById.get(t.permit_id) : null;
              const doc = t.document_id ? docById.get(t.document_id) : undefined;
              return (
                <li key={t.id} className="text-sm">
                  <p className="text-xs text-muted">
                    {when(t.changed_at)}
                    {t.changed_by_role ? ` · ${ROLE[t.changed_by_role] ?? t.changed_by_role}` : ""}
                  </p>
                  <p>
                    {permit ? `Permiso ${(PERMIT_TYPE[permit.permit_type] ?? permit.permit_type).toLowerCase()}: ` : "Proyecto: "}
                    {t.from_status ? `${statusLabel(t.from_status)} → ` : "registrado como "}
                    <span className="font-semibold">{statusLabel(t.to_status)}</span>
                  </p>
                  {doc && (
                    <a href={doc.canonical_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                      {doc.title ?? "Documento"} ↗
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-1 text-sm text-muted">Sin cambios registrados.</p>
        )}
      </section>

      {staff && (
        <section className="card" aria-labelledby="estado">
          <h2 id="estado" className="mb-2 text-base font-semibold">Actualizar estado</h2>
          <StatusForm id={p.id} current={p.status} />
        </section>
      )}

      {canPublishRole(role) && p.publication_status !== "published" && (
        <section className="card" aria-labelledby="decidir">
          <h2 id="decidir" className="mb-2 text-base font-semibold">Revisión del gestor</h2>
          <p className="mb-2 text-xs text-muted">
            Antes de publicar, abre el documento fuente y comprueba que el nombre, el estado y el monto coinciden. Al publicar, el
            dato pasa a «Confirmado».
          </p>
          <DecideForm id={p.id} />
        </section>
      )}
    </div>
  );
}

export default function ProyectoPage(props: PageProps<"/proyectos/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Detail params={props.params} />
    </Suspense>
  );
}
