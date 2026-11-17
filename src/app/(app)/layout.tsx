import { Suspense } from "react";
import { NavLinks, NavList, type NavGroup } from "@/components/nav-links";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

const GROUPS: NavGroup[] = [
  {
    title: "Inteligencia",
    items: [
      { href: "/dashboard", label: "Dashboard", ready: true },
      { href: "/instrumentos", label: "Instrumentos", ready: true },
      { href: "/licitaciones", label: "Licitaciones", ready: true },
      { href: "/noticias", label: "Noticias", ready: true },
      { href: "/watchlist", label: "Mi lista", ready: true },
    ],
  },
  {
    title: "Gestión",
    items: [
      { href: "/revision", label: "Revisión", ready: true },
      { href: "/admin/ingesta", label: "Carga de datos", ready: true },
    ],
  },
  {
    title: "Próximamente",
    items: [
      { href: "#", label: "Radar", ready: false },
      { href: "#", label: "Proyectos y permisos", ready: false },
      { href: "#", label: "Oportunidades", ready: false },
    ],
  },
];

async function UserMenu() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = String(data?.claims?.email ?? "");
  return (
    <form action={signOut} className="flex items-center gap-3 text-sm">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold uppercase text-on-primary"
      >
        {email.slice(0, 2) || "?"}
      </span>
      <span className="hidden text-muted sm:inline">{email}</span>
      <button className="btn-ghost">Cerrar sesión</button>
    </form>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:p-2">Saltar al contenido</a>
      <nav
        aria-label="Principal"
        className="border-b border-divider bg-bg-subtle p-4 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r"
      >
        <div className="mb-6 flex items-center gap-3 px-1">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-on-primary"
          >
            AV
          </span>
          <p className="text-sm font-semibold leading-tight">
            AviTech
            <span className="block text-xs font-normal text-muted">Investment Intelligence</span>
          </p>
        </div>
        <Suspense fallback={<NavList groups={GROUPS} pathname="" />}>
          <NavLinks groups={GROUPS} />
        </Suspense>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-divider bg-bg px-4 py-3 md:px-8">
          <p className="text-xs text-muted">República Dominicana · datos con trazabilidad de fuente</p>
          <Suspense fallback={<span className="text-sm text-muted">…</span>}>
            <UserMenu />
          </Suspense>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
