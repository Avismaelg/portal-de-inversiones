import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentRole } from "@/lib/auth";
import { canPublishRole } from "@/lib/review-rules";
import { BcrdForm } from "./bcrd-form";
import { LoadForm } from "./load-form";

export const metadata: Metadata = { title: "Carga de datos" };

async function Content() {
  if (!canPublishRole(await getCurrentRole())) {
    return <p className="empty-state">No tienes permisos para ver esta sección.</p>;
  }
  return (
    <>
      <p className="mb-4 rounded border border-dashed border-warning p-3 text-sm text-warning">
        Carga manual asistida. La fuente DGCP sigue con estado legal <strong>pendiente de revisión</strong> y no está
        activa como conector automático: esta carga la dispara una persona y trae como máximo 300 procesos recientes.
      </p>
      <LoadForm />
      <section aria-labelledby="bcrd" className="card mt-8">
        <h2 id="bcrd" className="mb-2 text-lg font-semibold">Banco Central (BCRD)</h2>
        <p className="mb-3 text-sm text-muted">
          Trae el último dato de inflación, tasas, sector real y sector externo, la tasa de cambio de los últimos 45 días
          y el índice de precios mensual de los últimos dos años. Usa 6 de las 500 llamadas diarias del token y genera
          tus alertas del BCRD. La fuente sigue con estado legal{" "}
          <strong>pendiente de revisión</strong>: esta carga la dispara una persona. El BCRD solo acepta llamadas desde
          la IP IPv4 registrada en su consola.
        </p>
        <BcrdForm />
      </section>
    </>
  );
}

export default function IngestaPage() {
  return (
    <>
      <h1 className="page-title mb-2">Carga de datos</h1>
      <p className="mb-6 text-sm text-muted">
        Cargas manuales asistidas de fuentes primarias. Las dispara una persona con rol de gestión; ninguna fuente está
        activa como conector automático.
      </p>
      <h2 className="mb-2 text-lg font-semibold">Compras públicas (DGCP)</h2>
      <p className="mb-3 text-sm text-muted">
        Fuente: API de datos abiertos de la DGCP. Los datos son de las instituciones; la DGCP no responde por su
        veracidad (Ley 340-06, art. 34).
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Content />
      </Suspense>
    </>
  );
}
