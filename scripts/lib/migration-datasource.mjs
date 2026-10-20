export function dedicatedMigrationDatasource(runtimeUrl, migrationUrl) {
  const runtime = new URL(runtimeUrl), migration = new URL(migrationUrl);
  const host = value => value.toLowerCase().replace("-pooler.", ".");
  const local = ["localhost", "127.0.0.1", "::1"].includes(runtime.hostname);
  if (!/^postgres(?:ql)?:$/.test(runtime.protocol) || !/^postgres(?:ql)?:$/.test(migration.protocol)
      || runtime.pathname !== migration.pathname || host(runtime.hostname) !== host(migration.hostname)
      || runtime.port !== migration.port || migration.hostname.includes("-pooler.")
      || (!local && !["require", "verify-ca", "verify-full"].includes(migration.searchParams.get("sslmode")))) {
    throw new Error("Dedicated migration credentials must use the same database and direct endpoint with required TLS.");
  }
  return migration.toString();
}
