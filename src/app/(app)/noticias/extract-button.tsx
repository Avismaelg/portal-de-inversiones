"use client";

import { useActionState } from "react";
import { extractNewsData, type ExtractActionResult } from "./extract-actions";

export function ExtractButton({ id, again }: { id: string; again: boolean }) {
  const [state, action, pending] = useActionState<ExtractActionResult | null, FormData>(extractNewsData, null);
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button disabled={pending} className="btn-ghost">
        {pending ? "Extrayendo…" : again ? "Volver a extraer" : "Extraer datos con IA"}
      </button>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
