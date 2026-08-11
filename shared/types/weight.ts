// Share weights are stored as integer basis points in [0, 10000]
// (2500 = 25.00%). 10000 represents 100%. This matches SPEC §14 and the
// integer `weight_bps` / `share_percent_bps` columns. (An earlier version of
// this file used decimals in [0, 1] under the same `weightBps` name; that
// contradicted the spec and couldn't be stored in an integer column.)
export const BPS_TOTAL = 10000;

function round(n: number): number {
  return Math.round(n);
}

export function bpsToPercent(bps: number): number {
  return bps / 100;
}

export function percentToBps(percent: number): number {
  return round(percent * 100);
}

export interface WeightValidationIssue {
  code: "out_of_range" | "sum_mismatch" | "empty";
  message: string;
  details?: Record<string, unknown>;
}

export function validateWeights(weights: Record<string, number>): WeightValidationIssue[] {
  const entries = Object.entries(weights);
  if (entries.length === 0) {
    return [{ code: "empty", message: "At least one attendee is required." }];
  }

  const issues: WeightValidationIssue[] = [];

  for (const [id, w] of entries) {
    if (typeof w !== "number" || w < 0 || w > BPS_TOTAL) {
      issues.push({
        code: "out_of_range",
        message: `Weight for ${id} must be 0–${BPS_TOTAL} (got ${w}).`,
        details: { id, weight: w },
      });
    }
  }

  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (Math.abs(total - BPS_TOTAL) > 0.0001) {
    issues.push({
      code: "sum_mismatch",
      message: `Weights sum to ${total.toFixed(4)}, expected ${BPS_TOTAL.toFixed(4)}.`,
      details: { total, expected: BPS_TOTAL },
    });
  }

  return issues;
}

export function isValidWeights(weights: Record<string, number>): boolean {
  return validateWeights(weights).length === 0;
}

export function equalSplitBps(attendeeCount: number): number {
  if (attendeeCount <= 0) return 0;
  // Floor so the per-attendee base never overshoots; the remainder absorbs the
  // difference (e.g. 10000 / 3 floor = 3333, remainder = 1).
  return Math.floor(BPS_TOTAL / attendeeCount);
}

export function splitRemainderBps(attendeeCount: number): number {
  if (attendeeCount <= 0) return 0;
  const base = equalSplitBps(attendeeCount);
  return BPS_TOTAL - base * attendeeCount;
}