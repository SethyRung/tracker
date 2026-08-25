import { eq } from "drizzle-orm";
import { db } from "@nuxthub/db";
import { user } from "#auth/schema";
import { z } from "zod";

const createInviteSchema = z.object({
  emails: z.array(z.email().max(254)).min(1).max(20),
});

export default defineEventHandler(async (event) => {
  const roomId = getRoomId(event);

  const ctx = await requireRoomAdmin(event, roomId);
  const { emails } = await readValidatedBody(event, createInviteSchema.parse);

  const { joinUrl } = await createInviteLink(ctx.membership.id, roomId);

  const inviterRow = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1);
  const inviterName = ctx.membership.nickname ?? inviterRow[0]?.name ?? "";

  const responses = await Promise.all(
    emails.map(async (email) =>
      sendInviteEmail({
        to: email,
        url: joinUrl,
        roomName: ctx.room.name,
        inviterName,
      }),
    ),
  );

  const results = responses.map((res, index) => {
    const email = emails[index] ?? "missing-email";
    if (!res || res.error || !res.data) {
      return { email, emailSent: false };
    }

    return { email, emailSent: true };
  });

  return createResponse({ code: ApiResponseCode.Success }, results);
});
