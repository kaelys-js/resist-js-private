/** Format a number as JPY with yen symbol */
export function formatJPY(amount: number): string {
  return `\u00a5${amount.toLocaleString()}`;
}

/** Format a number as CAD */
export function formatCAD(amount: number): string {
  return `CAD $${amount.toLocaleString()}`;
}

/** Format a cost that could be a number or string range */
export function formatCost(cost: number | string | null): string {
  if (cost === null) return '';
  if (cost === 0) return 'FREE';
  if (typeof cost === 'string') return `\u00a5${cost}`;
  return formatJPY(cost);
}
