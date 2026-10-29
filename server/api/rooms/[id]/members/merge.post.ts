import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";
import { settle } from "../../../../../shared/utils/settle";

const bodySchema = z.object({ sourceId: z.string().min(1), targetId: z.string().min(1) });

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const ctx = await requireRoomAdmin(event, roomId);
  const { sourceId, targetId } = await readValidatedBody(event, bodySchema.parse);
  if (sourceId === targetId)
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Choose two different members",
    });

  return db.transaction(async (tx) => {
    await tx
      .select({ id: schema.rooms.id })
      .from(schema.rooms)
      .where(eq(schema.rooms.id, roomId))
      .for("update");
    const members = await tx
      .select()
      .from(schema.roomMemberships)
      .where(eq(schema.roomMemberships.roomId, roomId))
      .for("update");
    const source = members.find(
      (member) => member.id === sourceId && member.isActive && !member.userId,
    );
    const target = members.find(
      (member) => member.id === targetId && member.isActive && member.userId,
    );
    if (!source || !target)
      return createResponse({
        code: ApiResponseCode.InvalidRequest,
        message: "Choose an active placeholder and an active joined member in this room",
      });

    const entries = await tx
      .select()
      .from(schema.entries)
      .where(eq(schema.entries.roomId, roomId))
      .for("update");
    const weights = entries.length
      ? await tx
          .select()
          .from(schema.entryWeights)
          .where(
            inArray(
              schema.entryWeights.entryId,
              entries.map((entry) => entry.id),
            ),
          )
          .for("update")
      : [];
    const changed: Array<{
      entryId: string;
      weights: Array<{ membershipId: string; weightBps: number }>;
    }> = [];
    for (const entry of entries) {
      const beforeWeights = weights.filter((weight) => weight.entryId === entry.id);
      if (
        !beforeWeights.some((weight) => weight.membershipId === sourceId) &&
        entry.paidByMembershipId !== sourceId
      )
        continue;
      const byMember = new Map<string, number>();
      for (const weight of beforeWeights) {
        const id = weight.membershipId === sourceId ? targetId : weight.membershipId;
        byMember.set(id, (byMember.get(id) ?? 0) + weight.weightBps);
      }
      const afterWeights = [...byMember].map(([membershipId, weightBps]) => ({
        membershipId,
        weightBps,
      }));
      const before = settle(
        [
          {
            amountMinor: Number(entry.amountMinor),
            paidByMembershipId: entry.paidByMembershipId,
            weights: beforeWeights,
          },
        ],
        members,
      ).balances;
      const after = settle(
        [
          {
            amountMinor: Number(entry.amountMinor),
            paidByMembershipId:
              entry.paidByMembershipId === sourceId ? targetId : entry.paidByMembershipId,
            weights: afterWeights,
          },
        ],
        members.filter((member) => member.id !== sourceId),
      ).balances;
      const originalSource = before.find((balance) => balance.membershipId === sourceId)!;
      for (const balance of after) {
        const original = before.find((item) => item.membershipId === balance.membershipId)!;
        const paid = original.paid + (balance.membershipId === targetId ? originalSource.paid : 0);
        const owed = original.owed + (balance.membershipId === targetId ? originalSource.owed : 0);
        if (balance.paid !== paid || balance.owed !== owed)
          return createResponse({
            code: ApiResponseCode.InvalidRequest,
            message:
              "This merge would change a historical split because of rounding. Update the split before merging.",
          });
      }
      changed.push({ entryId: entry.id, weights: afterWeights });
    }

    for (const entry of changed) {
      await tx.delete(schema.entryWeights).where(eq(schema.entryWeights.entryId, entry.entryId));
      if (entry.weights.length)
        await tx
          .insert(schema.entryWeights)
          .values(entry.weights.map((weight) => ({ entryId: entry.entryId, ...weight })));
    }
    await tx
      .update(schema.entries)
      .set({ paidByMembershipId: targetId })
      .where(
        and(eq(schema.entries.roomId, roomId), eq(schema.entries.paidByMembershipId, sourceId)),
      );

    const templates = await tx
      .select()
      .from(schema.recurringTemplates)
      .where(eq(schema.recurringTemplates.roomId, roomId))
      .for("update");
    for (const template of templates) {
      const snapshot = new Map<string, number>();
      for (const weight of template.memberSnapshot) {
        const id = weight.membershipId === sourceId ? targetId : weight.membershipId;
        snapshot.set(id, (snapshot.get(id) ?? 0) + weight.weightBps);
      }
      if (
        template.paidByMembershipId === sourceId ||
        template.memberSnapshot.some((weight) => weight.membershipId === sourceId)
      ) {
        await tx
          .update(schema.recurringTemplates)
          .set({
            paidByMembershipId:
              template.paidByMembershipId === sourceId ? targetId : template.paidByMembershipId,
            memberSnapshot: [...snapshot].map(([membershipId, weightBps]) => ({
              membershipId,
              weightBps,
            })),
          })
          .where(eq(schema.recurringTemplates.id, template.id));
      }
    }
    await tx
      .update(schema.inviteLinks)
      .set({ usedByMembershipId: targetId })
      .where(
        and(
          eq(schema.inviteLinks.roomId, roomId),
          eq(schema.inviteLinks.usedByMembershipId, sourceId),
        ),
      );
    await tx
      .update(schema.inviteLinks)
      .set({ createdByMembershipId: targetId })
      .where(
        and(
          eq(schema.inviteLinks.roomId, roomId),
          eq(schema.inviteLinks.createdByMembershipId, sourceId),
        ),
      );
    await tx
      .update(schema.roomMemberships)
      .set({ isActive: false, leftAt: new Date(), contactEmail: null, contactPhone: null })
      .where(eq(schema.roomMemberships.id, sourceId));
    await tx
      .insert(schema.memberMerges)
      .values({
        id: newId(),
        roomId,
        sourceMembershipId: sourceId,
        targetMembershipId: targetId,
        mergedByUserId: ctx.userId,
      });
    return createResponse({ code: ApiResponseCode.Success }, { membershipId: targetId });
  });
});
