export function isGoogleAuthConfigured() {
  return Boolean(
    process.env.AUTH_GOOGLE_CLIENT_ID &&
      process.env.AUTH_GOOGLE_CLIENT_SECRET,
  );
}

export function isMetaAuthConfigured() {
  return Boolean(
    process.env.AUTH_META_APP_ID &&
      process.env.AUTH_META_APP_SECRET,
  );
}

export function isEmailAuthConfigured() {
  return Boolean(process.env.AUTH_EMAIL_FROM);
}
