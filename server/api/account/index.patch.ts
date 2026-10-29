import { z } from "zod";
import { normalizePhone } from "../../../shared/utils/contact";

const bodySchema = z.object({
  name: z
    .string("Name is required")
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be at most 80 characters"),
  phone: z
    .string()
    .refine((value) => !!normalizePhone(value), "Use an international phone number")
    .nullable()
    .optional(),
});

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const body = await readValidatedBody(event, bodySchema.parse);

  const phone =
    body.phone === undefined ? undefined : body.phone ? normalizePhone(body.phone)! : null;
  await serverAuth().api.updateUser({
    body: { name: body.name, ...(phone !== undefined ? { phone } : {}) },
    headers: event.headers,
  });
  await refreshSessionCookieCache(event);

  return createResponse(
    { code: ApiResponseCode.Success },
    { name: body.name, ...(phone !== undefined ? { phone } : {}) },
  );
});
