"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentRole } from "@/lib/auth";
import { todayInRD } from "@/lib/format";
import {
  parseDoc,
  parseProject,
  PERMIT_STATUS,
  PERMIT_TYPE,
  permitDedupKey,
  PROJECT_STATUS,
  PROJECT_STATUS_NEEDS_OFFICIAL,
  projectDedupKey,
  registryErrorMessage,
  type DocInput,
} from "@/lib/registry";
import { canPublishRole, isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";

export type RegistryResult = { ok: boolean; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function registerDoc(supabase: Supabase, doc: DocInput): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase.rpc("register_official_document", {
    p_url: doc.url,
    p_title: doc.title,
    p_published_on: doc.published_on,
  });
  if (error || !data) return { error: registryErrorMessage(error?.message) };
  return { id: data as string };
}

function docFrom(formData: FormData, prefix = "doc") {
  return parseDoc(
    { url: formData.get(`${prefix}_url`), title: formData.get(`${prefix}_title`), date: formData.get(`${prefix}_date`) },
    todayInRD(),
  );
}

/** Registra un proyecto en BORRADOR con su documento fuente (lo hace una persona; no publica). */
export async function createProject(_p: RegistryResult | null, formData: FormData): Promise<RegistryResult> {
  if (!isStaffRole(await getCurrentRole())) return { ok: false, message: "Tu rol no puede registrar proyectos." };
  const project = parseProject(Object.fromEntries(formData));
  if (typeof project === "string") return { ok: false, message: project };
  const doc = docFrom(formData);
  if (typeof doc === "string") return { ok: false, message: doc };
  const supabase = await createClient();
  const reg = await registerDoc(supabase, doc);
  if ("error" in reg) return { ok: false, message: reg.error };
  const needsOfficial = PROJECT_STATUS_NEEDS_OFFICIAL.has(project.status);
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: project.name,
      description: project.description,
      status: project.status,
      announced_amount: project.amount,
      currency: project.currency,
      amount_source_document_id: project.amount === null ? null : reg.id,
      primary_source_document_id: reg.id,
      official_document_id: needsOfficial ? reg.id : null,
      dedup_key: projectDedupKey(project.name),
      trust_layer: "inference",
      publication_status: "draft",
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, message: error?.code === "23505" ? "Ya existe un proyecto con ese nombre." : registryErrorMessage(error?.message) };
  }
  revalidatePath("/proyectos");
  redirect(`/proyectos/${data.id}`);
}

/** Cambia el estado del proyecto. Si el nuevo estado afirma una aprobación, exige el documento oficial. */
export async function changeProjectStatus(_p: RegistryResult | null, formData: FormData): Promise<RegistryResult> {
  if (!isStaffRole(await getCurrentRole())) return { ok: false, message: "Tu rol no puede cambiar el estado." };
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!UUID.test(id) || !(status in PROJECT_STATUS)) return { ok: false, message: "Datos no válidos." };
  const supabase = await createClient();
  const update: Record<string, unknown> = { status };
  if (String(formData.get("doc_url") ?? "").trim()) {
    const doc = docFrom(formData);
    if (typeof doc === "string") return { ok: false, message: doc };
    const reg = await registerDoc(supabase, doc);
    if ("error" in reg) return { ok: false, message: reg.error };
    update.official_document_id = reg.id;
  } else if (PROJECT_STATUS_NEEDS_OFFICIAL.has(status)) {
    const { data: cur } = await supabase.from("projects").select("official_document_id").eq("id", id).maybeSingle();
    if (!cur?.official_document_id) {
      return { ok: false, message: "Ese estado afirma una aprobación: adjunta el documento oficial que la respalda." };
    }
  }
  const { error } = await supabase.from("projects").update(update).eq("id", id);
  if (error) return { ok: false, message: registryErrorMessage(error.message) };
  revalidatePath(`/proyectos/${id}`);
  revalidatePath("/proyectos");
  return { ok: true, message: `Estado actualizado a «${PROJECT_STATUS[status]}».` };
}

/** Añade un permiso vinculado al proyecto, con su documento. */
export async function addPermit(_p: RegistryResult | null, formData: FormData): Promise<RegistryResult> {
  if (!isStaffRole(await getCurrentRole())) return { ok: false, message: "Tu rol no puede registrar permisos." };
  const projectId = String(formData.get("project_id") ?? "");
  const type = String(formData.get("permit_type") ?? "");
  const status = String(formData.get("permit_status") ?? "");
  if (!UUID.test(projectId) || !(type in PERMIT_TYPE) || !(status in PERMIT_STATUS)) return { ok: false, message: "Datos no válidos." };
  const fileNumber = String(formData.get("file_number") ?? "").trim().slice(0, 100) || null;
  const requested = String(formData.get("requested_at") ?? "").trim() || null;
  const decided = String(formData.get("decided_at") ?? "").trim() || null;
  const today = todayInRD();
  for (const d of [requested, decided]) {
    if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > today)) return { ok: false, message: "Las fechas del permiso no pueden ser futuras." };
  }
  if (requested && decided && decided < requested) return { ok: false, message: "La fecha de decisión no puede ser anterior a la solicitud." };
  const doc = docFrom(formData);
  if (typeof doc === "string") return { ok: false, message: doc };
  const supabase = await createClient();
  const reg = await registerDoc(supabase, doc);
  if ("error" in reg) return { ok: false, message: reg.error };
  const { error } = await supabase.from("permits").insert({
    project_id: projectId,
    permit_type: type,
    status,
    file_number: fileNumber,
    requested_at: requested,
    decided_at: decided,
    official_document_id: reg.id,
    dedup_key: permitDedupKey(projectId, type, fileNumber, doc.url),
    trust_layer: "inference",
    publication_status: "draft",
  });
  if (error) return { ok: false, message: error.code === "23505" ? "Ese permiso ya está registrado." : registryErrorMessage(error.message) };
  revalidatePath(`/proyectos/${projectId}`);
  return { ok: true, message: "Permiso registrado como borrador." };
}

/** Publicar (gestor, con nota): el dato pasa a «confirmado» porque está respaldado por el documento oficial revisado. */
export async function decideProject(_p: RegistryResult | null, formData: FormData): Promise<RegistryResult> {
  if (!canPublishRole(await getCurrentRole())) return { ok: false, message: "Solo un gestor puede publicar o rechazar." };
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000);
  if (!UUID.test(id) || !["publish", "reject"].includes(decision)) return { ok: false, message: "Datos no válidos." };
  if (!notes) return { ok: false, message: "Escribe una nota de revisión." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update(
      decision === "publish"
        ? { publication_status: "published", review_notes: notes, trust_layer: "confirmed" }
        : { publication_status: "rejected", review_notes: notes },
    )
    .eq("id", id);
  if (error) return { ok: false, message: registryErrorMessage(error.message) };
  revalidatePath(`/proyectos/${id}`);
  revalidatePath("/proyectos");
  return { ok: true, message: decision === "publish" ? "Proyecto publicado." : "Proyecto rechazado." };
}
