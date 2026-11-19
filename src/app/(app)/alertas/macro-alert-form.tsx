"use client";

import { useActionState } from "react";
import { createMacroAlert, type AlertResult } from "./actions";

/** Alerta temprana sobre los datos oficiales del BCRD. El umbral del dólar lo decide el usuario. */
export function MacroAlertForm() {
  const [state, action, pending] = useActionState<AlertResult | null, FormData>(createMacroAlert, null);
  return (
    <form action={action} className="card mb-6 space-y-3" aria-labelledby="macro-alert">
      <h2 id="macro-alert" className="text-base font-semibold">Alerta sobre datos del Banco Central</h2>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="macro-name" className="mb-1 block text-sm font-medium">Nombre</label>
          <input id="macro-name" name="name" required maxLength={60} className="field w-56" />
        </div>
        <fieldset className="space-y-1 text-sm">
          <legend className="sr-only">Condiciones</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="new_data" /> Cuando el BCRD publique un valor nuevo
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="trend" /> Cuando un indicador cambie de dirección
          </label>
        </fieldset>
        <div>
          <label htmlFor="fx_pct" className="mb-1 block text-sm font-medium">Dólar: avisar si se mueve en un día al menos (%)</label>
          <input id="fx_pct" name="fx_pct" inputMode="decimal" className="field w-32" aria-describedby="fx_help" />
          <p id="fx_help" className="mt-1 text-xs text-muted">Déjalo vacío si no quieres esta alerta. Entre 0 y 20.</p>
        </div>
        <button disabled={pending} className="btn">{pending ? "Guardando…" : "Crear alerta macro"}</button>
      </div>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
