export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);

  return createResponse(
    { code: ApiResponseCode.Success },
    {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    },
  );
});
