"use client";

import { useActionState } from "react";
import { addEvidence, decideOpportunity, type StepResult, verifyEvent } from "./actions";

function Msg({ state }: { state: StepResult | null }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>
      {state.message}
    </p>
  );
}

export function VerifyEventForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<StepResult | null, FormData>(verifyEvent, null);
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={id} />
      <label className="block text-xs font-medium">
        Resultado
        <select name="result" required defaultValue="" className="field mt-1 w-full">
          <option value="" disabled>Elige el resultado</option>
          <option value="verified">Verificado (fuente oficial lo confirma)</option>
          <option value="partially_verified">Parcialmente verificado</option>
          <option value="disputed">Disputado (fuentes se contradicen)</option>
          <option value="unverifiable">No verificable</option>
        </select>
      </label>
      <label className="block text-xs font-medium">
        Cómo lo verificaste
        <textarea name="reason" required minLength={15} maxLength={1000} rows={2} className="field mt-1 w-full"
          placeholder="Fuente oficial consultada, fecha y qué confirma" />
      </label>
      <button disabled={pending} className="btn">{pending ? "Guardando…" : "Registrar verificación"}</button>
      <Msg state={state} />
    </form>
  );
}

export function EvidenceForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<StepResult | null, FormData>(addEvidence, null);
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={id} />
      <label className="block text-xs font-medium">
        Cita literal del documento fuente
        <textarea name="quote" required minLength={20} maxLength={1000} rows={3} className="field mt-1 w-full"
          placeholder="Copia y pega la frase exacta de la fuente que respalda la oportunidad" />
      </label>
      <button disabled={pending} className="btn">{pending ? "Comprobando en la fuente…" : "Comprobar y adjuntar"}</button>
      <p className="text-xs text-muted">El servidor lee la fuente en este momento y solo acepta la cita si aparece tal cual (se toleran espacios). El texto de la fuente no se guarda.</p>
      <Msg state={state} />
    </form>
  );
}

export function DecisionForm({ id, confidence, explanation }: { id: string; confidence: number | null; explanation: string | null }) {
  const [state, action, pending] = useActionState<StepResult | null, FormData>(decideOpportunity, null);
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
        <label className="block text-xs font-medium">
          Confianza (0–100)
          <input name="confidence" type="number" min={0} max={100} step={1} defaultValue={confidence ?? ""} className="field mt-1 w-full" />
        </label>
        <label className="block text-xs font-medium">
          Explicación de la confianza
          <input name="confidence_explanation" maxLength={1000} defaultValue={explanation ?? ""} className="field mt-1 w-full"
            placeholder="Qué la sostiene y qué la debilita" />
        </label>
      </div>
      <label className="block text-xs font-medium">
        Nota de revisión
        <textarea name="notes" required minLength={10} maxLength={1000} rows={2} className="field mt-1 w-full" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button name="decision" value="publish" disabled={pending} className="btn">{pending ? "Guardando…" : "Publicar"}</button>
        <button name="decision" value="reject" disabled={pending} className="btn-ghost">Rechazar</button>
      </div>
      <Msg state={state} />
    </form>
  );
}
