export const REVORY_CSV_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const REVORY_CSV_ALLOWED_EXTENSION = ".csv";
export const REVORY_CSV_ACCEPT = ".csv,text/csv";

export function formatUploadSizeLimit(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
