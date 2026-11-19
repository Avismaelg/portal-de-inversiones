import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Icon, SideNav, SideNavList, type NavGroup } from "@/components/nav-links";
import { getCurrentRole } from "@/lib/auth";
import { timeAgo } from "@/lib/news-format";
import { trendingKeywords } from "@/lib/radar";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

/** Secciones de Investment Hub. Las que aún no tienen pantalla se muestran deshabilitadas («pronto»). */
const GROUPS: NavGroup[] = [
  {
    title: "Inteligencia",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "home" },
      { href: "/radar", label: "Radar", icon: "radar" },
      { href: "/noticias", label: "Noticias", icon: "news" },
      { href: "/proyectos", label: "Proyectos", icon: "map" },
      { href: "/permisos", label: "Permisos", icon: "permit", ready: false },
      { href: "/licitaciones", label: "Licitaciones", icon: "doc" },
      { href: "/instrumentos", label: "Finanzas", icon: "chart" },
      { href: "/macro", label: "Macro BCRD", icon: "chart" },
      { href: "/oportunidades", label: "Oportunidades", icon: "spark" },
      { href: "/empresas", label: "Empresas", icon: "building", ready: false },
      { href: "/mapa", label: "Mapa", icon: "pin", ready: false },
    ],
  },
  {
    title: "Seguimiento",
    items: [
      { href: "/watchlist", label: "Watchlist", icon: "star" },
      { href: "/alertas", label: "Alertas", icon: "bell" },
      { href: "/reportes", label: "Reportes", icon: "report", ready: false },
    ],
  },
  {
    title: "Administración",
    items: [
      { href: "/revision", label: "Revisión", icon: "check" },
      { href: "/admin/ingesta", label: "Carga de datos", icon: "upload" },
      { href: "/admin/operaciones", label: "Operaciones", icon: "chart" },
      { href: "/configuracion", label: "Configuración", icon: "gear", ready: false },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  viewer: "Lector",
  analyst: "Analista",
  opportunity_manager: "Gestor de oportunidades",
  org_admin: "Admin. de organización",
  platform_admin: "Admin. de plataforma",
};

function Brand() {
  return (
    <Link href="/dashboard" aria-label="AviTech, ir al dashboard" className="flex items-center gap-2.5 px-3">
      <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-md bg-[#5eead4] text-sm font-bold text-navy">
        AV
      </span>
      <span className="text-sm font-semibold leading-tight text-on-navy">
        AviTech
        <span className="block text-[11px] font-normal text-navy-muted">Investment Hub</span>
      </span>
    </Link>
  );
}

/** Cuándo entró el último dato (noticia detectada o licitación extraída). */
async function DataFreshness() {
  await connection();
  const supabase = await createClient();
  // updated_at no sirve: cambia con revisiones y migraciones. Solo cuentan detección y extracción reales.
  const [n, t, c] = await Promise.all([
    supabase.from("news_items").select("detected_at").order("detected_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("public_tenders").select("extracted_at").not("extracted_at", "is", null).order("extracted_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("public_tenders").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const last = [n.data?.detected_at, t.data?.extracted_at, c.data?.created_at].filter(Boolean).sort().pop() ?? null;
  return (
    <span className="hidden items-center gap-1.5 text-xs text-muted md:flex" title="Último dato incorporado (carga manual asistida)">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-success" />
      Datos actualizados {last ? timeAgo(last, new Date()) : "sin cargas"}
    </span>
  );
}

/** Campana: notificaciones sin leer del usuario (RLS: solo las propias). */
async function AlertsBell() {
  await connection();
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("status", "delivered")
    .is("read_at", null);
  const n = count ?? 0;
  return (
    <Link
      href="/alertas"
      aria-label={n ? `Alertas: ${n} notificación(es) sin leer` : "Alertas"}
      className="relative rounded-md p-2 text-muted hover:bg-surface-2 hover:text-text"
    >
      <Icon name="bell" />
      {n > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-warning px-1 text-center text-[10px] font-bold leading-4 text-white">
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}

async function UserMenu() {
  await connection();
  const supabase = await createClient();
  const [{ data }, role] = await Promise.all([supabase.auth.getClaims(), getCurrentRole()]);
  const email = String(data?.claims?.email ?? "");
  return (
    <form action={signOut} className="flex items-center gap-2 border-l border-divider pl-3">
      <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-semibold uppercase text-on-navy">
        {email.slice(0, 2) || "?"}
      </span>
      <span className="hidden text-xs leading-tight lg:block">
        <span className="block max-w-40 truncate font-medium">{email}</span>
        <span className="text-muted">{ROLE_LABEL[role ?? ""] ?? "Sin rol"}</span>
      </span>
      <button className="ml-1 text-xs text-muted hover:text-text hover:underline">Salir</button>
    </form>
  );
}

/** Columna derecha: temas en alza. */
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
      <h2 id="tendencias" className="text-sm font-semibold">Temas en alza</h2>
      {trends.length ? (
        <ul className="mt-2 space-y-2">
          {trends.map((t) => (
            <li key={t.keyword} className="text-sm">
              <Link href={`/noticias?q=${encodeURIComponent(t.keyword)}`} className="font-medium hover:text-primary hover:underline">
                {t.keyword}
              </Link>
              <p className="text-xs text-muted">
                {t.recent} en 7 días
                {t.delta > 0 && <span className="font-semibold text-warning"> · +{t.delta} vs. semana previa</span>}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">Aún no hay suficientes noticias.</p>
      )}
      <Link href="/radar" className="mt-3 block text-xs font-semibold text-primary hover:underline">Ver radar completo →</Link>
    </section>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:p-2">Saltar al contenido</a>

      <aside className="hidden w-60 shrink-0 bg-navy py-4 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
        <Brand />
        <nav aria-label="Principal" className="mt-6 px-2">
          <Suspense fallback={<SideNavList groups={GROUPS} pathname="" />}>
            <SideNav groups={GROUPS} />
          </Suspense>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-divider bg-surface px-3 py-2 md:px-6">
          <details className="relative lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-semibold text-on-navy marker:hidden">
              Menú
            </summary>
            <div className="absolute left-0 z-40 mt-2 w-64 rounded-lg bg-navy p-3 shadow-xl">
              <nav aria-label="Principal (móvil)">
                <Suspense fallback={<SideNavList groups={GROUPS} pathname="" />}>
                  <SideNav groups={GROUPS} />
                </Suspense>
              </nav>
            </div>
          </details>
          <form action="/buscar" method="get" role="search" className="min-w-0 flex-1 md:max-w-md">
            <label htmlFor="busqueda" className="sr-only">Buscar en noticias, licitaciones, oportunidades y proyectos</label>
            <input
              id="busqueda"
              name="q"
              type="search"
              minLength={2}
              maxLength={100}
              placeholder="Buscar noticias, licitaciones, oportunidades…"
              className="w-full rounded-md border border-divider bg-bg px-3 py-1.5 text-sm placeholder:text-muted"
            />
          </form>
          <div className="ml-auto flex items-center gap-3">
            <Suspense fallback={null}>
              <DataFreshness />
            </Suspense>
            <Suspense fallback={<span className="p-2"><Icon name="bell" /></span>}>
              <AlertsBell />
            </Suspense>
            <Suspense fallback={<span className="text-sm text-muted">…</span>}>
              <UserMenu />
            </Suspense>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-7xl gap-6 px-3 py-6 md:px-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <main id="contenido" className="min-w-0">{children}</main>
          <aside className="hidden space-y-3 xl:block">
            <Suspense fallback={<div className="card h-40" />}>
              <TrendsCard />
            </Suspense>
            <p className="px-2 text-center text-xs text-muted">Señales de fuentes públicas. No constituye asesoría de inversión.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
