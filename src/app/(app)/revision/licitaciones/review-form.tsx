"use client";

import { useActionState } from "react";
import { reviewTender, type TenderReviewResult } from "../tender-actions";

export function TenderReviewForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<TenderReviewResult | null, FormData>(reviewTender, null);
  if (state?.ok) return <p role="status" className="mt-3 text-sm text-success">{state.message}</p>;
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="id" value={id} />
      <label htmlFor={`note-${id}`} className="block text-sm font-medium">
        Nota de revisión (obligatoria)
      </label>
      <textarea
        id={`note-${id}`}
        name="note"
        required
        minLength={10}
        maxLength={500}
        rows={2}
        className="field w-full"
        placeholder="Qué comprobaste en el portal de la DGCP y por qué decides publicar o rechazar."
      />
      <div className="flex flex-wrap gap-2">
        <button name="decision" value="publish" disabled={pending} className="btn">Publicar con nota</button>
        <button name="decision" value="reject" disabled={pending} className="btn-ghost">Rechazar</button>
      </div>
      {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.message}</p>}
    </form>
  );
}
