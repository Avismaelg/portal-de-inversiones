"use client";

import { useActionState } from "react";
import { PERMIT_STATUS, PERMIT_TYPE, PROJECT_STATUS } from "@/lib/registry-labels";
import { addPermit, changeProjectStatus, createProject, decideProject, type RegistryResult } from "./actions";

type FormState = (RegistryResult & { fields?: Record<string, string> }) | null;

/**
 * React 19 vacía el formulario al terminar la acción: si hubo error, se devuelven los valores enviados
 * para usarlos como `defaultValue` y no perder lo escrito.
 */
function useKeepOnError(fn: (p: RegistryResult | null, fd: FormData) => Promise<RegistryResult>) {
  return useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await fn(prev, fd);
    if (r.ok) return r;
    const fields: Record<string, string> = {};
    fd.forEach((v, k) => {
      if (typeof v === "string") fields[k] = v;
    });
    return { ...r, fields };
  }, null);
}

function Result({ state }: { state: RegistryResult | null }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>
      {state.message}
    </p>
  );
}

/** Campos del documento oficial (enlace obligatorio en dominio del Estado, título y fecha opcionales). */
function DocFields({ required = true, idPrefix, v }: { required?: boolean; idPrefix: string; v?: Record<string, string> }) {
  return (
    <fieldset className="grid gap-3 rounded border border-divider p-3 sm:grid-cols-[2fr_2fr_1fr]">
      <legend className="px-1 text-sm font-medium">Documento oficial {required ? "" : "(solo si cambia)"}</legend>
      <div>
        <label htmlFor={`${idPrefix}-url`} className="mb-1 block text-sm">Enlace (https, .gob.do o .gov.do)</label>
        <input id={`${idPrefix}-url`} name="doc_url" type="url" required={required} defaultValue={v?.doc_url} className="field w-full" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-title`} className="mb-1 block text-sm">Título del documento</label>
        <input id={`${idPrefix}-title`} name="doc_title" maxLength={300} defaultValue={v?.doc_title} className="field w-full" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-date`} className="mb-1 block text-sm">Fecha del documento</label>
        <input id={`${idPrefix}-date`} name="doc_date" type="date" defaultValue={v?.doc_date} className="field w-full" />
      </div>
    </fieldset>
  );
}

function StatusSelect({ name, id, options, defaultValue }: { name: string; id: string; options: Record<string, string>; defaultValue?: string }) {
  return (
    <select key={defaultValue} id={id} name={name} defaultValue={defaultValue} className="field">
      {Object.entries(options).map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

export function NewProjectForm() {
  const [state, action, pending] = useKeepOnError(createProject);
  const v = state?.fields;
  return (
    <form action={action} className="card mb-6 space-y-3" aria-labelledby="nuevo-proyecto">
      <h2 id="nuevo-proyecto" className="text-base font-semibold">Registrar proyecto (borrador)</h2>
      <p className="text-xs text-muted">
        Copia los datos tal como aparecen en el documento oficial. Queda como borrador hasta que un gestor lo revise y publique.
      </p>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor="p-name" className="mb-1 block text-sm font-medium">Nombre del proyecto</label>
          <input id="p-name" name="name" required minLength={3} maxLength={200} defaultValue={v?.name} className="field w-full" />
        </div>
        <div>
          <label htmlFor="p-status" className="mb-1 block text-sm font-medium">Estado según el documento</label>
          <StatusSelect id="p-status" name="status" options={PROJECT_STATUS} defaultValue={v?.status ?? "announced"} />
        </div>
      </div>
      <div>
        <label htmlFor="p-desc" className="mb-1 block text-sm font-medium">Descripción</label>
        <textarea id="p-desc" name="description" maxLength={2000} rows={2} defaultValue={v?.description} className="field w-full" />
      </div>
      <div className="flex flex-wrap gap-3">
        <div>
          <label htmlFor="p-amount" className="mb-1 block text-sm font-medium">Monto anunciado (opcional)</label>
          <input id="p-amount" name="amount" inputMode="decimal" defaultValue={v?.amount} className="field w-48" />
        </div>
        <div>
          <label htmlFor="p-currency" className="mb-1 block text-sm font-medium">Moneda</label>
          <input id="p-currency" name="currency" maxLength={3} defaultValue={v?.currency} className="field w-24 uppercase" aria-describedby="p-currency-help" />
          <p id="p-currency-help" className="mt-1 text-xs text-muted">Código de 3 letras</p>
        </div>
      </div>
      <DocFields idPrefix="p-doc" v={v} />
      <button disabled={pending} className="btn">{pending ? "Guardando…" : "Registrar borrador"}</button>
      <Result state={state} />
    </form>
  );
}

export function StatusForm({ id, current }: { id: string; current: string }) {
  const [state, action, pending] = useKeepOnError(changeProjectStatus);
  const v = state?.fields;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="s-status" className="mb-1 block text-sm font-medium">Nuevo estado</label>
        <StatusSelect id="s-status" name="status" options={PROJECT_STATUS} defaultValue={v?.status ?? current} />
        <p className="mt-1 text-xs text-muted">«Permiso aprobado», «En construcción» y «En operación» exigen el documento oficial que lo respalde.</p>
      </div>
      <DocFields idPrefix="s-doc" required={false} v={v} />
      <button disabled={pending} className="btn">{pending ? "Guardando…" : "Cambiar estado"}</button>
      <Result state={state} />
    </form>
  );
}

export function PermitForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useKeepOnError(addPermit);
  const v = state?.fields;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="project_id" value={projectId} />
      <div className="flex flex-wrap gap-3">
        <div>
          <label htmlFor="pm-type" className="mb-1 block text-sm font-medium">Tipo</label>
          <StatusSelect id="pm-type" name="permit_type" options={PERMIT_TYPE} defaultValue={v?.permit_type ?? "environmental"} />
        </div>
        <div>
          <label htmlFor="pm-status" className="mb-1 block text-sm font-medium">Estado</label>
          <StatusSelect id="pm-status" name="permit_status" options={PERMIT_STATUS} defaultValue={v?.permit_status ?? "requested"} />
        </div>
        <div>
          <label htmlFor="pm-file" className="mb-1 block text-sm font-medium">Expediente (si lo publica la fuente)</label>
          <input id="pm-file" name="file_number" maxLength={100} defaultValue={v?.file_number} className="field w-48" />
        </div>
        <div>
          <label htmlFor="pm-req" className="mb-1 block text-sm font-medium">Solicitado el</label>
          <input id="pm-req" name="requested_at" type="date" defaultValue={v?.requested_at} className="field" />
        </div>
        <div>
          <label htmlFor="pm-dec" className="mb-1 block text-sm font-medium">Decidido el</label>
          <input id="pm-dec" name="decided_at" type="date" defaultValue={v?.decided_at} className="field" />
        </div>
      </div>
      <DocFields idPrefix="pm-doc" v={v} />
      <button disabled={pending} className="btn">{pending ? "Guardando…" : "Añadir permiso"}</button>
      <Result state={state} />
    </form>
  );
}

export function DecideForm({ id }: { id: string }) {
  const [state, action, pending] = useKeepOnError(decideProject);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="d-notes" className="mb-1 block text-sm font-medium">Nota de revisión (obligatoria)</label>
        <textarea id="d-notes" name="notes" required maxLength={1000} rows={2} defaultValue={state?.fields?.notes} className="field w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button name="decision" value="publish" disabled={pending} className="btn">Publicar</button>
        <button name="decision" value="reject" disabled={pending} className="btn-ghost">Rechazar</button>
      </div>
      <Result state={state} />
    </form>
  );
}
