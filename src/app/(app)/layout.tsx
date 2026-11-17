import { Suspense } from "react";
import { NavLinks, NavList, type NavGroup } from "@/components/nav-links";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

const GROUPS: NavGroup[] = [
  {
    title: "Inteligencia",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "home", ready: true },
      { href: "/instrumentos", label: "Instrumentos", icon: "chart", ready: true },
      { href: "/licitaciones", label: "Licitaciones", icon: "doc", ready: true },
      { href: "/noticias", label: "Noticias", icon: "news", ready: true },
      { href: "/alertas", label: "Alertas", icon: "bell", ready: true },
      { href: "/watchlist", label: "Mi lista", icon: "star", ready: true },
    ],
  },
  {
    title: "Gestión",
    items: [
      { href: "/revision", label: "Revisión", icon: "check", ready: true },
      { href: "/admin/ingesta", label: "Carga de datos", icon: "upload", ready: true },
    ],
  },
  {
    title: "Análisis",
    items: [
      { href: "/radar", label: "Radar", icon: "radar", ready: true },
      { href: "/proyectos", label: "Proyectos y permisos", icon: "map", ready: true },
      { href: "/oportunidades", label: "Oportunidades", icon: "spark", ready: true },
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
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#0b3b52] text-sm font-bold text-white shadow-sm"
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
          <p className="text-xs text-muted">Información pública poco difundida · República Dominicana</p>
          <Suspense fallback={<span className="text-sm text-muted">…</span>}>
            <UserMenu />
          </Suspense>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
