export function isInternalMigrationPreviewEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.REVORY_INTERNAL_PREVIEW_MODE === "true"
  );
}
