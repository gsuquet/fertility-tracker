import { getTodayStr } from './dateUtils';

/** The extension of a backup file. The content is plain JSON. */
export const BACKUP_EXTENSION = 'ftbackup';

/**
 * Generates clean, lowercase, dash-separated export filenames.
 * Format: strictly lowercase alphanumeric characters and dashes only.
 *
 * Examples:
 * - backup: 'fertility-tracker-backup-2026-07-31.ftbackup'
 * - pdf single cycle: 'fertility-tracker-chart-cycle-1-2026-07-31'
 * - pdf all cycles: 'fertility-tracker-chart-all-cycles-2026-07-31'
 * - png single cycle: 'fertility-tracker-chart-cycle-1-2026-07-31.png'
 */
export function getExportFilename(type: 'backup' | 'pdf' | 'png', detail?: string): string {
  const dateStr = getTodayStr();

  if (type === 'backup') {
    return `fertility-tracker-backup-${dateStr}.${BACKUP_EXTENSION}`;
  }

  const cleanDetail = detail
    ? detail
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : '';

  // The browser adds .pdf to the print file name
  const extension = type === 'png' ? '.png' : '';
  return `fertility-tracker-chart-${cleanDetail || 'export'}-${dateStr}${extension}`;
}

/** Downloads a file that the app made, with the given file name */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Downloads the JSON backup of the observations, with the backup file name of today. The type is
 * neutral: with `application/json`, a browser can add `.json` after `.ftbackup`.
 */
export function downloadBackupFile(json: string): void {
  downloadBlob(new Blob([json], { type: 'application/octet-stream' }), getExportFilename('backup'));
}
