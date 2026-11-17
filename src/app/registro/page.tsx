import type { Metadata } from "next";
import Link from "next/link";
import { signUp } from "../login/actions";
import { AuthForm } from "../login/auth-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center p-6">
      <h1 className="page-title mb-1">Crear cuenta</h1>
      <p className="mb-6 text-sm text-muted">Verificaremos tu correo antes de dejarte entrar.</p>
      <AuthForm
        action={signUp}
        submit="Crear cuenta"
        pendingLabel="Creando cuenta…"
        terms
        hint="La contraseña debe tener al menos 10 caracteres."
        fields={[
          { name: "email", label: "Correo", type: "email", autoComplete: "email" },
          { name: "password", label: "Contraseña", type: "password", autoComplete: "new-password" },
        ]}
      />
      <p className="mt-6 text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-primary underline">
          Iniciar sesión
        </Link>
      </p>
    </main>
  );
}
