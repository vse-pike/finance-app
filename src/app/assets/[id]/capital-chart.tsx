'use client';

import Decimal from 'decimal.js';
import type { AssetApi, OperationApi, RevaluationApi } from '@/app/_lib/api';
import { Card } from '@/app/_ui/kit';

const INVESTMENT_TYPES = new Set(['down_payment', 'principal_payment']);
const COLOR_INVESTED = '#2563eb';
const COLOR_REFERENCE = '#d97706';
const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 16, right: 16, bottom: 32, left: 72 };

interface SeriesPoint {
  t: number;
  v: number;
}

function compact(value: number): string {
  return new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

function shortDate(t: number): string {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${String(d.getUTCFullYear()).slice(2)}`;
}

function investedPoints(operations: OperationApi[], nowMs: number): SeriesPoint[] {
  const sorted = [...operations].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  const points: SeriesPoint[] = [];
  let total = new Decimal(0);
  for (const op of sorted) {
    if (INVESTMENT_TYPES.has(op.type) && op.valueNative !== null) {
      total = total.plus(op.valueNative);
    }
    points.push({ t: Date.parse(op.ts), v: total.toNumber() });
  }
  if (points.length === 0 || points[points.length - 1].t < nowMs) {
    points.push({ t: nowMs, v: total.toNumber() });
  }
  return points;
}

function referencePoints(
  operations: OperationApi[],
  revaluations: RevaluationApi[],
  nowMs: number,
): SeriesPoint[] {
  const refs = revaluations
    .filter((r) => r.kind === 'market')
    .sort((a, b) => (a.onDate < b.onDate ? -1 : 1));
  if (refs.length === 0) return [];
  const sortedOps = [...operations].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  const times = new Set<number>();
  for (const r of refs) times.add(Date.parse(`${r.onDate}T12:00:00Z`));
  for (const op of sortedOps) times.add(Date.parse(op.ts));
  times.add(nowMs);
  const sortedTimes = [...times].sort((a, b) => a - b);
  const points: SeriesPoint[] = [];
  let qty = new Decimal(0);
  let opIndex = 0;
  let refIndex = -1;
  for (const t of sortedTimes) {
    while (opIndex < sortedOps.length && Date.parse(sortedOps[opIndex].ts) <= t) {
      qty = qty.plus(sortedOps[opIndex].qtyDelta);
      opIndex += 1;
    }
    while (
      refIndex + 1 < refs.length &&
      Date.parse(`${refs[refIndex + 1].onDate}T12:00:00Z`) <= t
    ) {
      refIndex += 1;
    }
    if (refIndex >= 0) {
      points.push({ t, v: qty.mul(refs[refIndex].priceNative).toNumber() });
    }
  }
  return points;
}

function stepPath(
  points: SeriesPoint[],
  x: (t: number) => number,
  y: (v: number) => number,
): string {
  if (points.length === 0) return '';
  let d = `M ${x(points[0].t)} ${y(points[0].v)}`;
  for (let i = 1; i < points.length; i += 1) {
    d += ` H ${x(points[i].t)} V ${y(points[i].v)}`;
  }
  return d;
}

interface CapitalChartProps {
  asset: AssetApi;
  operations: OperationApi[];
  revaluations: RevaluationApi[];
}

export function CapitalChart({ asset, operations, revaluations }: CapitalChartProps) {
  const nowMs = Date.now();
  const invested = investedPoints(operations, nowMs);
  const reference = referencePoints(operations, revaluations, nowMs);
  const hasData = invested.length > 1 || reference.length > 1;

  if (!hasData) {
    return (
      <Card className="p-8 text-center text-sm text-neutral-500">
        График появится, когда будут операции или переоценки.
      </Card>
    );
  }

  let xMin = nowMs;
  for (const p of [...invested, ...reference]) {
    if (p.t < xMin) xMin = p.t;
  }
  const allValues = [...invested, ...reference].map((p) => p.v);
  const yMaxRaw = Math.max(...allValues, 0);
  const yMax = yMaxRaw <= 0 ? 1 : yMaxRaw * 1.05;
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - xMin) / Math.max(nowMs - xMin, 1)) * plotWidth;
  const y = (v: number) => PAD.top + plotHeight - (v / yMax) * plotHeight;
  const gridValues = [0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax];
  const ticks = [xMin, (xMin + nowMs) / 2, nowMs];

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-4 border-b border-neutral-100 px-4 py-3">
        <h2 className="text-base font-semibold text-neutral-900">Рост капитала</h2>
        <span className="text-xs text-neutral-400">{asset.quoteCurrency}</span>
        <div className="flex items-center gap-4 text-xs text-neutral-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5" style={{ background: COLOR_INVESTED }} />
            Вложено
          </span>
          {reference.length > 0 ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-5" style={{ background: COLOR_REFERENCE }} />
              Рынок (справочно)
            </span>
          ) : null}
        </div>
      </div>
      <div className="p-4">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label="Рост капитала по времени"
        >
          {gridValues.map((gv) => (
            <g key={gv}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(gv)}
                y2={y(gv)}
                stroke="#f0f0f0"
                strokeWidth="1"
              />
              <text x={PAD.left - 8} y={y(gv) + 3} textAnchor="end" fontSize="10" fill="#737373">
                {compact(gv)}
              </text>
            </g>
          ))}
          {ticks.map((t) => (
            <text
              key={t}
              x={x(t)}
              y={HEIGHT - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#737373"
            >
              {shortDate(t)}
            </text>
          ))}
          {reference.length > 0 ? (
            <path
              d={stepPath(reference, x, y)}
              fill="none"
              stroke={COLOR_REFERENCE}
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          ) : null}
          <path d={stepPath(invested, x, y)} fill="none" stroke={COLOR_INVESTED} strokeWidth="2" />
        </svg>
      </div>
    </Card>
  );
}
