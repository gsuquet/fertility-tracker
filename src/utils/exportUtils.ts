import { isIos } from '../pwa/installPrompt';
import { getTodayStr } from './dateUtils';

/** The extension of a backup file. The content is plain JSON. */
export const BACKUP_EXTENSION = 'ftbackup';

/**
 * Generates clean, lowercase, dash-separated export filenames.
 * Format: strictly lowercase alphanumeric characters and dashes only.
 *
 * Examples:
 * - backup: 'fertility-tracker-backup-2026-07-31.ftbackup'
 * - print single cycle: 'fertility-tracker-chart-cycle-1-2026-07-31'
 * - print all cycles: 'fertility-tracker-chart-all-cycles-2026-07-31'
 * - pdf single cycle: 'fertility-tracker-chart-cycle-1-2026-07-31.pdf'
 * - png single cycle: 'fertility-tracker-chart-cycle-1-2026-07-31.png'
 */
export function getExportFilename(
  type: 'backup' | 'print' | 'pdf' | 'png',
  detail?: string
): string {
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
  const extension = type === 'print' ? '' : `.${type}`;
  return `fertility-tracker-chart-${cleanDetail || 'export'}-${dateStr}${extension}`;
}

/** Downloads a file that the app made, with the given file name */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Safari can cancel the download when the address goes at once
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** What became of a file: downloaded, given to the share sheet, or the user closed the sheet */
export type SaveResult = 'downloaded' | 'shared' | 'cancelled';

/**
 * Saves a file that the app made. On iOS and iPadOS, the share sheet opens with the file, so the
 * user can tap Save to Files, Print, AirDrop or Mail: Safari keeps a download in a list that is
 * hard to find, and the Home Screen app can lose it. Other browsers download the file. The call
 * must come from a click, with no wait before it, or the browser refuses the share sheet. Then
 * the file downloads.
 */
export async function saveFile(blob: Blob, fileName: string): Promise<SaveResult> {
  if (isIos() && typeof navigator.canShare === 'function') {
    const file = new File([blob], fileName, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      }
    }
  }
  downloadBlob(blob, fileName);
  return 'downloaded';
}

/**
 * Downloads the JSON backup of the observations, with the backup file name of today. The type is
 * neutral: with `application/json`, a browser can add `.json` after `.ftbackup`.
 */
export function downloadBackupFile(json: string): void {
  downloadBlob(new Blob([json], { type: 'application/octet-stream' }), getExportFilename('backup'));
}
