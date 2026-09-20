// 1 decimal reads as "0.0" for genuinely tiny rain amounts (e.g. 0.04mm)
// even though a bar/indicator for it can still be visibly present on a
// near-dry chart — show more precision below 1mm so the number matches
// what's actually being displayed.
export function formatMm(v: number): string {
  if (v <= 0) return "0.0";
  return v < 1 ? v.toFixed(2) : v.toFixed(1);
}
