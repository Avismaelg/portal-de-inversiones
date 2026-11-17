"use client";

import { useActionState } from "react";
import { analyzeNewsItem, type AnalyzeResult } from "./analyze-actions";

export function AnalyzeButton({ id, again }: { id: string; again: boolean }) {
  const [state, action, pending] = useActionState<AnalyzeResult | null, FormData>(analyzeNewsItem, null);
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button disabled={pending} className="btn-ghost">
        {pending ? "Analizando…" : again ? "Volver a analizar" : "Analizar impacto con IA"}
      </button>
      {state && !state.ok && <p role="alert" className="text-xs text-danger">{state.message}</p>}
    </form>
  );
}
