/**
 * Plot measurement conversions.
 *
 * Area is entered as width x length in feet — that is how a layout is actually
 * marked on the ground — and every other figure is derived from it, so square
 * feet, square metres and gaj can never disagree with the dimensions on the
 * record.
 */

/** 1 ft = 0.3048 m exactly, so 1 sq ft = 0.09290304 sq m. */
const SQFT_TO_SQM = 0.09290304;
/** 1 gaj (square yard) = 9 sq ft. The default unit for plots in Rajasthan. */
const SQFT_PER_GAJ = 9;
/** 1 acre = 43,560 sq ft. */
const SQFT_PER_ACRE = 43560;
/** 1 bigha (Rajasthan pucca) = 27,225 sq ft. */
const SQFT_PER_BIGHA = 27225;

export const AREA_UNITS = ["sqft", "sqm", "gaj", "acre", "bigha"] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

export function sqftFromDimensions(
  widthFt: number | null | undefined,
  lengthFt: number | null | undefined,
): number | null {
  if (!widthFt || !lengthFt || widthFt <= 0 || lengthFt <= 0) return null;
  return widthFt * lengthFt;
}

export function sqftToSqm(sqft: number): number {
  return sqft * SQFT_TO_SQM;
}

export function sqftToGaj(sqft: number): number {
  return sqft / SQFT_PER_GAJ;
}

export function sqftToAcre(sqft: number): number {
  return sqft / SQFT_PER_ACRE;
}

export function sqftToBigha(sqft: number): number {
  return sqft / SQFT_PER_BIGHA;
}

/** Indian grouping, and no trailing ".00" on whole numbers. */
export function formatNumber(value: number, maxDecimals = 2): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

export interface AreaBreakdown {
  sqft: number;
  sqm: number;
  gaj: number;
  acre: number;
  bigha: number;
  /** "30 × 40 ft" when dimensions are known, otherwise null. */
  dimensions: string | null;
  /** Whether the stored area matches width x length. */
  derived: boolean;
}

/**
 * Builds every derived figure for a plot. Prefers width x length when both are
 * present — a stored `size_sqft` that disagrees with the dimensions is stale,
 * and the dimensions are what the buyer can pace out on site.
 */
export function areaBreakdown(plot: {
  width_ft?: number | null;
  length_ft?: number | null;
  size_sqft: number;
}): AreaBreakdown {
  const fromDimensions = sqftFromDimensions(plot.width_ft, plot.length_ft);
  const sqft = fromDimensions ?? plot.size_sqft ?? 0;

  return {
    sqft,
    sqm: sqftToSqm(sqft),
    gaj: sqftToGaj(sqft),
    acre: sqftToAcre(sqft),
    bigha: sqftToBigha(sqft),
    dimensions: fromDimensions
      ? `${formatNumber(plot.width_ft as number)} × ${formatNumber(plot.length_ft as number)} ft`
      : null,
    derived: fromDimensions !== null,
  };
}

/**
 * The one-line area label used in tables and tiles. Large land parcels read
 * better in acres/bigha than in five-digit square footage.
 */
export function formatArea(
  plot: { width_ft?: number | null; length_ft?: number | null; size_sqft: number },
  { short = false }: { short?: boolean } = {},
): string {
  const area = areaBreakdown(plot);
  if (area.sqft <= 0) return "—";

  if (short) {
    if (area.sqft >= SQFT_PER_ACRE) return `${formatNumber(area.acre)} acre`;
    return `${formatNumber(area.sqft, 0)} sq.ft`;
  }

  const primary = `${formatNumber(area.sqft, 0)} sq.ft`;
  const secondary =
    area.sqft >= SQFT_PER_ACRE
      ? `${formatNumber(area.acre)} acre`
      : `${formatNumber(area.gaj)} gaj`;

  return `${primary} · ${secondary}`;
}

/** Price per sq.ft implied by a total price, guarding division by zero. */
export function ratePerSqft(totalPrice: number, sqft: number): number {
  if (!sqft || sqft <= 0) return 0;
  return totalPrice / sqft;
}

/** Compact money for tiles: ₹18.0L / ₹1.20Cr. */
export function formatMoneyShort(value: number): string {
  if (!value) return "₹0";
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${formatNumber(value, 0)}`;
}
