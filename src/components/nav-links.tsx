"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  ready: boolean;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}

export function NavLinks({ groups }: { groups: NavGroup[] }) {
  return <NavList groups={groups} pathname={usePathname()} />;
}

export function NavList({ groups, pathname }: { groups: NavGroup[]; pathname: string }) {
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted">{g.title}</p>
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {g.items.map((n) => {
              const active = n.ready && (pathname === n.href || pathname.startsWith(`${n.href}/`));
              return (
                <li key={n.label}>
                  {n.ready ? (
                    <Link
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                        active ? "bg-primary font-medium text-on-primary" : "hover:bg-surface-2"
                      }`}
                    >
                      {n.label}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2 px-3 py-2 text-sm text-muted">
                      {n.label}
                      <span className="rounded-full border border-divider px-1.5 text-[10px]">pronto</span>
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
