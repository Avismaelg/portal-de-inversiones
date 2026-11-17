import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center p-6">
      <h1 className="page-title mb-1">Iniciar sesión</h1>
      <p className="mb-6 text-sm text-muted">AviTech Investment Intelligence</p>
      <LoginForm />
      <p className="mt-6 flex justify-between text-sm">
        <Link href="/recuperar" className="text-primary underline">
          Olvidé mi contraseña
        </Link>
        <Link href="/registro" className="text-primary underline">
          Crear cuenta
        </Link>
      </p>
    </main>
  );
}
