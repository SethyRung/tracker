import { z } from "zod";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const body = await readValidatedBody(event, bodySchema.parse);

  await serverAuth().api.updateUser({
    body: { name: body.name },
    headers: event.headers,
  });
  await refreshSessionCookieCache(event);

  return createResponse({ code: ApiResponseCode.Success }, { name: body.name });
});
