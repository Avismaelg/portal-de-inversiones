import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requestReset } from "../login/actions";
import { AuthForm } from "../login/auth-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

async function ExpiredNotice({ searchParams }: { searchParams: PageProps<"/recuperar">["searchParams"] }) {
  if ((await searchParams).expirado !== "1") return null;
  return (
    <p role="alert" className="mb-4 text-sm text-warning">
      El enlace caducó o ya se usó. Solicita uno nuevo.
    </p>
  );
}

export default function RecuperarPage(props: PageProps<"/recuperar">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center p-6">
      <h1 className="page-title mb-1">Recuperar contraseña</h1>
      <Suspense>
        <ExpiredNotice searchParams={props.searchParams} />
      </Suspense>
      <p className="mb-6 text-sm text-muted">Te enviaremos un enlace para elegir una contraseña nueva.</p>
      <AuthForm
        action={requestReset}
        submit="Enviar enlace"
        pendingLabel="Enviando…"
        fields={[{ name: "email", label: "Correo", type: "email", autoComplete: "email" }]}
      />
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-primary underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </main>
  );
}
