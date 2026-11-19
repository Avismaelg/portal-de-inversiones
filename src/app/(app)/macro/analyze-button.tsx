"use client";

import { useActionState } from "react";
import { analyzeMacroPulse, type MacroAnalyzeResult } from "./actions";

export function MacroAnalyzeButton() {
  const [state, action, pending] = useActionState<MacroAnalyzeResult | null, FormData>(analyzeMacroPulse, null);
  return (
    <form action={action} className="space-y-2">
      <button disabled={pending} className="btn">
        {pending ? "Analizando… (puede tardar un minuto)" : "Generar análisis de impacto con IA"}
      </button>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
