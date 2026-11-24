"use client";

import { useActionState } from "react";
import { generateBriefAction, type BriefActionResult } from "./actions";

type FormState = (BriefActionResult & { fields?: Record<string, string> }) | null;

export function NewBriefForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await generateBriefAction(prev, fd);
    if (r.ok) return r;
    const fields: Record<string, string> = {};
    fd.forEach((v, k) => {
      if (typeof v === "string") fields[k] = v;
    });
    return { ...r, fields };
  }, null);
  const v = state?.fields;

  return (
    <form action={action} className="card mb-6 space-y-3" aria-labelledby="nueva-nota">
      <h2 id="nueva-nota" className="text-base font-semibold">Generar nota de inteligencia</h2>
      <p className="text-xs text-muted">
        La IA leerá hasta 8 noticias del periodo (solo en memoria), buscará patrones y decisiones y descartará todo dato sin cita
        literal. Una nota tarda hasta un minuto y cuesta céntimos. Queda en borrador hasta que un gestor la revise.
      </p>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor="brief-topic" className="mb-1 block text-sm font-medium">Tema (opcional)</label>
          <input
            id="brief-topic"
            name="topic"
            maxLength={80}
            defaultValue={v?.topic}
            placeholder="telecomunicaciones, energía, zonas francas…"
            className="field w-full"
          />
          <p className="mt-1 text-xs text-muted">Vacío = las noticias más recientes del periodo.</p>
        </div>
        <div>
          <label htmlFor="brief-days" className="mb-1 block text-sm font-medium">Periodo</label>
          <select id="brief-days" name="days" defaultValue={v?.days ?? "30"} className="field w-full">
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
        </div>
      </div>
      <button disabled={pending} className="btn">
        {pending ? "Leyendo fuentes y generando…" : "Generar nota"}
      </button>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
