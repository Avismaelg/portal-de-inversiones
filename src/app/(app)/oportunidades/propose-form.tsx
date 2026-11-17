"use client";

import Link from "next/link";
import { useActionState } from "react";
import { OPPORTUNITY_TYPES } from "@/lib/opportunity-types";
import { proposeOpportunity, type ProposeResult } from "./actions";

export function ProposeForm(props: { newsId: string; title: string; description: string; risks: string; nextStep: string }) {
  const [state, action, pending] = useActionState<ProposeResult | null, FormData>(proposeOpportunity, null);
  if (state?.ok && state.id) {
    return (
      <p role="status" className="mt-2 text-sm text-success">
        {state.message} <Link href={`/oportunidades/${state.id}`} className="underline">Ver oportunidad →</Link>
      </p>
    );
  }
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-sm font-semibold text-primary">Proponer como oportunidad</summary>
      <form action={action} className="mt-2 space-y-2">
        <input type="hidden" name="news_id" value={props.newsId} />
        <input type="hidden" name="risks" value={props.risks} />
        <input type="hidden" name="next_step" value={props.nextStep} />
        <label className="block text-xs font-medium">
          Tipo
          <select name="type" required defaultValue="" className="field mt-1 w-full">
            <option value="" disabled>Elige un tipo</option>
            {Object.entries(OPPORTUNITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="block text-xs font-medium">
          Título
          <input name="title" required minLength={5} maxLength={200} defaultValue={props.title} className="field mt-1 w-full" />
        </label>
        <label className="block text-xs font-medium">
          Descripción
          <textarea name="description" required minLength={10} maxLength={2000} rows={3} defaultValue={props.description} className="field mt-1 w-full" />
        </label>
        <button disabled={pending} className="btn">{pending ? "Creando…" : "Crear en borrador"}</button>
        <p className="text-xs text-muted">Queda en borrador como inferencia. Publicarla exige verificar el acontecimiento y añadir evidencia literal.</p>
        {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.message}</p>}
      </form>
    </details>
  );
}
