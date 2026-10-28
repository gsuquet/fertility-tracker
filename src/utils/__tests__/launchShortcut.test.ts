import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearLaunchShortcut, listenForLaunches, readLaunchShortcut } from '../launchShortcut';

const visit = (path: string) => window.history.replaceState(null, '', path);

type Consumer = (params: { targetURL?: string; files?: { getFile(): Promise<File> }[] }) => void;

/** Stubs the launch queue of Chromium and gives its consumer. */
const stubLaunchQueue = () => {
  let consumer: Consumer | undefined;
  Object.defineProperty(window, 'launchQueue', {
    configurable: true,
    value: { setConsumer: (fn: Consumer) => (consumer = fn) },
  });
  return (params: Parameters<Consumer>[0]) => consumer?.(params);
};

describe('launch shortcuts of the manifest', () => {
  afterEach(() => {
    visit('/');
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'launchQueue');
  });

  it.each([
    ['/?shortcut=log', 'log'],
    ['/?shortcut=chart', 'chart'],
  ])('reads %s', (path, shortcut) => {
    visit(path);
    expect(readLaunchShortcut()).toBe(shortcut);
  });

  it.each([['/'], ['/?shortcut=delete'], ['/?shortcut='], ['/?other=log']])('ignores %s', path => {
    visit(path);
    expect(readLaunchShortcut()).toBeNull();
  });

  it('does not change the address when it reads', () => {
    visit('/?shortcut=log');
    readLaunchShortcut();
    expect(window.location.search).toBe('?shortcut=log');
  });

  it('removes only the shortcut parameter and keeps the rest of the address', () => {
    visit('/app/?a=1&shortcut=chart&b=2#notes');
    clearLaunchShortcut();
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(
      '/app/?a=1&b=2#notes'
    );
  });

  it('removes the question mark when the shortcut was the only parameter', () => {
    visit('/?shortcut=log');
    clearLaunchShortcut();
    expect(window.location.href).toBe(`${window.location.origin}/`);
  });

  it('gives each later launch of the open window to the callback', () => {
    const consumer = stubLaunchQueue();
    const onShortcut = vi.fn();
    listenForLaunches(onShortcut, vi.fn());
    consumer({ targetURL: 'https://example.com/?shortcut=chart' });
    consumer({ targetURL: 'https://example.com/?shortcut=other' });
    consumer({ targetURL: 'https://example.com/' });
    consumer({});
    expect(onShortcut.mock.calls).toEqual([['chart']]);
  });

  it('gives the text of the first file that the user opened with the app', async () => {
    const consumer = stubLaunchQueue();
    const onShortcut = vi.fn();
    const onBackupFile = vi.fn();
    listenForLaunches(onShortcut, onBackupFile);
    const handle = (text: string) => ({ getFile: async () => new File([text], 'b.ftbackup') });
    consumer({
      targetURL: 'https://example.com/?restore=file',
      files: [handle('[1]'), handle('[2]')],
    });
    await vi.waitFor(() => expect(onBackupFile).toHaveBeenCalledWith('[1]'));
    // A file that the app cannot read gives an empty text, so the import error shows
    consumer({ files: [{ getFile: () => Promise.reject(new Error('gone')) }] });
    await vi.waitFor(() => expect(onBackupFile).toHaveBeenLastCalledWith(''));
    // A launch with an empty list of files is not a file launch
    consumer({ targetURL: 'https://example.com/?shortcut=log', files: [] });
    expect(onBackupFile).toHaveBeenCalledTimes(2);
    expect(onShortcut.mock.calls).toEqual([['log']]);
  });

  it('removes the restore parameter of a file launch', () => {
    visit('/?restore=file#today');
    clearLaunchShortcut();
    expect(`${window.location.search}${window.location.hash}`).toBe('#today');
  });

  it('does nothing in a browser without a launch queue', () => {
    const onShortcut = vi.fn();
    expect(() => listenForLaunches(onShortcut, vi.fn())).not.toThrow();
    expect(onShortcut).not.toHaveBeenCalled();
  });

  it('does not touch the history when the address has no shortcut', () => {
    visit('/?a=1');
    const replace = vi.spyOn(window.history, 'replaceState');
    clearLaunchShortcut();
    expect(replace).not.toHaveBeenCalled();
  });
});
