"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  /** false = sección prevista sin pantalla todavía: se muestra deshabilitada, sin enlace. */
  ready?: boolean;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
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
  building: "M4 21V5l8-2v18M12 7l8 3v11M8 8v.01M8 12v.01M8 16v.01M16 13v.01M16 17v.01M2 21h20",
  permit: "M9 12l2 2 4-4M7 3h10l2 3v15H5V6z",
  report: "M5 3h14v18H5zM9 8h6M9 12h6M9 16h3",
  gear: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2V21a2 2 0 11-4 0v-.1A1.7 1.7 0 007 19.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 003 14H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 7l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 0010 3V3a2 2 0 114 0v.1a1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1A1.7 1.7 0 0021 10h.1a2 2 0 110 4h-.1a1.7 1.7 0 00-1.6 1z",
  pin: "M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z",
} as const;

export function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

const isActive = (pathname: string, href: string) =>
  href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export function SideNav({ groups }: { groups: NavGroup[] }) {
  return <SideNavList groups={groups} pathname={usePathname()} />;
}

/** Barra lateral Investment Hub: azul marino, activo con acento turquesa. */
export function SideNavList({ groups, pathname }: { groups: NavGroup[]; pathname: string }) {
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-navy-muted">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map((n) => {
              if (n.ready === false) {
                return (
                  <li key={n.label}>
                    <span className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-navy-muted/70" aria-disabled="true">
                      <Icon name={n.icon} />
                      {n.label}
                      <span className="ml-auto rounded border border-navy-muted/40 px-1.5 text-[10px]">pronto</span>
                    </span>
                  </li>
                );
              }
              const active = isActive(pathname, n.href);
              return (
                <li key={n.label}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-sm transition-colors ${
                      active
                        ? "border-[#5eead4] bg-navy-2 font-semibold text-on-navy"
                        : "border-transparent text-navy-muted hover:bg-navy-2/60 hover:text-on-navy"
                    }`}
                  >
                    <Icon name={n.icon} />
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
