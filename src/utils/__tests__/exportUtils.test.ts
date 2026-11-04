import { afterEach, describe, it, expect, vi } from 'vitest';
import { getExportFilename, saveFile } from '../exportUtils';
import { getTodayStr } from '../dateUtils';

describe('exportUtils', () => {
  it('generates a lowercase dash-separated backup filename with date', () => {
    const filename = getExportFilename('backup');
    const today = getTodayStr();
    expect(filename).toBe(`fertility-tracker-backup-${today}.ftbackup`);
    expect(filename).toEqual(filename.toLowerCase());
    expect(filename).not.toContain('_');
    expect(filename).not.toContain(' ');
  });

  it('generates clean lowercase dash-separated print filenames for cycles', () => {
    const today = getTodayStr();
    const singleFilename = getExportFilename('print', 'cycle-1');
    expect(singleFilename).toBe(`fertility-tracker-chart-cycle-1-${today}`);
    expect(singleFilename).toEqual(singleFilename.toLowerCase());
    expect(singleFilename).not.toContain('_');

    const multiFilename = getExportFilename('print', 'all-cycles');
    expect(multiFilename).toBe(`fertility-tracker-chart-all-cycles-${today}`);

    const rawInputFilename = getExportFilename('print', 'Cycle #2 (Special)');
    expect(rawInputFilename).toBe(`fertility-tracker-chart-cycle-2-special-${today}`);
  });

  it('uses a generic print filename when the detail is missing or has no letters or digits', () => {
    expect(getExportFilename('print')).toMatch(
      /^fertility-tracker-chart-export-\d{4}-\d{2}-\d{2}$/
    );
    expect(getExportFilename('print', '***')).toMatch(/^fertility-tracker-chart-export-/);
  });

  it('gives the PDF file the print file name with .pdf', () => {
    expect(getExportFilename('pdf', 'cycle-2')).toBe(
      `fertility-tracker-chart-cycle-2-${getTodayStr()}.pdf`
    );
  });

  it('gives the PNG file the print file name with .png', () => {
    expect(getExportFilename('png', 'cycle-2')).toBe(
      `fertility-tracker-chart-cycle-2-${getTodayStr()}.png`
    );
    expect(getExportFilename('png')).toMatch(
      /^fertility-tracker-chart-export-\d{4}-\d{2}-\d{2}\.png$/
    );
  });
});

describe('saveFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const blob = new Blob(['%PDF'], { type: 'application/pdf' });
  const iPhone = () =>
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone)');

  /** The share functions of the browser, and the files that it shared */
  const stubShare = (share: () => Promise<void>, canShare = true) => {
    const shared: File[] = [];
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: navigator.userAgent,
      canShare: vi.fn(() => canShare),
      share: vi.fn((data: ShareData) => {
        shared.push(...(data.files ?? []));
        return share();
      }),
    });
    return shared;
  };

  /** The downloaded file names, and the revoke of the blob address */
  const catchDownload = () => {
    const revoke = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:file', revokeObjectURL: revoke });
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      names.push(this.download);
    });
    return { names, revoke };
  };

  it('downloads the file outside iOS, and revokes the address one second later', async () => {
    const shared = stubShare(() => Promise.resolve());
    const { names, revoke } = catchDownload();
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    await expect(saveFile(blob, 'chart.pdf')).resolves.toBe('downloaded');
    expect(names).toEqual(['chart.pdf']);
    expect(shared).toEqual([]);
    // Safari can cancel the download when the address goes at once
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith('blob:file');
  });

  it('opens the share sheet with the file on iOS', async () => {
    iPhone();
    const shared = stubShare(() => Promise.resolve());
    const { names } = catchDownload();
    await expect(saveFile(blob, 'chart.pdf')).resolves.toBe('shared');
    expect(shared.map(file => [file.name, file.type])).toEqual([['chart.pdf', 'application/pdf']]);
    expect(names).toEqual([]);
  });

  it('does nothing more when the user closes the share sheet', async () => {
    iPhone();
    stubShare(() => Promise.reject(new DOMException('Share canceled', 'AbortError')));
    const { names } = catchDownload();
    await expect(saveFile(blob, 'chart.pdf')).resolves.toBe('cancelled');
    expect(names).toEqual([]);
  });

  it('fails, with no download, when iOS refuses the share sheet', async () => {
    // A download can go missing in the Home Screen app, so the user gets the error message
    iPhone();
    stubShare(() => Promise.reject(new DOMException('No click', 'NotAllowedError')));
    const { names } = catchDownload();
    await expect(saveFile(blob, 'chart.pdf')).resolves.toBe('failed');
    expect(names).toEqual([]);
  });

  it('opens the share sheet in the click, with no wait before it', () => {
    iPhone();
    const shared = stubShare(() => Promise.resolve());
    catchDownload();
    void saveFile(blob, 'chart.pdf');
    expect(shared).toHaveLength(1);
  });

  it('downloads the file when iOS cannot share files', async () => {
    iPhone();
    const shared = stubShare(() => Promise.resolve(), false);
    const { names } = catchDownload();
    await expect(saveFile(blob, 'chart.pdf')).resolves.toBe('downloaded');
    expect(shared).toEqual([]);
    expect(names).toEqual(['chart.pdf']);
  });

  it('downloads the file on an iOS version without the share of files', async () => {
    iPhone();
    const { names } = catchDownload();
    await expect(saveFile(blob, 'chart.pdf')).resolves.toBe('downloaded');
    expect(names).toEqual(['chart.pdf']);
  });
});
