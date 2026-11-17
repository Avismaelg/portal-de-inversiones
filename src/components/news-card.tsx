import Link from "next/link";
import { leadMinutes } from "@/lib/ingest/news";
import { initials, timeAgo } from "@/lib/news-format";
import { priorityLabel, type Priority } from "@/lib/priority";

export interface NewsCardItem {
  id: string;
  source_name: string;
  title: string;
  excerpt: string | null;
  url: string;
  published_at: string | null;
  media_url: string | null;
  media_source: string | null;
  media_published_at: string | null;
}

const PRIORITY_STYLE = {
  Alta: "bg-success/15 text-success",
  Media: "bg-warning/15 text-warning",
  Baja: "bg-surface-2 text-muted",
} as const;

const fmtLead = (min: number) => {
  const a = Math.abs(min);
  return a >= 1440 ? `${Math.round(a / 1440)} día(s)` : a >= 60 ? `${Math.floor(a / 60)} h ${a % 60} min` : `${a} min`;
};

/** Noticia como publicación: fuente y tiempo, titular, extracto, motivos de prioridad y acciones. */
export function NewsCard({
  n,
  pr,
  now,
  analyzed,
  children,
}: {
  n: NewsCardItem;
  pr: Priority;
  now: Date;
  analyzed: boolean;
  children?: React.ReactNode;
}) {
  const label = priorityLabel(pr.score);
  const lead = n.published_at && n.media_published_at ? leadMinutes(n.published_at, n.media_published_at) : null;
  return (
    <article className="card">
      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface-2 text-sm font-bold text-primary"
        >
          {initials(n.source_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{n.source_name}</p>
          <p className="text-xs text-muted">
            {timeAgo(n.published_at, now)} · fuente primaria
          </p>
        </div>
        <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[label]}`}>
          Prioridad {label}
        </span>
      </header>

      <h2 className="headline mt-3 text-lg">
        <Link href={`/noticias/${n.id}`} className="hover:text-primary hover:underline">
          {n.title}
        </Link>
      </h2>
      {n.excerpt && <p className="mt-1 line-clamp-3 text-sm text-muted">{n.excerpt}</p>}

      <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {n.media_url && lead !== null ? (
          <li className={`rounded-full px-2 py-0.5 ${lead > 0 ? "bg-primary/10 font-medium text-primary" : "border border-divider text-muted"}`}>
            {lead > 0 ? `Salió ${fmtLead(lead)} antes que ${n.media_source}` : `Ya en prensa: ${n.media_source}`}
          </li>
        ) : null}
        {pr.reasons.map((r) => (
          <li key={r} className="rounded-full border border-divider bg-bg px-2 py-0.5 text-muted">
            {r}
          </li>
        ))}
      </ul>

      {children}

      <footer className="mt-3 flex flex-wrap items-center gap-2 border-t border-divider pt-3">
        <Link href={`/noticias/${n.id}`} className="btn">
          {analyzed ? "Ver análisis de impacto" : "Ampliar información"}
        </Link>
        <a href={n.url} target="_blank" rel="noopener noreferrer" className="btn-ghost">
          Ver en la fuente ↗
        </a>
      </footer>
    </article>
  );
}
