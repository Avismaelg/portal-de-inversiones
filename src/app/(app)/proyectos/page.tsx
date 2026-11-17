import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { TrustBadge } from "@/components/trust-badge";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Proyectos y permisos" };

const STATUS: Record<string, string> = {
  announced: "Anunciado",
  permit_applied: "Permiso solicitado",
  permit_approved: "Permiso aprobado",
  under_construction: "En construcción",
  operating: "En operación",
  suspended: "Suspendido",
  cancelled: "Cancelado",
  unknown: "No disponible",
};

async function List() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,status,description,announced_amount,currency,trust_layer,publication_status")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return <p role="alert" className="text-danger">No se pudieron cargar los proyectos.</p>;
  if (!data?.length) {
    return (
      <p className="empty-state">
        Aún no hay proyectos publicados. Se cargarán cuando existan fuentes con licencia verificada (permisos ambientales, concesiones, anuncios oficiales).
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {data.map((p) => (
        <li key={p.id} className="card">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <TrustBadge layer={p.trust_layer} />
            <span>{STATUS[p.status ?? "unknown"] ?? p.status}</span>
            {p.publication_status !== "published" && <span>· {p.publication_status}</span>}
          </div>
          <h2 className="mt-1 font-semibold">{p.name}</h2>
          {p.description && <p className="mt-1 text-sm">{p.description}</p>}
          <p className="num mt-1 text-xs text-muted">
            Monto anunciado:{" "}
            {p.announced_amount != null ? `${p.currency ?? ""} ${Number(p.announced_amount).toLocaleString("es-DO")}` : "No disponible"}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function ProyectosPage() {
  return (
    <>
      <p className="eyebrow">Proyectos y permisos</p>
      <h1 className="page-title">Proyectos en marcha</h1>
      <p className="page-lead">
        Un proyecto con «permiso solicitado» no es un proyecto aprobado: el estado se muestra tal como lo documenta la fuente.
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <List />
      </Suspense>
    </>
  );
}
