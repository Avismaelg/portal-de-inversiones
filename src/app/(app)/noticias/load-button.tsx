"use client";

import { useActionState } from "react";
import { loadNews, type NewsLoadResult } from "./actions";

export function LoadNewsButton() {
  const [state, action, pending] = useActionState<NewsLoadResult | null, FormData>(() => loadNews(), null);
  return (
    <form action={action} className="mb-6 flex flex-wrap items-center gap-3">
      <button disabled={pending} className="btn">
        {pending ? "Buscando…" : "Buscar noticias nuevas"}
      </button>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
