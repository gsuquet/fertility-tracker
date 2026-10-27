import { afterEach, describe, expect, it, vi } from 'vitest';
import { whenIdle } from '../whenIdle';

describe('whenIdle', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('uses requestIdleCallback when the browser has it, and cancels it', () => {
    const requestIdleCallback = vi.fn(() => 7);
    const cancelIdleCallback = vi.fn();
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);
    vi.stubGlobal('cancelIdleCallback', cancelIdleCallback);
    const callback = vi.fn();

    const cancel = whenIdle(callback);
    // On a page that is always busy, the call still occurs after 2 seconds
    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 });
    const [idleCallback] = requestIdleCallback.mock.calls[0] as unknown as [() => void];
    idleCallback();
    expect(callback).toHaveBeenCalledOnce();

    cancel();
    expect(cancelIdleCallback).toHaveBeenCalledWith(7);
  });

  it('falls back to a timer in a browser without requestIdleCallback', () => {
    // Fake only the timers: fake timers can also install a requestIdleCallback
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.stubGlobal('requestIdleCallback', undefined);
    const callback = vi.fn();

    whenIdle(callback);
    expect(callback).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(callback).toHaveBeenCalledOnce();

    const cancelled = vi.fn();
    const cancel = whenIdle(cancelled);
    cancel();
    vi.runAllTimers();
    expect(cancelled).not.toHaveBeenCalled();
  });
});
