"use client";

import { useActionState } from "react";
import type { LoadResult } from "./actions";
import { loadBcrdData } from "./bcrd-actions";

export function BcrdForm() {
  const [state, action, pending] = useActionState<LoadResult | null, FormData>(loadBcrdData, null);
  return (
    <form action={action} className="space-y-3">
      <button disabled={pending} className="btn">
        {pending ? "Consultando el BCRD…" : "Actualizar desde BCRD"}
      </button>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
