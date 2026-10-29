import { and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { z } from "zod";
import { normalizeEmail, normalizePhone } from "../../../../../../shared/utils/contact";

const updateMemberSchema = z.object({
  contactEmail: z.string().trim().email().nullable().optional(),
  contactPhone: z
    .string()
    .refine((value) => !!normalizePhone(value), "Use an international phone number")
    .nullable()
    .optional(),
  nickname: z
    .string("Enter a nickname or leave it blank")
    .max(80, "Nickname must be at most 80 characters")
    .nullable()
    .optional(),
  avatarUrl: z
    .string("Enter a valid avatar URL")
    .url("Enter a valid avatar URL")
    .nullable()
    .optional(),
  color: z
    .string("Pick a color")
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid color")
    .nullable()
    .optional(),
  sharePercentBps: z
    .number("Enter a valid share percentage")
    .int("Use at most two decimal places for shares")
    .min(0, "Shares cannot be negative")
    .max(10000, "A share cannot exceed 100%")
    .optional(),
});

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  const mid = getMembershipId(event);

  const ctx = await requireRoomContext(event, roomId);
  const body = await readValidatedBody(event, updateMemberSchema.parse);

  const isSelf = ctx.membership.id === mid;
  const isAdmin = ctx.role === "admin";
  if (!isSelf && !isAdmin) {
    return createResponse({
      code: ApiResponseCode.Forbidden,
      message: "Cannot update other members",
    });
  }

  return db.transaction(async (tx) => {
    await tx
      .select({ id: schema.rooms.id })
      .from(schema.rooms)
      .where(eq(schema.rooms.id, roomId))
      .for("update");
    const target = await tx.query.roomMemberships.findFirst({
      where: (member, { and, eq }) =>
        and(eq(member.id, mid), eq(member.roomId, roomId), eq(member.isActive, true)),
    });
    if (!target)
      return createResponse({ code: ApiResponseCode.NotFound, message: "Member not found" });
    if (body.contactEmail !== undefined || body.contactPhone !== undefined) {
      if (!isAdmin || target.userId)
        return createResponse({
          code: ApiResponseCode.Forbidden,
          message: "Only admins can edit placeholder contact details",
        });
    }
    if (!target.userId && body.nickname !== undefined && !body.nickname?.trim()) {
      return createResponse({ code: ApiResponseCode.InvalidRequest, message: "Name is required" });
    }

    const updates: Record<string, unknown> = {};
    if (body.nickname !== undefined) updates.nickname = body.nickname;
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;
    if (body.color !== undefined) updates.color = body.color;
    if (body.sharePercentBps !== undefined) updates.sharePercentBps = body.sharePercentBps;
    if (body.contactEmail !== undefined)
      updates.contactEmail = body.contactEmail ? normalizeEmail(body.contactEmail) : null;
    if (body.contactPhone !== undefined)
      updates.contactPhone = body.contactPhone ? normalizePhone(body.contactPhone) : null;

    if (Object.keys(updates).length > 0) {
      await tx
        .update(schema.roomMemberships)
        .set(updates)
        .where(and(eq(schema.roomMemberships.id, mid), eq(schema.roomMemberships.roomId, roomId)));
    }

    const member = await tx.query.roomMemberships.findFirst({
      where: (m, { eq }) => eq(m.id, mid),
    });
    return createResponse({ code: ApiResponseCode.Success }, member);
  });
});
