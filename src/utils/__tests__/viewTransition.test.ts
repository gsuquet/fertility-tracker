import { afterEach, describe, expect, it, vi } from 'vitest';
import { runViewTransition } from '../viewTransition';

type Start = (update: () => void) => {
  ready: Promise<void>;
  finished: Promise<void>;
};

/** A fake View Transitions API. Each transition ends when the test resolves it. */
const installApi = (skip = false) => {
  const ends: (() => void)[] = [];
  const start = vi.fn<Start>(update => {
    update();
    const finished = new Promise<void>(resolve => ends.push(resolve));
    return { ready: skip ? Promise.reject(new Error('skipped')) : Promise.resolve(), finished };
  });
  Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true });
  return { start, ends };
};

const direction = () => document.documentElement.dataset.pageTransition;

afterEach(() => {
  Reflect.deleteProperty(document, 'startViewTransition');
  delete document.documentElement.dataset.pageTransition;
});

describe('runViewTransition', () => {
  it('runs the update at once when the browser has no View Transitions API', () => {
    const update = vi.fn();
    runViewTransition(update, 'forward');
    expect(update).toHaveBeenCalledOnce();
    expect(direction()).toBeUndefined();
  });

  it('runs the update at once when the user prefers reduced motion', () => {
    const { start } = installApi();
    const original = vi.mocked(window.matchMedia).getMockImplementation();
    vi.mocked(window.matchMedia).mockImplementation(
      query => ({ matches: true, media: query }) as MediaQueryList
    );
    try {
      const update = vi.fn();
      runViewTransition(update, 'forward');
      expect(update).toHaveBeenCalledOnce();
      expect(start).not.toHaveBeenCalled();
    } finally {
      vi.mocked(window.matchMedia).mockImplementation(original as typeof window.matchMedia);
    }
  });

  it('runs the update in a transition and keeps the direction until it ends', async () => {
    const { start, ends } = installApi();
    const update = vi.fn();
    runViewTransition(update, 'back');
    expect(start).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
    expect(direction()).toBe('back');
    ends[0]?.();
    await vi.waitFor(() => expect(direction()).toBeUndefined());
  });

  it('keeps the direction of a newer transition when an older one ends', async () => {
    const { ends } = installApi();
    runViewTransition(vi.fn(), 'forward');
    runViewTransition(vi.fn(), 'back');
    ends[0]?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(direction()).toBe('back');
    ends[1]?.();
    await vi.waitFor(() => expect(direction()).toBeUndefined());
  });

  it('ignores a skipped transition', async () => {
    const { ends } = installApi(true);
    const update = vi.fn();
    runViewTransition(update, 'forward');
    expect(update).toHaveBeenCalledOnce();
    ends[0]?.();
    await vi.waitFor(() => expect(direction()).toBeUndefined());
  });
});
