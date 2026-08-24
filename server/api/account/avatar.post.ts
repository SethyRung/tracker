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
    return createResponse({
      code: ApiResponseCode.InvalidRequest,
      message: getErrorMessage(error, "Upload an image under 1 MB."),
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
