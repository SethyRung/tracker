export function splitLabel(
  weights: ReadonlyArray<{ membershipId: string; weightBps: number }>,
  nameOf: (membershipId: string) => string,
): string {
  if (weights.length === 0) return "—";

  const rows = weights.map((weight) => ({
    name: nameOf(weight.membershipId),
    weightBps: weight.weightBps,
  }));
  if (rows.length === 1) return `${rows[0]!.name} (100%)`;

  const first = rows[0]!.weightBps;
  const equal = rows.every((row) => Math.abs(row.weightBps - first) <= 1);
  if (rows.length === 2) {
    return `${rows[0]!.name} & ${rows[1]!.name} (${pct(rows[0]!.weightBps)}/${pct(rows[1]!.weightBps)})`;
  }
  if (equal) return `Equal (${pct(first)}% each)`;
  return rows.map((row) => `${pct(row.weightBps)}%`).join("/");
}

function pct(bps: number) {
  return Math.round(bps / 100);
}
