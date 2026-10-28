import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearLaunchShortcut, readLaunchShortcut } from '../launchShortcut';

const visit = (path: string) => window.history.replaceState(null, '', path);

describe('launch shortcuts of the manifest', () => {
  afterEach(() => {
    visit('/');
    vi.restoreAllMocks();
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

  it('does not touch the history when the address has no shortcut', () => {
    visit('/?a=1');
    const replace = vi.spyOn(window.history, 'replaceState');
    clearLaunchShortcut();
    expect(replace).not.toHaveBeenCalled();
  });
});
