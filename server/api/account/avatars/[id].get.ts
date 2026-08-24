export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  return blob.serve(event, `avatars/${id}`);
});
