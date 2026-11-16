import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentRole } from "@/lib/auth";
import { canPublishRole } from "@/lib/review-rules";
import { LoadForm } from "./load-form";

export const metadata: Metadata = { title: "Carga de datos" };

async function Content() {
  if (!canPublishRole(await getCurrentRole())) {
    return <p className="rounded border border-line p-6 text-muted">No tienes permisos para ver esta sección.</p>;
  }
  return (
    <>
      <p className="mb-4 rounded border border-dashed border-warning p-3 text-sm text-warning">
        Carga manual asistida. La fuente DGCP sigue con estado legal <strong>pendiente de revisión</strong> y no está
        activa como conector automático: esta carga la dispara una persona y trae como máximo 300 procesos recientes.
      </p>
      <LoadForm />
    </>
  );
}

export default function IngestaPage() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">Carga de datos — DGCP</h1>
      <p className="mb-6 text-sm text-muted">
        Fuente: API de datos abiertos de la DGCP. Los datos son de las instituciones; la DGCP no responde por su
        veracidad (Ley 340-06, art. 34).
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Content />
      </Suspense>
    </>
  );
}
