"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";

export type Field = {
  name: string;
  label: string;
  type: "email" | "password";
  autoComplete: string;
};

const input = "w-full rounded border border-line bg-surface px-3 py-2 text-base";

/** Formulario de autenticación genérico: campos, casilla de términos opcional y mensajes anunciados. */
export function AuthForm({
  action,
  fields,
  submit,
  pendingLabel,
  terms,
  hint,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  fields: Field[];
  submit: string;
  pendingLabel: string;
  terms?: boolean;
  hint?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-4">
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="mb-1 block text-sm font-medium">
            {f.label}
          </label>
          <input id={f.name} name={f.name} type={f.type} autoComplete={f.autoComplete} required className={input} />
        </div>
      ))}
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {terms && (
        <div className="flex items-start gap-2 text-sm">
          <input id="terms" name="terms" type="checkbox" className="mt-1" />
          <label htmlFor="terms">
            Acepto los términos de uso y la política de privacidad{" "}
            <span className="text-muted">(textos legales pendientes de revisión de abogado)</span>.
          </label>
        </div>
      )}
      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="text-sm text-success">
          {state.message}
        </p>
      )}
      <button disabled={pending} className="w-full rounded bg-primary px-3 py-2 font-medium text-on-primary disabled:opacity-60">
        {pending ? pendingLabel : submit}
      </button>
    </form>
  );
}
