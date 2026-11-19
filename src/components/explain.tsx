import type { Explanation } from "@/lib/glossary";

/** «¿Qué significa?» plegable: educación para principiantes sin estorbar a quien ya sabe. */
export function Explain({ items, label = "¿Qué significa?" }: { items: Explanation[]; label?: string }) {
  if (!items.length) return null;
  return (
    <details className="mb-2 text-sm">
      <summary className="cursor-pointer font-semibold text-primary">{label}</summary>
      <dl className="mt-2 space-y-3 rounded border border-divider bg-surface p-3">
        {items.map((e) => (
          <div key={e.title}>
            <dt className="font-semibold">{e.title}</dt>
            <dd className="mt-0.5">{e.what}</dd>
            <dd className="mt-0.5 text-muted"><span className="font-medium text-text">Por qué importa: </span>{e.why}</dd>
            {e.read && <dd className="mt-0.5 text-muted"><span className="font-medium text-text">Cómo leerlo: </span>{e.read}</dd>}
            {e.source && <dd className="mt-0.5 text-xs text-muted">{e.source}</dd>}
          </div>
        ))}
        <p className="text-xs text-muted">Explicación general con fines educativos; no es una recomendación de inversión.</p>
      </dl>
    </details>
  );
}
