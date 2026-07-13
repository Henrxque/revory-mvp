import JSZip from "jszip";

const XLSX_MAX_ARCHIVE_ENTRIES = 5_000;
const XLSX_MAX_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;
const XLSX_MAX_COMPRESSION_RATIO = 100;

export function assertCanonicalUploadMetadata(input: {
  fileName: string;
  mimeType?: string;
  size: number;
  maxFileBytes: number;
}) {
  const name = input.fileName.toLowerCase();
  if (!name.endsWith(".csv") && !name.endsWith(".xlsx")) {
    throw new Error(`${input.fileName}: only .csv and .xlsx files are accepted.`);
  }
  if (!Number.isSafeInteger(input.size) || input.size <= 0 || input.size > input.maxFileBytes) {
    throw new Error(`${input.fileName}: file exceeds the current plan size limit.`);
  }
  const mime = input.mimeType?.toLowerCase().trim();
  if (mime && ![
    "application/octet-stream",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
  ].includes(mime)) {
    throw new Error(`${input.fileName}: the declared file type is not accepted.`);
  }
}

export async function assertCanonicalFileContent(input: {
  bytes: Uint8Array;
  fileName: string;
  maxFileBytes: number;
}) {
  assertCanonicalUploadMetadata({
    fileName: input.fileName,
    maxFileBytes: input.maxFileBytes,
    size: input.bytes.byteLength,
  });
  if (input.fileName.toLowerCase().endsWith(".csv")) {
    if (input.bytes.includes(0)) throw new Error(`${input.fileName}: binary content is not a CSV export.`);
    new TextDecoder("utf-8", { fatal: true }).decode(input.bytes);
    return { uncompressedBytes: input.bytes.byteLength };
  }
  if (input.bytes[0] !== 0x50 || input.bytes[1] !== 0x4b) {
    throw new Error(`${input.fileName}: the XLSX ZIP signature is missing.`);
  }
  const archive = await JSZip.loadAsync(input.bytes, { checkCRC32: false, createFolders: false });
  const entries = Object.values(archive.files);
  if (!entries.length || entries.length > XLSX_MAX_ARCHIVE_ENTRIES) {
    throw new Error(`${input.fileName}: workbook archive structure is unsafe.`);
  }
  let uncompressedBytes = 0;
  for (const entry of entries) {
    if (entry.unsafeOriginalName?.includes("..") || entry.name.startsWith("/") || entry.name.includes("\\")) {
      throw new Error(`${input.fileName}: workbook contains an unsafe archive path.`);
    }
    const sizes = (entry as unknown as { _data?: { compressedSize?: number; uncompressedSize?: number } })._data;
    uncompressedBytes += sizes?.uncompressedSize ?? 0;
  }
  if (
    uncompressedBytes > XLSX_MAX_UNCOMPRESSED_BYTES ||
    uncompressedBytes > Math.max(input.bytes.byteLength * XLSX_MAX_COMPRESSION_RATIO, 1)
  ) {
    throw new Error(`${input.fileName}: workbook expansion exceeds the safe archive limit.`);
  }
  return { uncompressedBytes };
}
