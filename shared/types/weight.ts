// Share weights are stored as decimals in [0, 1] (0.45 = 45%).
// 1.0 represents 100%. Kept the field name `weightBps` for backward
// compat with the wire format.
export const BPS_TOTAL = 1;

const PRECISION = 10000;

function round(n: number): number {
  return Math.round(n * PRECISION) / PRECISION;
}

export function bpsToPercent(bps: number): number {
  return bps * 100;
}

export function percentToBps(percent: number): number {
  return round(percent / 100);
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
        message: `Weight for ${id} must be 0–1 (got ${w}).`,
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
  // Floor at 4 decimals so the sum never overshoots. The remainder
  // absorbs the difference (e.g. 1/7 floor = 0.1428, remainder = 0.0004).
  return Math.floor((BPS_TOTAL / attendeeCount) * PRECISION) / PRECISION;
}

export function splitRemainderBps(attendeeCount: number): number {
  if (attendeeCount <= 0) return 0;
  const base = equalSplitBps(attendeeCount);
  return round(BPS_TOTAL - base * attendeeCount);
}
