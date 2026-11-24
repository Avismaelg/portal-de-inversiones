import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusBadge, TrustBadge } from "@/components/trust-badge";
import { getCurrentRole } from "@/lib/auth";
import { StoredBriefSchema } from "@/lib/ai/pattern-brief";
import { PUBLICATION } from "@/lib/format";
import { isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";
import { NewBriefForm } from "./new-brief-form";

export const metadata: Metadata = { title: "Notas de inteligencia" };

const day = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
    : "sin fecha";

async function List() {
  await connection();
  const supabase = await createClient();
  const [{ data, error }, role] = await Promise.all([
    supabase
      .from("intelligence_briefs")
      .select("id,scope_label,period_start,period_end,headline,lead,publication_status,published_at,created_at,payload")
      .order("created_at", { ascending: false })
      .limit(30),
    getCurrentRole(),
  ]);
  const staff = isStaffRole(role);

  if (error) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar las notas. Comprueba que la migración 27 esté aplicada en la base.
      </p>
    );
  }

  return (
    <>
      {staff && <NewBriefForm />}
      {!data?.length ? (
        <p className="empty-state">
          {staff
            ? "Aún no hay notas. Genera la primera con al menos dos noticias del periodo."
            : "Aún no hay notas publicadas. Se publican después de que un gestor revise las citas y los escenarios."}
        </p>
      ) : (
        <ul className="space-y-3">
          {data.map((b) => {
            const parsed = b.payload ? StoredBriefSchema.safeParse(b.payload) : null;
            const stats = parsed?.success ? parsed.data.brief.stats : null;
            return (
              <li key={b.id} className="card">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <TrustBadge layer="ai_analysis" />
                  <StatusBadge
                    label={PUBLICATION[b.publication_status] ?? b.publication_status}
                    tone={b.publication_status === "published" ? "success" : "warning"}
                  />
                  <span>{b.scope_label}</span>
                  <span>
                    {day(b.period_start)} — {day(b.period_end)}
                  </span>
                </div>
                <h2 className="mt-1 text-lg font-semibold leading-snug">
                  <Link href={`/reportes/${b.id}`} className="hover:text-primary hover:underline">
                    {b.headline}
                  </Link>
                </h2>
                <p className="mt-1 line-clamp-2 text-sm">{b.lead}</p>
                <p className="mt-2 text-xs text-muted">
                  {stats
                    ? `${stats.facts_verified} hecho(s) con cita · ${stats.patterns_verified} patrón(es) · cobertura de evidencia ${Math.round(
                        stats.evidence_coverage * 100,
                      )} %`
                    : "Contenido no verificable en este navegador"}
                  {b.publication_status !== "published" ? " · solo visible para staff" : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function ReportesPage() {
  return (
    <>
      <p className="eyebrow">Inteligencia · Reportes</p>
      <h1 className="page-title">Notas de inteligencia</h1>
      <p className="page-lead">
        Notas generadas por IA a partir de varias noticias: hechos con cita literal, patrones que exigen al menos dos fuentes,
        decisiones de empresas o gobierno, escenarios y verificaciones pendientes. No son noticias de un medio ni asesoría de
        inversión.
      </p>
      <Suspense fallback={<p className="text-muted">Cargando notas…</p>}>
        <List />
      </Suspense>
    </>
  );
}
