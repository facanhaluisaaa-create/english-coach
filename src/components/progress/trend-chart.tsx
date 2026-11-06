"use client";

import { useId, useMemo, useState } from "react";

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  value: number; // 0–100
  label?: string;
}

/**
 * Single-series line chart (so no legend): 2px line, >=8px end marker, hairline
 * gridlines, crosshair tooltip on hover. One hue, defined as a CSS role.
 */
export function TrendChart({ points, height = 140, unit = "%", max = 100 }: { points: TrendPoint[]; height?: number; unit?: string; max?: number }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const width = 600;
  const pad = { l: 34, r: 14, t: 10, b: 24 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;

  const data = useMemo(() => points.slice().sort((a, b) => a.date.localeCompare(b.date)), [points]);
  if (data.length === 0) {
    return <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">No data yet</div>;
  }
  const x = (i: number) => pad.l + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v: number) => pad.t + h - (Math.max(0, Math.min(max, v)) / max) * h;
  const path = data.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${path} L${x(data.length - 1).toFixed(1)},${(pad.t + h).toFixed(1)} L${x(0).toFixed(1)},${(pad.t + h).toFixed(1)} Z`;
  const ticks = [0, 50, 100].map((t) => (t / 100) * max);
  const hp = hover != null ? data[hover] : null;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    let dist = Infinity;
    data.forEach((_, i) => {
      const d = Math.abs(x(i) - px);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setHover(best);
  }

  return (
    <div className="viz-root relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-labelledby={`${id}-title`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <title id={`${id}-title`}>Score trend</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={1} />
            <text x={pad.l - 6} y={y(t) + 3} fontSize={10} textAnchor="end" fill="var(--viz-text-secondary)">{Math.round(t)}</text>
          </g>
        ))}
        <path d={area} fill="var(--viz-series-1)" opacity={0.1} />
        <path d={path} fill="none" stroke="var(--viz-series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(data.length - 1)} cy={y(data[data.length - 1].value)} r={4} fill="var(--viz-series-1)" />
        {hp && hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + h} stroke="var(--viz-text-secondary)" strokeWidth={1} opacity={0.5} />
            <circle cx={x(hover)} cy={y(hp.value)} r={5} fill="var(--viz-series-1)" stroke="var(--viz-surface)" strokeWidth={2} />
          </g>
        )}
        <text x={pad.l} y={height - 6} fontSize={10} fill="var(--viz-text-secondary)">{data[0].date}</text>
        {data.length > 1 && (
          <text x={width - pad.r} y={height - 6} fontSize={10} textAnchor="end" fill="var(--viz-text-secondary)">{data[data.length - 1].date}</text>
        )}
      </svg>
      {hp && hover != null && (
        <div
          className="pointer-events-none absolute -top-1 rounded-md border bg-popover px-2 py-1 text-xs shadow-sm"
          style={{ left: `${(x(hover) / width) * 100}%`, transform: "translateX(-50%)" }}
        >
          <span className="font-medium tabular-nums">{Math.round(hp.value)}{unit}</span>
          <span className="text-muted-foreground"> · {hp.label ?? hp.date}</span>
        </div>
      )}
      <style>{`
        .viz-root { --viz-series-1: #2a78d6; --viz-grid: color-mix(in oklch, var(--border), transparent 20%); --viz-text-secondary: var(--muted-foreground); --viz-surface: var(--card); }
        .dark .viz-root { --viz-series-1: #3987e5; }
      `}</style>
    </div>
  );
}

export function Sparkline({ values, width = 96, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <span className="text-xs text-muted-foreground">—</span>;
  const max = 100;
  const x = (i: number) => (i / (values.length - 1)) * (width - 4) + 2;
  const y = (v: number) => height - 2 - (Math.max(0, Math.min(max, v)) / max) * (height - 4);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="viz-root">
      <path d={d} fill="none" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeLinejoin="round" opacity={0.6} />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={2.5} fill="#2a78d6" />
    </svg>
  );
}
