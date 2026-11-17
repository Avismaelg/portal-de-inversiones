"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  ready: boolean;
  icon: keyof typeof ICONS;
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
  spark: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18",
} as const;

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

export function NavLinks({ groups }: { groups: NavGroup[] }) {
  return <NavList groups={groups} pathname={usePathname()} />;
}

export function NavList({ groups, pathname }: { groups: NavGroup[]; pathname: string }) {
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted">{g.title}</p>
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {g.items.map((n) => {
              const active = n.ready && (pathname === n.href || pathname.startsWith(`${n.href}/`));
              return (
                <li key={n.label}>
                  {n.ready ? (
                    <Link
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                        active ? "bg-primary/10 font-semibold text-primary" : "text-text hover:bg-surface-2"
                      }`}
                    >
                      <Icon name={n.icon} />
                      {n.label}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-3 px-3 py-2 text-sm text-muted">
                      <Icon name={n.icon} />
                      {n.label}
                      <span className="ml-auto rounded-full border border-divider px-1.5 text-[10px]">pronto</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
