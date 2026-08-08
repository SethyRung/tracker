export const BPS_TOTAL = 10000;

export function bpsToPercent(bps: number): number {
  return bps / 100;
}

export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
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
    if (!Number.isInteger(w) || w < 0 || w > BPS_TOTAL) {
      issues.push({
        code: "out_of_range",
        message: `Weight for ${id} must be 0–10000 (got ${w}).`,
        details: { id, weight: w },
      });
    }
  }

  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total !== BPS_TOTAL) {
    issues.push({
      code: "sum_mismatch",
      message: `Weights sum to ${total}, expected 10000.`,
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
  return Math.floor(BPS_TOTAL / attendeeCount);
}

export function splitRemainderBps(attendeeCount: number): number {
  if (attendeeCount <= 0) return 0;
  return BPS_TOTAL - equalSplitBps(attendeeCount) * attendeeCount;
}
