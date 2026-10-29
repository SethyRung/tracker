import { db, schema } from "@nuxthub/db";
import { z } from "zod";
import { normalizeEmail, normalizePhone } from "../../../../../shared/utils/contact";

const bodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .refine((value) => !value || normalizePhone(value), "Use an international phone number")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);
  await requireRoomAdmin(event, roomId);
  const body = await readValidatedBody(event, bodySchema.parse);
  const members = await db.query.roomMemberships.findMany({
    columns: { color: true },
    where: (member, { eq }) => eq(member.roomId, roomId),
  });
  const member = {
    id: newId(),
    roomId,
    userId: null,
    role: "member" as const,
    nickname: body.name,
    contactEmail: body.email ? normalizeEmail(body.email) : null,
    contactPhone: body.phone ? normalizePhone(body.phone) : null,
    color:
      body.color ??
      nextMemberColor(
        members.map((item) => item.color).filter((color): color is string => !!color),
      ),
  };
  await db.insert(schema.roomMemberships).values(member);
  return createResponse({ code: ApiResponseCode.Success }, member);
});
