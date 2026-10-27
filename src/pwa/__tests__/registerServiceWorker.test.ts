import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '../registerServiceWorker';

const register = vi.fn();

const setSecureContext = (value: boolean) =>
  Object.defineProperty(window, 'isSecureContext', { value, configurable: true });

describe('registerServiceWorker', () => {
  beforeEach(() => {
    register.mockReset().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
    setSecureContext(true);
    vi.stubEnv('PROD', true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, 'serviceWorker');
    Reflect.deleteProperty(window, 'isSecureContext');
  });

  it('registers the service worker next to the page in a secure production build', async () => {
    await registerServiceWorker();
    expect(register).toHaveBeenCalledWith('./sw.js');
  });

  it('does not register in development', async () => {
    vi.stubEnv('PROD', false);
    await registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
  });

  it('does not register in a context that is not secure', async () => {
    setSecureContext(false);
    await registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing when the browser has no service workers', async () => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it('ignores a failed registration, because the app works without it', async () => {
    register.mockRejectedValue(new Error('blocked'));
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });
});
