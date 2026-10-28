import { getTodayStr } from './dateUtils';

/**
 * Generates clean, lowercase, dash-separated export filenames.
 * Format: strictly lowercase alphanumeric characters and dashes only.
 *
 * Examples:
 * - backup: 'fertility-tracker-data-backup-2026-07-31.json'
 * - pdf single cycle: 'fertility-tracker-chart-cycle-1-2026-07-31'
 * - pdf all cycles: 'fertility-tracker-chart-all-cycles-2026-07-31'
 */
export function getExportFilename(type: 'backup' | 'pdf', detail?: string): string {
  const dateStr = getTodayStr();

  if (type === 'backup') {
    return `fertility-tracker-data-backup-${dateStr}.json`;
  }

  const cleanDetail = detail
    ? detail
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : '';

  if (cleanDetail) {
    return `fertility-tracker-chart-${cleanDetail}-${dateStr}`;
  }

  return `fertility-tracker-chart-export-${dateStr}`;
}

/** Downloads the JSON backup of the observations, with the backup file name of today. */
export function downloadBackupFile(json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = getExportFilename('backup');
  link.click();
  URL.revokeObjectURL(url);
}
