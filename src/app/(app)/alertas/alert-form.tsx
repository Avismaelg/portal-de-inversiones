"use client";

import { useActionState } from "react";
import { createAlert, type AlertResult } from "./actions";

export function AlertForm() {
  const [state, action, pending] = useActionState<AlertResult | null, FormData>(createAlert, null);
  return (
    <form action={action} className="card mb-6 flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">Nombre</label>
        <input id="name" name="name" required maxLength={60} className="field w-56" placeholder="Telecomunicaciones" />
      </div>
      <div className="min-w-64 flex-1">
        <label htmlFor="keywords" className="mb-1 block text-sm font-medium">Palabras clave (separadas por coma)</label>
        <input id="keywords" name="keywords" required className="field w-full" placeholder="concesión, espectro, Indotel" />
      </div>
      <button disabled={pending} className="btn">{pending ? "Guardando…" : "Crear alerta"}</button>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`w-full text-sm ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
