import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusBadge, TrustBadge } from "@/components/trust-badge";
import { getCurrentRole } from "@/lib/auth";
import { PUBLICATION } from "@/lib/format";
import { PROJECT_STATUS } from "@/lib/registry-labels";
import { isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";
import { NewProjectForm } from "./forms";

export const metadata: Metadata = { title: "Proyectos y permisos" };

async function List() {
  await connection();
  const supabase = await createClient();
  const [{ data, error }, role] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,status,description,announced_amount,currency,trust_layer,publication_status,status_changed_at")
      .is("merged_into_id", null)
      .order("created_at", { ascending: false })
      .limit(50),
    getCurrentRole(),
  ]);
  const staff = isStaffRole(role);
  if (error) return <p role="alert" className="text-danger">No se pudieron cargar los proyectos.</p>;
  return (
    <>
      {staff && <NewProjectForm />}
      {!data?.length ? (
        <p className="empty-state">
          {staff
            ? "Aún no hay proyectos. Registra el primero con el enlace al documento oficial que lo respalda."
            : "Aún no hay proyectos publicados. Se publican tras revisar el documento oficial que los respalda."}
        </p>
      ) : (
        <ul className="space-y-3">
          {data.map((p) => (
            <li key={p.id} className="card">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <TrustBadge layer={p.trust_layer} />
                <span>{PROJECT_STATUS[p.status ?? "unknown"] ?? p.status}</span>
                {p.publication_status !== "published" && (
                  <StatusBadge label={PUBLICATION[p.publication_status] ?? p.publication_status} tone="warning" />
                )}
              </div>
              <h2 className="mt-1 font-semibold">
                <Link href={`/proyectos/${p.id}`} className="hover:text-primary hover:underline">{p.name}</Link>
              </h2>
              {p.description && <p className="mt-1 line-clamp-2 text-sm">{p.description}</p>}
              <p className="num mt-1 text-xs text-muted">
                Monto anunciado:{" "}
                {p.announced_amount != null ? `${p.currency ?? ""} ${Number(p.announced_amount).toLocaleString("es-DO")}` : "No disponible"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ProyectosPage() {
  return (
    <>
      <p className="eyebrow">Proyectos y permisos</p>
      <h1 className="page-title">Proyectos en marcha</h1>
      <p className="page-lead">
        Un proyecto con «permiso solicitado» no es un proyecto aprobado: el estado se muestra tal como lo documenta la fuente oficial,
        con su línea de tiempo.
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <List />
      </Suspense>
    </>
  );
}
