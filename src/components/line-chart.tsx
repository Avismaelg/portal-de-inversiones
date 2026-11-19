"use client";

import { useId, useMemo, useState } from "react";

/**
 * Gráfico de línea de una sola serie (sin leyenda: el título la nombra). Marcas según la guía de
 * visualización: línea de 2 px, área al 10 %, punto final con anillo, rejilla de 1 px, cruz con
 * tooltip al pasar el puntero o al moverse con las flechas del teclado. La tabla con los mismos
 * datos va aparte en la página.
 */
export interface LinePoint {
  /** Etiqueta del eje X (p. ej. fecha ya formateada). */
  label: string;
  value: number;
}

const SERIES = "#2a78d6"; // categórica 1 de la paleta de referencia (validada para fondo claro)
const W = 640;
const H = 220;
const M = { top: 16, right: 64, bottom: 28, left: 56 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

export function LineChart({
  points,
  title,
  decimals = 2,
  description,
}: {
  points: LinePoint[];
  title: string;
  /** Decimales para ejes y tooltip (los props deben ser serializables desde un componente de servidor). */
  decimals?: number;
  description?: string;
}) {
  const id = useId();
  const format = (v: number) => new Intl.NumberFormat("es-DO", { maximumFractionDigits: decimals }).format(v);
  const [active, setActive] = useState<number | null>(null);
  const geo = useMemo(() => {
    const vals = points.map((p) => p.value);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.01 || 1;
    const ticks = niceTicks(lo - pad, hi + pad);
    const yMin = Math.min(ticks[0], lo);
    const yMax = Math.max(ticks[ticks.length - 1], hi);
    const iw = W - M.left - M.right;
    const ih = H - M.top - M.bottom;
    const x = (i: number) => M.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
    const y = (v: number) => M.top + ih - ((v - yMin) / (yMax - yMin || 1)) * ih;
    const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
    const area = `${line} L${x(points.length - 1).toFixed(1)},${M.top + ih} L${x(0).toFixed(1)},${M.top + ih} Z`;
    return { x, y, line, area, ticks: ticks.filter((t) => t >= yMin && t <= yMax), ih };
  }, [points]);

  if (points.length < 2) return null;
  const last = points.length - 1;
  const xTicks = [...new Set([0, Math.round(last / 2), last])];
  const a = active ?? null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(geo.x(i) - px) < Math.abs(geo.x(best) - px)) best = i;
    setActive(best);
  };
  const onKey = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setActive((cur) => {
        const c = cur ?? last;
        return Math.min(last, Math.max(0, c + (e.key === "ArrowRight" ? 1 : -1)));
      });
    } else if (e.key === "Escape") setActive(null);
  };

  return (
    <figure className="m-0">
      <figcaption className="mb-1 text-sm font-semibold text-text">{title}</figcaption>
      {description && <p className="mb-2 text-xs text-muted">{description}</p>}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-primary"
          role="img"
          aria-labelledby={`${id}-t`}
          aria-describedby={`${id}-d`}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
        >
          <title id={`${id}-t`}>{title}</title>
          <desc id={`${id}-d`}>
            {`De ${format(points[0].value)} (${points[0].label}) a ${format(points[last].value)} (${points[last].label}). Usa las flechas para recorrer los valores.`}
          </desc>
          {geo.ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={geo.y(t)} y2={geo.y(t)} stroke="var(--color-divider)" strokeWidth={1} />
              <text x={M.left - 8} y={geo.y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--color-text-muted)">
                {format(t)}
              </text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text key={i} x={geo.x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"} fontSize={11} fill="var(--color-text-muted)">
              {points[i].label}
            </text>
          ))}
          <path d={geo.area} fill={SERIES} fillOpacity={0.1} />
          <path d={geo.line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={geo.x(last)} cy={geo.y(points[last].value)} r={4} fill={SERIES} stroke="var(--color-surface)" strokeWidth={2} />
          <text x={geo.x(last) + 8} y={geo.y(points[last].value)} dominantBaseline="middle" fontSize={12} fontWeight={600} fill="var(--color-text)">
            {format(points[last].value)}
          </text>
          {a !== null && (
            <g pointerEvents="none">
              <line x1={geo.x(a)} x2={geo.x(a)} y1={M.top} y2={M.top + geo.ih} stroke="var(--color-text-muted)" strokeWidth={1} />
              <circle cx={geo.x(a)} cy={geo.y(points[a].value)} r={5} fill={SERIES} stroke="var(--color-surface)" strokeWidth={2} />
            </g>
          )}
        </svg>
        {a !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-1 rounded border border-divider bg-surface px-2 py-1 text-xs shadow-sm"
            style={{ left: `${Math.min(80, Math.max(0, (geo.x(a) / W) * 100 - 10))}%` }}
          >
            <span className="block font-semibold text-text">{format(points[a].value)}</span>
            <span className="text-muted">{points[a].label}</span>
          </div>
        )}
      </div>
    </figure>
  );
}
