import { TRUST } from "@/lib/format";
import { TRUST_EXPLANATION } from "@/lib/glossary";

const STYLE: Record<string, string> = {
  confirmed: "border border-line bg-bg-subtle text-text",
  ai_analysis: "border-l-4 border-primary bg-bg-subtle text-primary",
  inference: "border border-dashed border-warning bg-bg-subtle text-warning",
};
const ICON: Record<string, string> = { confirmed: "✓", ai_analysis: "✦", inference: "↗" };

export function TrustBadge({ layer }: { layer: string }) {
  return (
    <span
      title={TRUST_EXPLANATION[layer]}
      className={`inline-flex cursor-help items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${STYLE[layer] ?? STYLE.confirmed}`}
    >
      <span aria-hidden="true">{ICON[layer] ?? "✓"}</span>
      {TRUST[layer] ?? layer}
      {TRUST_EXPLANATION[layer] && <span className="sr-only">: {TRUST_EXPLANATION[layer]}</span>}
    </span>
  );
}

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "warning" | "success" }) {
  const t = { neutral: "text-muted", warning: "text-warning", success: "text-success" }[tone];
  return <span className={`inline-flex rounded border border-line px-2 py-0.5 text-xs font-medium ${t}`}>{label}</span>;
}
