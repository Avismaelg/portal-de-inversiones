import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", ready: true },
  { href: "/instrumentos", label: "Instrumentos", ready: true },
  { href: "#", label: "Radar", ready: false },
  { href: "#", label: "Proyectos y permisos", ready: false },
  { href: "#", label: "Licitaciones", ready: false },
  { href: "#", label: "Oportunidades", ready: false },
];

async function UserMenu() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (
    <form action={signOut} className="flex items-center gap-3 text-sm">
      <span className="text-muted">{String(data?.claims?.email ?? "")}</span>
      <button className="rounded border border-line px-3 py-1 hover:bg-surface-2">Cerrar sesión</button>
    </form>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:p-2">Saltar al contenido</a>
      <nav aria-label="Principal" className="border-b border-divider bg-bg-subtle p-4 md:w-60 md:border-b-0 md:border-r">
        <p className="mb-4 text-sm font-semibold">AviTech Investment Intelligence</p>
        <ul className="flex flex-wrap gap-1 md:flex-col">
          {NAV.map((n) => (
            <li key={n.label}>
              {n.ready ? (
                <Link href={n.href} className="block rounded px-3 py-2 text-sm hover:bg-surface-2">{n.label}</Link>
              ) : (
                <span className="block px-3 py-2 text-sm text-muted">
                  {n.label} <span className="text-xs">(cobertura pendiente)</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex justify-end border-b border-divider p-3">
          <Suspense fallback={<span className="text-sm text-muted">…</span>}>
            <UserMenu />
          </Suspense>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
