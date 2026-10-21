import type { PrismaClient } from "@prisma/client";
export type RestoreManifest = { columns: unknown[]; constraints: unknown[]; rows: { table: string; rows: string; digest: string }[] };
export function databaseIdentity(url: string): { database: string; host: string; port: string };
export function assertIsolatedRestore(source: string, target: string): void;
export function readRestoreManifest(client: PrismaClient): Promise<RestoreManifest>;
export function compareRestoreManifests(source: RestoreManifest, target: RestoreManifest): { structuralMatch: true; contentHashesMatch: true; tablesChecked: number; sourceRows: string; countMismatches: number };
