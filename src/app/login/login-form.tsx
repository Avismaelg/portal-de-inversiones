"use client";

import { signIn } from "./actions";
import { AuthForm } from "./auth-form";

export function LoginForm() {
  return (
    <AuthForm
      action={signIn}
      submit="Entrar"
      pendingLabel="Entrando…"
      fields={[
        { name: "email", label: "Correo", type: "email", autoComplete: "username" },
        { name: "password", label: "Contraseña", type: "password", autoComplete: "current-password" },
      ]}
    />
  );
}
