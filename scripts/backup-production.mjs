import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { pathToFileURL } from 'node:url';

export const MAX_BYTES = 20 * 1024 * 1024;
export function connectionEnvironment(value) {
  const u = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(u.protocol) ||
      u.hostname !== 'ep-floral-bird-adrjwgrf.c-2.us-east-1.aws.neon.tech' ||
      u.pathname !== '/neondb' || decodeURIComponent(u.username) !== 'revory_backup_prod_20261020' || !u.password) {
    throw new Error('Backup requires the reviewed production endpoint and dedicated read-only role.');
  }
  return { ...process.env, PGHOST: u.hostname, PGPORT: '5432', PGDATABASE: 'neondb',
    PGUSER: decodeURIComponent(u.username), PGPASSWORD: decodeURIComponent(u.password),
    PGSSLMODE: 'verify-full', PGSSLROOTCERT: process.env.PGSSLROOTCERT || 'system',
    PGCONNECT_TIMEOUT: '30', PGAPPNAME: 'revory-encrypted-backup',
    PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=300000' };
}
function child(binary, args, env) {
  const p = spawn(binary, args, { env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  // Never forward PostgreSQL diagnostics: they may contain customer rows or credentials.
  p.stderr.resume();
  const done = new Promise((ok, fail) => {
    p.once('error', () => fail(new Error('Backup dependency could not start.')));
    p.once('close', code => code === 0 ? ok() : fail(new Error('Backup dependency failed; no archive published.')));
  });
  done.catch(() => {});
  return { p, done };
}
export async function runBackup({ databaseUrl, recipient, output, pgBin = '', ageBin = 'age', snapshot }) {
  if (!/^age1[0-9a-z]{58}$/.test(recipient)) throw new Error('A reviewed age public recipient is required.');
  const env = connectionEnvironment(databaseUrl);
  delete env.REVORY_BACKUP_DATABASE_URL;
  const binary = name => pgBin ? join(pgBin, process.platform === 'win32' ? `${name}.exe` : name) : name;
  // The application uses public (including NextAuth). Managed neon_auth is unused by REVORY.
  // Refuse partial access, RLS, unreviewed schemas, large objects or a privileged role.
  const preflight = child(binary('psql'), ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], env);
  let result = '';
  preflight.p.stdout.setEncoding('utf8').on('data', value => { result += value; });
  preflight.p.stdin.end(`SELECT CASE WHEN
    current_database()='neondb' AND current_user='revory_backup_prod_20261020'
    AND NOT EXISTS (SELECT FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
    AND NOT EXISTS (SELECT FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user))
    AND NOT has_schema_privilege(current_user,'public','CREATE')
    AND NOT EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND (c.relrowsecurity OR NOT has_table_privilege(c.oid,'SELECT') OR has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)))
    AND NOT EXISTS (SELECT FROM pg_namespace WHERE nspname NOT IN ('public','information_schema','neon_auth') AND nspname NOT LIKE 'pg_%')
    AND NOT EXISTS (SELECT FROM pg_largeobject_metadata)
    AND EXISTS (SELECT FROM pg_tables WHERE schemaname='public')
    THEN 'READY' ELSE 'REFUSED' END;`);
  await preflight.done;
  if (result.trim() !== 'READY') throw new Error('Backup access/schema preflight refused; review permissions or schema.');
  const directory = resolve(output);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const partial = join(directory, 'production.dump.age.partial');
  const archive = join(directory, 'production.dump.age');
  if (snapshot && !/^[0-9A-Fa-f-]+$/.test(snapshot)) throw new Error('Invalid exported snapshot.');
  const dump = child(binary('pg_dump'), ['--schema=public', '--format=custom', '--compress=6', '--no-owner', '--no-acl', '--lock-wait-timeout=15000', ...(snapshot ? [`--snapshot=${snapshot}`] : [])], env);
  // Only PostgreSQL receives the backup credential.
  const encryptionEnv = { ...process.env };
  delete encryptionEnv.REVORY_BACKUP_DATABASE_URL;
  const age = child(ageBin, ['--encrypt', '--recipient', recipient], encryptionEnv);
  dump.p.stdin.end();
  let bytes = 0;
  const digest = createHash('sha256');
  const bounded = new Transform({ transform(chunk, _, next) {
    bytes += chunk.length;
    if (bytes > MAX_BYTES) return next(new Error('Archive exceeds the reviewed free-storage cap.'));
    digest.update(chunk); next(null, chunk);
  }});
  try {
    await Promise.all([dump.done, age.done,
      pipeline(dump.p.stdout, age.p.stdin),
      pipeline(age.p.stdout, bounded, createWriteStream(partial, { mode: 0o600, flags: 'wx' }))]);
    if (bytes < 100) throw new Error('Empty backup archive refused.');
    const { rename } = await import('node:fs/promises');
    await rename(partial, archive);
    const proof = { format: 'pg_dump-custom+age-v1', createdAt: new Date().toISOString(),
      database: 'neondb', encryptedBytes: bytes, sha256: digest.digest('hex'),
      retentionDays: 7, scope: 'production public schema including NextAuth; excludes unused managed neon_auth, provider roles and Vercel secrets' };
    await writeFile(join(directory, 'manifest.json'), JSON.stringify(proof, null, 2) + '\n', { mode: 0o600 });
    return proof;
  } catch (error) {
    dump.p.kill(); age.p.kill();
    await Promise.allSettled([dump.done, age.done]);
    await rm(partial, { force: true });
    await rm(archive, { force: true });
    await rm(join(directory, 'manifest.json'), { force: true });
    throw error;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const proof = await runBackup({ databaseUrl: process.env.REVORY_BACKUP_DATABASE_URL,
      recipient: process.env.REVORY_BACKUP_RECIPIENT, output: process.env.REVORY_BACKUP_OUTPUT,
      pgBin: process.env.PG_BIN, ageBin: process.env.AGE_BIN });
    console.log(JSON.stringify(proof));
  } catch {
    console.error('Encrypted backup failed. Check credential validity, access policy, tools and size cap. No plaintext or database diagnostics logged.');
    process.exitCode = 1;
  }
}
