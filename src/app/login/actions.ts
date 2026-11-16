"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string } | null;

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`;
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Escribe tu correo y tu contraseña." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const GENERIC_SIGNUP = "Si el correo es válido, te enviamos un enlace para verificarlo. Revisa tu bandeja.";

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Escribe un correo válido." };
  if (password.length < 10) return { error: "La contraseña debe tener al menos 10 caracteres." };
  if (formData.get("terms") !== "on") return { error: "Debes aceptar los términos y la política de privacidad." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=/dashboard`,
      data: { terms_accepted_at: new Date().toISOString() },
    },
  });
  // Mensaje genérico: no revela si el correo ya existe (AC-AUX-02).
  if (error && /password|weak|rate|limit/i.test(error.message)) {
    return { error: "No se pudo crear la cuenta. Prueba otra contraseña o espera unos minutos." };
  }
  return { message: GENERIC_SIGNUP };
}

export async function requestReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Escribe un correo válido." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback?next=/restablecer`,
  });
  return { message: "Si el correo está registrado, te enviamos un enlace para restablecer la contraseña." };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 10) return { error: "La contraseña debe tener al menos 10 caracteres." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "Las contraseñas no coinciden." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "No se pudo cambiar la contraseña. Solicita un enlace nuevo." };
  redirect("/dashboard");
}
