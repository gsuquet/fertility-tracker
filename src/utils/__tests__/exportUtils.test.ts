import { describe, it, expect } from 'vitest';
import { getExportFilename } from '../exportUtils';
import { getTodayStr } from '../dateUtils';

describe('exportUtils', () => {
  it('generates a lowercase dash-separated backup filename with date', () => {
    const filename = getExportFilename('backup');
    const today = getTodayStr();
    expect(filename).toBe(`fertility-tracker-data-backup-${today}.json`);
    expect(filename).toEqual(filename.toLowerCase());
    expect(filename).not.toContain('_');
    expect(filename).not.toContain(' ');
  });

  it('generates clean lowercase dash-separated PDF filenames for cycles', () => {
    const today = getTodayStr();
    const singleFilename = getExportFilename('pdf', 'cycle-1');
    expect(singleFilename).toBe(`fertility-tracker-chart-cycle-1-${today}`);
    expect(singleFilename).toEqual(singleFilename.toLowerCase());
    expect(singleFilename).not.toContain('_');

    const multiFilename = getExportFilename('pdf', 'all-cycles');
    expect(multiFilename).toBe(`fertility-tracker-chart-all-cycles-${today}`);

    const rawInputFilename = getExportFilename('pdf', 'Cycle #2 (Special)');
    expect(rawInputFilename).toBe(`fertility-tracker-chart-cycle-2-special-${today}`);
  });
});
