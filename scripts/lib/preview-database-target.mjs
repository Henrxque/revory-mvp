export function previewDatabaseTarget(env) {
  const pooled = new URL(env.DATABASE_URL ?? '');
  const direct = new URL(env.DATABASE_URL_UNPOOLED ?? '');
  const commercial = env.REVORY_AI_COMMERCIAL_ENABLED === 'true';
  const expected = commercial ? env.REVORY_AI_COMMERCIAL_DATABASE : env.REVORY_AI_SAAS_SYNTHETIC_DATABASE;
  const namePattern = commercial ? /^revory_monitor_hml_[a-f0-9]{12}$/ : /^revory_ai_(sandbox|homolog)_[a-f0-9]{12}$/;
  if (!namePattern.test(expected ?? '') || pooled.pathname.slice(1) !== expected || direct.pathname !== pooled.pathname
    || !['postgres:', 'postgresql:'].includes(pooled.protocol) || !['postgres:', 'postgresql:'].includes(direct.protocol)
    || direct.hostname !== pooled.hostname.replace('-pooler.', '.') || direct.username !== pooled.username || direct.password !== pooled.password) {
    throw new Error('Preview requires matching direct/runtime URLs for its exact isolated database.');
  }
  if (commercial && (env.REVORY_DATABASE_MIGRATIONS_EXTERNAL !== 'true' || env.REVORY_MIGRATION_DATABASE_URL
    || !/^revory_runtime_/.test(pooled.username) || !['require', 'verify-ca', 'verify-full'].includes(pooled.searchParams.get('sslmode'))
    || !['require', 'verify-ca', 'verify-full'].includes(direct.searchParams.get('sslmode'))
    || !['monitor-399/v1', 'integrity-99-monitor-199/v1'].includes(env.REVORY_AI_COMMERCIAL_RELEASE) || env.REVORY_AI_COMMERCIAL_SECURITY_REVIEWED !== 'true'
    || env.REVORY_AI_SAAS_SYNTHETIC_ONLY !== 'false' || env.REVORY_AI_MONITOR_BILLING_MODE !== 'test'
    || env.REVORY_AI_CUSTOMER_STRIPE_MODE !== 'test'
    || !env.REVORY_AI_COMMERCIAL_BRANCH || env.VERCEL_GIT_COMMIT_REF !== env.REVORY_AI_COMMERCIAL_BRANCH)) {
    throw new Error('Commercial Preview requires its approved branch, test modes, runtime role and external migrations.');
  }
  return direct.toString();
}
