export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const form = await readFormData(event);
  const file = form.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: "Choose an image to upload.",
    });
  }

  try {
    ensureBlob(file, { maxSize: "1MB", types: ["image"] });
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "Upload an image under 1 MB.";
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message,
    });
  }

  await blob.put(session.user.id, file, {
    prefix: "avatars",
    contentType: file.type,
  });

  const image = `/api/account/avatars/${session.user.id}?v=${Date.now()}`;

  await serverAuth().api.updateUser({
    body: { image },
    headers: event.headers,
  });
  await refreshSessionCookieCache(event);

  return createResponse({ code: ApiResponseCode.Success }, { image });
});
