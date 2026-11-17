import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { TopNav, TopNavList, type NavItem } from "@/components/nav-links";
import { getCurrentRole } from "@/lib/auth";
import { trendingKeywords } from "@/lib/radar";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: "home" },
  { href: "/noticias", label: "Noticias", icon: "news" },
  { href: "/radar", label: "Radar", icon: "radar" },
  { href: "/alertas", label: "Alertas", icon: "bell" },
  { href: "/licitaciones", label: "Licitaciones", icon: "doc" },
  { href: "/instrumentos", label: "Instrumentos", icon: "chart" },
  { href: "/watchlist", label: "Mi lista", icon: "star" },
];

const MORE: NavItem[] = [
  { href: "/proyectos", label: "Proyectos y permisos", icon: "map" },
  { href: "/oportunidades", label: "Oportunidades", icon: "spark" },
  { href: "/revision", label: "Revisión", icon: "check" },
  { href: "/admin/ingesta", label: "Carga de datos", icon: "upload" },
];

const ROLE_LABEL: Record<string, string> = {
  viewer: "Lector",
  analyst: "Analista",
  opportunity_manager: "Gestor de oportunidades",
  org_admin: "Administrador de organización",
  platform_admin: "Administrador de plataforma",
};

async function UserMenu() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = String(data?.claims?.email ?? "");
  return (
    <form action={signOut} className="flex items-center gap-2 border-l border-divider pl-3 text-xs">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold uppercase text-on-primary"
      >
        {email.slice(0, 2) || "?"}
      </span>
      <button className="text-muted hover:text-text hover:underline">Salir</button>
    </form>
  );
}

/** Tarjeta de perfil (columna izquierda). */
async function ProfileCard() {
  await connection();
  const supabase = await createClient();
  const [{ data: claims }, role] = await Promise.all([supabase.auth.getClaims(), getCurrentRole()]);
  const email = String(claims?.claims?.email ?? "");
  return (
    <section aria-label="Tu perfil" className="card overflow-hidden p-0">
      <div className="h-14 bg-gradient-to-r from-primary to-[#378fe9]" />
      <div className="-mt-7 px-4 pb-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-surface bg-primary text-lg font-semibold uppercase text-on-primary">
          {email.slice(0, 2) || "?"}
        </span>
        <p className="mt-2 truncate text-sm font-semibold">{email || "Usuario"}</p>
        <p className="text-xs text-muted">{ROLE_LABEL[role ?? ""] ?? "Sin rol asignado"}</p>
      </div>
      <ul className="divide-y divide-divider border-t border-divider text-sm">
        <li><Link href="/alertas" className="block px-4 py-2 hover:bg-surface-2">Mis alertas</Link></li>
        <li><Link href="/watchlist" className="block px-4 py-2 hover:bg-surface-2">Mi lista</Link></li>
      </ul>
    </section>
  );
}

/** Columna derecha: temas en alza, como «Noticias de actualidad». */
async function TrendsCard() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_items")
    .select("published_at,matched_keywords")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(300);
  const trends = trendingKeywords(
    (data ?? []).map((n) => ({ published_at: n.published_at, matched_keywords: (n.matched_keywords ?? []) as string[] })),
    new Date(),
  ).slice(0, 6);
  return (
    <section aria-labelledby="tendencias" className="card">
      <h2 id="tendencias" className="text-base font-semibold">Temas en alza</h2>
      {trends.length ? (
        <ul className="mt-2 space-y-2">
          {trends.map((t) => (
            <li key={t.keyword} className="text-sm">
              <Link href={`/noticias?q=${encodeURIComponent(t.keyword)}`} className="font-semibold hover:text-primary hover:underline">
                {t.keyword}
              </Link>
              <p className="text-xs text-muted">{t.recent} en 7 días{t.delta > 0 ? ` · +${t.delta} vs. semana previa` : ""}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">Aún no hay suficientes noticias.</p>
      )}
      <Link href="/radar" className="mt-3 block text-xs font-semibold text-muted hover:text-primary">Ver radar completo →</Link>
    </section>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:p-2">Saltar al contenido</a>
      <header className="sticky top-0 z-30 border-b border-divider bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 md:px-4">
          <Link href="/dashboard" aria-label="AviTech, inicio" className="flex shrink-0 items-center gap-2 py-2">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded bg-primary text-base font-bold text-on-primary"
            >
              AV
            </span>
            <span className="hidden text-sm font-semibold leading-tight lg:block">
              AviTech
              <span className="block text-[11px] font-normal text-muted">Investment Intelligence</span>
            </span>
          </Link>
          <form action="/noticias" method="get" role="search" className="hidden md:block">
            <label htmlFor="busqueda" className="sr-only">Buscar en noticias</label>
            <input
              id="busqueda"
              name="q"
              placeholder="Buscar en noticias"
              className="w-56 rounded-md bg-surface-2 px-3 py-1.5 text-sm placeholder:text-muted"
            />
          </form>
          <nav aria-label="Principal" className="ml-auto min-w-0">
            <Suspense fallback={<TopNavList primary={PRIMARY} more={MORE} pathname="" />}>
              <TopNav primary={PRIMARY} more={MORE} />
            </Suspense>
          </nav>
          <Suspense fallback={<span className="text-sm text-muted">…</span>}>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-3 py-6 md:px-4 lg:grid-cols-[225px_minmax(0,1fr)] xl:grid-cols-[225px_minmax(0,1fr)_300px]">
        <aside className="hidden space-y-3 lg:block">
          <Suspense fallback={<div className="card h-40" />}>
            <ProfileCard />
          </Suspense>
        </aside>
        <main id="contenido" className="min-w-0">{children}</main>
        <aside className="hidden space-y-3 xl:block">
          <Suspense fallback={<div className="card h-40" />}>
            <TrendsCard />
          </Suspense>
          <p className="px-2 text-center text-xs text-muted">
            Señales de fuentes públicas. No constituye asesoría de inversión.
          </p>
        </aside>
      </div>
    </div>
  );
}
