"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

/** Iconos de trazo (24x24), decorativos. */
const ICONS = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  chart: "M4 20V10m6 10V4m6 16v-8m4 8H2",
  doc: "M7 3h8l4 4v14H7zM15 3v4h4M10 13h6M10 17h6",
  news: "M4 5h13v14H6a2 2 0 01-2-2zM17 9h3v8a2 2 0 01-2 2M8 9h5M8 13h5",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  check: "M5 12l4 4 10-10M3 3h18v18H3z",
  upload: "M12 16V4m0 0l-4 4m4-4l4 4M4 16v4h16v-4",
  radar: "M12 12l6-6M12 3a9 9 0 109 9M12 7a5 5 0 105 5",
  map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14m6-12v14",
  bell: "M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4",
  spark: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18",
} as const;

export function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function TopNav({ primary, more }: { primary: NavItem[]; more: NavItem[] }) {
  return <TopNavList primary={primary} more={more} pathname={usePathname()} />;
}

/** Barra de navegación horizontal: icono sobre etiqueta, subrayado en la página activa (estilo red profesional). */
export function TopNavList({ primary, more, pathname }: { primary: NavItem[]; more: NavItem[]; pathname: string }) {
  const item = (n: NavItem) => {
    const active = isActive(pathname, n.href);
    return (
      <li key={n.href}>
        <Link
          href={n.href}
          aria-current={active ? "page" : undefined}
          className={`flex min-w-16 flex-col items-center gap-0.5 border-b-2 px-2 py-1.5 text-xs transition-colors ${
            active ? "border-text text-text" : "border-transparent text-muted hover:text-text"
          }`}
        >
          <Icon name={n.icon} />
          {n.label}
        </Link>
      </li>
    );
  };
  const moreActive = more.some((m) => isActive(pathname, m.href));
  return (
    <ul className="flex items-stretch gap-0.5 overflow-x-auto">
      {primary.map(item)}
      <li className="relative">
        <details className="group">
          <summary
            className={`flex min-w-16 cursor-pointer list-none flex-col items-center gap-0.5 border-b-2 px-2 py-1.5 text-xs marker:hidden ${
              moreActive ? "border-text text-text" : "border-transparent text-muted hover:text-text"
            }`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <circle cx="6" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="18" cy="12" r="1.8" />
            </svg>
            Más
          </summary>
          <ul className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-divider bg-surface p-1 shadow-lg">
            {more.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-surface-2 ${isActive(pathname, n.href) ? "font-semibold text-primary" : ""}`}
                >
                  <Icon name={n.icon} />
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      </li>
    </ul>
  );
}
