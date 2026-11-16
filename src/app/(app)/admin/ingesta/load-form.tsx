"use client";

import { useActionState } from "react";
import { loadDgcpSample, type LoadResult } from "./actions";

export function LoadForm() {
  const [state, action, pending] = useActionState<LoadResult | null, FormData>(loadDgcpSample, null);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="days" className="mb-1 block text-sm font-medium">
          Ventana (días hacia atrás)
        </label>
        <input
          id="days"
          name="days"
          type="number"
          min={1}
          max={14}
          defaultValue={3}
          className="w-24 rounded border border-line bg-surface px-3 py-2"
        />
      </div>
      <button disabled={pending} className="rounded bg-primary px-4 py-2 font-medium text-on-primary disabled:opacity-60">
        {pending ? "Cargando…" : "Cargar muestra de DGCP"}
      </button>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
