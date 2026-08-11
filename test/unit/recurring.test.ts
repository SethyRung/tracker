import { describe, expect, it } from "vitest";
import {
  alreadyMaterialized,
  equalSplitSnapshot,
  planDraftForTemplate,
  pruneSnapshot,
  type TemplateSnapshotInput,
} from "../../shared/utils/recurring";
import { BPS_TOTAL } from "../../shared/types/weight";

// Recurring-template materialization (Phase 7). Pure functions tested here;
// the DB-using wrapper lives in server/utils/recurring.ts.

const snapshot = (...entries: Array<[string, number]>) =>
  entries.map(([membershipId, weightBps]) => ({ membershipId, weightBps }));

const template = (overrides: Partial<TemplateSnapshotInput> = {}): TemplateSnapshotInput => ({
  id: "tpl_1",
  categoryId: "cat_rent",
  currency: "USD",
  amountMinor: 50000,
  memberSnapshot: snapshot(["m_a", 5000], ["m_b", 5000]),
  ...overrides,
});

describe("recurring templates", () => {
  describe("pruneSnapshot", () => {
    it("returns the snapshot unchanged when every member is still active", () => {
      const result = pruneSnapshot(snapshot(["m_a", 5000], ["m_b", 5000]), new Set(["m_a", "m_b"]));
      expect(result).toEqual([
        { membershipId: "m_a", weightBps: 5000 },
        { membershipId: "m_b", weightBps: 5000 },
      ]);
    });

    it("drops members who are no longer active", () => {
      const result = pruneSnapshot(
        snapshot(["m_a", 5000], ["m_b", 5000], ["m_c", 0]),
        new Set(["m_a", "m_b"]),
      );
      expect(result).toEqual([
        { membershipId: "m_a", weightBps: 5000 },
        { membershipId: "m_b", weightBps: 5000 },
      ]);
    });

    it("renormalizes remaining weights so they sum to BPS_TOTAL", () => {
      // 6000 + 3000 = 9000. m_c leaves. Remaining 9000 must be scaled to 10000.
      const result = pruneSnapshot(
        snapshot(["m_a", 6000], ["m_b", 3000], ["m_c", 1000]),
        new Set(["m_a", "m_b"]),
      );
      expect(result).not.toBeNull();
      const total = result!.reduce((s, e) => s + e.weightBps, 0);
      expect(total).toBe(BPS_TOTAL);
    });

    it("absorbs the rounding remainder into the first (longest-tenured) kept member", () => {
      // 6667 + 3333 = 10000 exactly — no remainder, so first member unchanged.
      const result = pruneSnapshot(snapshot(["m_a", 6667], ["m_b", 3333]), new Set(["m_a", "m_b"]));
      expect(result).toEqual([
        { membershipId: "m_a", weightBps: 6667 },
        { membershipId: "m_b", weightBps: 3333 },
      ]);
    });

    it("returns null when every snapshot member has departed", () => {
      const result = pruneSnapshot(snapshot(["m_a", 5000], ["m_b", 5000]), new Set([]));
      expect(result).toBeNull();
    });

    it("returns null if every remaining member has weight 0 (degenerate split)", () => {
      // After pruning, the remaining weights are all zero — nothing to draw.
      const result = pruneSnapshot(snapshot(["m_a", 0], ["m_b", 0], ["m_c", 0]), new Set(["m_a"]));
      expect(result).toBeNull();
    });

    it("does not add members who are active but not in the snapshot", () => {
      // m_c joined the room but is not in the original snapshot — they
      // should NOT be auto-added. Admin must edit the template.
      const result = pruneSnapshot(
        snapshot(["m_a", 5000], ["m_b", 5000]),
        new Set(["m_a", "m_b", "m_c"]),
      );
      expect(result).toEqual([
        { membershipId: "m_a", weightBps: 5000 },
        { membershipId: "m_b", weightBps: 5000 },
      ]);
    });
  });

  describe("planDraftForTemplate", () => {
    it("produces a draft row with status='draft' and templateId set", () => {
      const plan = planDraftForTemplate(template(), new Set(["m_a", "m_b"]), {
        newEntryId: "draft_1",
        roomId: "room_1",
        createdByUserId: "user_1",
        monthStart: new Date("2026-08-01T00:00:00Z"),
        paidByMembershipId: "m_a",
      });
      expect(plan).not.toBeNull();
      expect(plan!.draft.status).toBe("draft");
      expect(plan!.draft.templateId).toBe("tpl_1");
      expect(plan!.draft.id).toBe("draft_1");
      expect(plan!.draft.categoryId).toBe("cat_rent");
      expect(plan!.draft.amountMinor).toBe(50000);
      expect(plan!.draft.date).toEqual(new Date("2026-08-01T00:00:00Z"));
    });

    it("returns null when every snapshot member has departed (no draft created)", () => {
      const plan = planDraftForTemplate(template(), new Set([]), {
        newEntryId: "draft_1",
        roomId: "room_1",
        createdByUserId: "user_1",
        monthStart: new Date("2026-08-01T00:00:00Z"),
        paidByMembershipId: "m_a",
      });
      expect(plan).toBeNull();
    });

    it("prunes weights when a member has left the room", () => {
      const plan = planDraftForTemplate(
        template({
          memberSnapshot: snapshot(["m_a", 7000], ["m_b", 2000], ["m_c", 1000]),
        }),
        new Set(["m_a", "m_b"]),
        {
          newEntryId: "draft_1",
          roomId: "room_1",
          createdByUserId: "user_1",
          monthStart: new Date("2026-08-01T00:00:00Z"),
          paidByMembershipId: "m_a",
        },
      );
      expect(plan).not.toBeNull();
      const total = plan!.weights.reduce((s, w) => s + w.weightBps, 0);
      expect(total).toBe(BPS_TOTAL);
      expect(plan!.weights.find((w) => w.membershipId === "m_c")).toBeUndefined();
    });
  });

  describe("alreadyMaterialized", () => {
    const start = new Date("2026-08-01T00:00:00Z");
    const end = new Date("2026-09-01T00:00:00Z");

    it("returns true when a draft for this template exists in the month", () => {
      expect(
        alreadyMaterialized(
          [{ templateId: "tpl_1", date: "2026-08-15T00:00:00Z" }],
          "tpl_1",
          start,
          end,
        ),
      ).toBe(true);
    });

    it("returns false when a draft exists but for a different template", () => {
      expect(
        alreadyMaterialized(
          [{ templateId: "tpl_other", date: "2026-08-15T00:00:00Z" }],
          "tpl_1",
          start,
          end,
        ),
      ).toBe(false);
    });

    it("returns false when a draft exists but for a different month", () => {
      expect(
        alreadyMaterialized(
          [{ templateId: "tpl_1", date: "2026-07-31T23:59:59Z" }],
          "tpl_1",
          start,
          end,
        ),
      ).toBe(false);
    });

    it("returns false when there are no drafts at all", () => {
      expect(alreadyMaterialized([], "tpl_1", start, end)).toBe(false);
    });

    it("accepts Date objects as well as strings", () => {
      expect(
        alreadyMaterialized(
          [{ templateId: "tpl_1", date: new Date("2026-08-15T00:00:00Z") }],
          "tpl_1",
          start,
          end,
        ),
      ).toBe(true);
    });
  });

  describe("equalSplitSnapshot", () => {
    it("returns an empty array for empty input", () => {
      expect(equalSplitSnapshot([])).toEqual([]);
    });

    it("splits BPS_TOTAL evenly across 2 members", () => {
      expect(equalSplitSnapshot(["m_a", "m_b"])).toEqual([
        { membershipId: "m_a", weightBps: 5000 },
        { membershipId: "m_b", weightBps: 5000 },
      ]);
    });

    it("splits evenly across 3 members with the remainder to the first", () => {
      expect(equalSplitSnapshot(["m_a", "m_b", "m_c"])).toEqual([
        { membershipId: "m_a", weightBps: 3334 },
        { membershipId: "m_b", weightBps: 3333 },
        { membershipId: "m_c", weightBps: 3333 },
      ]);
    });

    it("splits evenly across 7 members with the correct remainder", () => {
      const result = equalSplitSnapshot(["a", "b", "c", "d", "e", "f", "g"]);
      const total = result.reduce((s, e) => s + e.weightBps, 0);
      expect(total).toBe(BPS_TOTAL);
    });
  });

  describe("createTemplateSchema (Zod)", () => {
    it("accepts a minimal valid template", async () => {
      const { createTemplateSchema } = await import("../../shared/schemas/template");
      const r = createTemplateSchema.parse({
        categoryId: "cat_rent",
        currency: "USD",
        amountMinor: 50000,
        memberSnapshot: [{ membershipId: "m_a", weightBps: 10000 }],
      });
      expect(r.dayOfMonth).toBe(1);
      expect(r.isActive).toBe(true);
    });

    it("rejects dayOfMonth outside 1–31", async () => {
      const { createTemplateSchema } = await import("../../shared/schemas/template");
      expect(() =>
        createTemplateSchema.parse({
          categoryId: "cat_rent",
          currency: "USD",
          amountMinor: 50000,
          dayOfMonth: 32,
          memberSnapshot: [{ membershipId: "m_a", weightBps: 10000 }],
        }),
      ).toThrow();
      expect(() =>
        createTemplateSchema.parse({
          categoryId: "cat_rent",
          currency: "USD",
          amountMinor: 50000,
          dayOfMonth: 0,
          memberSnapshot: [{ membershipId: "m_a", weightBps: 10000 }],
        }),
      ).toThrow();
    });

    it("rejects an empty memberSnapshot", async () => {
      const { createTemplateSchema } = await import("../../shared/schemas/template");
      expect(() =>
        createTemplateSchema.parse({
          categoryId: "cat_rent",
          currency: "USD",
          amountMinor: 50000,
          memberSnapshot: [],
        }),
      ).toThrow();
    });

    it("rejects a snapshot whose weights don't sum to BPS_TOTAL", async () => {
      const { createTemplateSchema } = await import("../../shared/schemas/template");
      expect(() =>
        createTemplateSchema.parse({
          categoryId: "cat_rent",
          currency: "USD",
          amountMinor: 50000,
          memberSnapshot: [
            { membershipId: "m_a", weightBps: 5000 },
            { membershipId: "m_b", weightBps: 4000 },
          ],
        }),
      ).toThrow();
    });
  });
});
