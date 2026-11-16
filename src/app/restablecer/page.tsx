import type { Metadata } from "next";
import { updatePassword } from "../login/actions";
import { AuthForm } from "../login/auth-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function RestablecerPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center p-6">
      <h1 className="mb-6 text-2xl font-semibold">Nueva contraseña</h1>
      <AuthForm
        action={updatePassword}
        submit="Guardar contraseña"
        pendingLabel="Guardando…"
        hint="Al menos 10 caracteres."
        fields={[
          { name: "password", label: "Contraseña nueva", type: "password", autoComplete: "new-password" },
          { name: "confirm", label: "Repite la contraseña", type: "password", autoComplete: "new-password" },
        ]}
      />
    </main>
  );
}
