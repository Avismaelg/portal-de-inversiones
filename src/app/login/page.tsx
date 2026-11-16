import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center p-6">
      <h1 className="mb-1 text-2xl font-semibold">Iniciar sesión</h1>
      <p className="mb-6 text-sm text-muted">AviTech Investment Intelligence</p>
      <LoginForm />
    </main>
  );
}
