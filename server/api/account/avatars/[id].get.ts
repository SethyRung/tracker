export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }

  return blob.serve(event, `avatars/${id}`);
});
