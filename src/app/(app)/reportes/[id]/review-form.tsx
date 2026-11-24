"use client";

import { useActionState } from "react";
import { reviewBriefAction, type BriefActionResult } from "../actions";

export function ReviewForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<BriefActionResult | null, FormData>(reviewBriefAction, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="brief-decision" className="mb-1 block text-sm font-medium">Decisión</label>
        <select id="brief-decision" name="decision" className="field w-full sm:w-56">
          <option value="publish">Publicar</option>
          <option value="reject">Rechazar</option>
        </select>
      </div>
      <div>
        <label htmlFor="brief-note" className="mb-1 block text-sm font-medium">Nota de revisión (obligatoria, mín. 10 caracteres)</label>
        <textarea id="brief-note" name="note" required minLength={10} maxLength={500} rows={3} className="field w-full" />
        <p className="mt-1 text-xs text-muted">
          Revisa las citas y que los escenarios no se lean como certezas. Tu nombre y la fecha quedan registrados; la nota no se
          puede editar después de publicar.
        </p>
      </div>
      <button disabled={pending} className="btn">{pending ? "Guardando…" : "Registrar decisión"}</button>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
