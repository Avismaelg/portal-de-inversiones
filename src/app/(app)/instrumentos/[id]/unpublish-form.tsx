"use client";

import { useActionState } from "react";
import { unpublishInstrument, type ReviewResult } from "../../revision/actions";

export function UnpublishForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(unpublishInstrument, null);
  return (
    <form action={action} className="mt-6 card">
      <h2 className="mb-2 font-semibold">Despublicar</h2>
      <p className="mb-2 text-sm text-muted">
        Devuelve el instrumento y sus subastas a borrador. El motivo queda registrado.
      </p>
      <input type="hidden" name="id" value={id} />
      <label htmlFor="reason" className="mb-1 block text-sm font-medium">
        Motivo
      </label>
      <textarea
        id="reason"
        name="reason"
        required
        minLength={10}
        rows={2}
        className="w-full field"
      />
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`mt-2 text-sm ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
      <button disabled={pending} className="mt-3 rounded border border-line px-3 py-1.5 text-sm hover:bg-surface-2">
        {pending ? "Despublicando…" : "Despublicar"}
      </button>
    </form>
  );
}
