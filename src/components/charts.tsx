"use client";

import { useId, useMemo, useState } from "react";

/*
 * Chart palette. Categorical slots 1 and 2 of the reference palette, validated
 * against the white card surface: worst adjacent CVD ΔE 24.7 (protan),
 * normal-vision ΔE 33.6, both series >= 3:1 contrast.
 */
const SERIES_CUSTOMERS = "#2a78d6";
const SERIES_MEMBERS = "#eb6834";
const GRID = "#e1e0d9";
const AXIS = "#c3c2b7";
const MUTED = "#898781";
const SURFACE = "#ffffff";

export interface GrowthPoint {
  day: string;
  customers: number;
  members: number;
}

/** Rounds an axis maximum up to a clean 1/2/5 x 10^n value. */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return step * magnitude;
}

function shortDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const WIDTH = 760;
const HEIGHT = 280;
const PAD = { top: 16, right: 64, bottom: 30, left: 40 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

export function GrowthChart({ points }: { points: GrowthPoint[] }) {
  const clipId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const max = useMemo(
    () =>
      niceMax(
        Math.max(1, ...points.flatMap((point) => [point.customers, point.members])),
      ),
    [points],
  );

  if (points.length === 0) {
    return <p className="p-5 text-sm text-ink-muted">No registrations yet.</p>;
  }

  const x = (index: number) =>
    PAD.left +
    (points.length === 1 ? PLOT_W / 2 : (index / (points.length - 1)) * PLOT_W);
  const y = (value: number) => PAD.top + PLOT_H - (value / max) * PLOT_H;

  const path = (key: "customers" | "members") =>
    points
      .map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point[key])}`)
      .join(" ");

  const ticks = [0, max / 2, max];
  const last = points.length - 1;
  const active = hover ?? null;

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const svgX = ratio * WIDTH;
    const index = Math.round(((svgX - PAD.left) / PLOT_W) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, index)));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <Legend
          items={[
            { label: "Customers", color: SERIES_CUSTOMERS },
            { label: "Members", color: SERIES_MEMBERS },
          ]}
        />
        <button
          type="button"
          onClick={() => setShowTable((value) => !value)}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-gray-100 hover:text-ink no-print"
        >
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-72 overflow-y-auto px-5 py-4">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="py-2">Date</th>
                <th className="py-2 text-right">Customers</th>
                <th className="py-2 text-right">Members</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.day} className="border-t border-line">
                  <td className="py-1.5">{shortDay(point.day)}</td>
                  <td className="tabular py-1.5 text-right">{point.customers}</td>
                  <td className="tabular py-1.5 text-right">{point.members}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative px-2 pb-2">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-auto w-full"
            role="img"
            aria-label={`Daily registrations over the last ${points.length} days. Customers and members plotted separately.`}
            onPointerMove={handleMove}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <clipPath id={clipId}>
                <rect x={PAD.left} y={0} width={PLOT_W} height={HEIGHT} />
              </clipPath>
            </defs>

            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + PLOT_W}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={tick === 0 ? AXIS : GRID}
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={y(tick) + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill={MUTED}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {tick}
                </text>
              </g>
            ))}

            {[0, Math.floor(last / 2), last].map((index) => (
              <text
                key={index}
                x={x(index)}
                y={HEIGHT - 10}
                textAnchor={index === 0 ? "start" : index === last ? "end" : "middle"}
                fontSize={11}
                fill={MUTED}
              >
                {shortDay(points[index].day)}
              </text>
            ))}

            <g clipPath={`url(#${clipId})`}>
              <path
                d={path("members")}
                fill="none"
                stroke={SERIES_MEMBERS}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={path("customers")}
                fill="none"
                stroke={SERIES_CUSTOMERS}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {active !== null ? (
              <g>
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={PAD.top}
                  y2={PAD.top + PLOT_H}
                  stroke={AXIS}
                  strokeWidth={1}
                />
                <circle
                  cx={x(active)}
                  cy={y(points[active].members)}
                  r={4}
                  fill={SERIES_MEMBERS}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
                <circle
                  cx={x(active)}
                  cy={y(points[active].customers)}
                  r={4}
                  fill={SERIES_CUSTOMERS}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
              </g>
            ) : null}

            {/* End markers with direct labels — the only labelled points. */}
            <circle
              cx={x(last)}
              cy={y(points[last].members)}
              r={4}
              fill={SERIES_MEMBERS}
              stroke={SURFACE}
              strokeWidth={2}
            />
            <circle
              cx={x(last)}
              cy={y(points[last].customers)}
              r={4}
              fill={SERIES_CUSTOMERS}
              stroke={SURFACE}
              strokeWidth={2}
            />
            <text
              x={x(last) + 10}
              y={y(points[last].customers) + 4}
              fontSize={12}
              fontWeight={600}
              fill="#0b0b0b"
            >
              {points[last].customers}
            </text>
            <text
              x={x(last) + 10}
              y={y(points[last].members) + 4}
              fontSize={12}
              fontWeight={600}
              fill="#52514e"
            >
              {points[last].members}
            </text>
          </svg>

          {active !== null ? (
            <div
              className="pointer-events-none absolute top-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md"
              style={{
                left: `${(x(active) / WIDTH) * 100}%`,
                transform:
                  active > points.length / 2
                    ? "translateX(calc(-100% - 12px))"
                    : "translateX(12px)",
              }}
            >
              <p className="font-semibold text-ink">
                {shortDay(points[active].day)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-ink-muted">
                <span
                  className="size-2 rounded-full"
                  style={{ background: SERIES_CUSTOMERS }}
                />
                Customers
                <span className="tabular ml-auto pl-3 font-medium text-ink">
                  {points[active].customers}
                </span>
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-ink-muted">
                <span
                  className="size-2 rounded-full"
                  style={{ background: SERIES_MEMBERS }}
                />
                Members
                <span className="tabular ml-auto pl-3 font-medium text-ink">
                  {points[active].members}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-4">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span
            className="h-0.5 w-4 rounded-full"
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export interface TopMemberBar {
  member_code: string;
  name: string;
  customers: number;
  investors: number;
}

export function TopMembersChart({ members }: { members: TopMemberBar[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (members.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-ink-muted">
        No member has referred a customer yet.
      </p>
    );
  }

  const max = Math.max(...members.map((member) => member.customers));

  return (
    <div className="space-y-2 p-5">
      {members.map((member, index) => {
        const width = (member.customers / max) * 100;
        return (
          <div
            key={member.member_code}
            className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3"
            onPointerEnter={() => setHover(index)}
            onPointerLeave={() => setHover(null)}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{member.name}</p>
              <p className="tabular truncate text-xs text-ink-muted">
                {member.member_code}
              </p>
            </div>
            <div className="relative flex items-center gap-2">
              {/*
               * Sized in CSS rather than SVG: a stretched viewBox would distort
               * the 4px tip radius. Square at the baseline, rounded at the tip.
               */}
              <div
                className="flex-1"
                role="img"
                aria-label={`${member.name}: ${member.customers} customers`}
              >
                <div
                  className="h-4 rounded-r transition-opacity"
                  style={{
                    width: `${Math.max(width, 1.5)}%`,
                    background: SERIES_CUSTOMERS,
                    opacity: hover === null || hover === index ? 1 : 0.55,
                  }}
                />
              </div>
              <span className="tabular w-8 shrink-0 text-right text-sm font-semibold text-ink">
                {member.customers}
              </span>
              {hover === index ? (
                <div className="pointer-events-none absolute -top-1 left-0 z-10 -translate-y-full rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
                  <p className="font-semibold text-ink">{member.name}</p>
                  <p className="mt-0.5 text-ink-muted">
                    {member.customers} customer
                    {member.customers === 1 ? "" : "s"} · {member.investors}{" "}
                    investor{member.investors === 1 ? "" : "s"}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
