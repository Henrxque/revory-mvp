export function isGoogleAuthConfigured() {
  return Boolean(
    process.env.AUTH_GOOGLE_CLIENT_ID &&
      process.env.AUTH_GOOGLE_CLIENT_SECRET,
  );
}
