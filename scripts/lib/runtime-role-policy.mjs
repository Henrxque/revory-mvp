const identifier = value => {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(value)) throw new Error("Invalid SQL identifier.");
  return `"${value}"`;
};
export function runtimeRolePolicy({ runtimeRole, migrationRole, database }) {
  if (!/^revory_(runtime|qa)_[a-z0-9_]+$/.test(runtimeRole) || runtimeRole === migrationRole) throw new Error("A new, separate runtime role is required.");
  const role = identifier(runtimeRole), migrator = identifier(migrationRole), db = identifier(database);
  return [
    `CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION`,
    `GRANT CONNECT ON DATABASE ${db} TO ${role}`,
    `GRANT USAGE ON SCHEMA public TO ${role}`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`,
    `REVOKE ALL ON TABLE public._prisma_migrations FROM ${role}`,
    `GRANT SELECT ON TABLE public._prisma_migrations TO ${role}`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrator} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${migrator} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${role}`,
  ];
}
