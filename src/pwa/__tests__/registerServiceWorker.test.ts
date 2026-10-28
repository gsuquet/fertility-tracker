import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SKIP_WAITING } from '../../sw/serviceWorker';

type Listener = () => void;

/** A fake worker: `setState` changes its state and calls its `statechange` listeners. */
const makeWorker = () => {
  const listeners: Listener[] = [];
  const worker = {
    state: 'installing',
    postMessage: vi.fn(),
    addEventListener: (_type: string, listener: Listener) => listeners.push(listener),
    setState(state: string) {
      worker.state = state;
      for (const listener of listeners) listener();
    },
  };
  return worker;
};

const makeRegistration = (waiting: ReturnType<typeof makeWorker> | null = null) => {
  const listeners: Listener[] = [];
  const registration = {
    waiting,
    installing: null as ReturnType<typeof makeWorker> | null,
    addEventListener: (_type: string, listener: Listener) => listeners.push(listener),
    /** A new worker starts to install. */
    find(worker: ReturnType<typeof makeWorker> | null) {
      registration.installing = worker;
      for (const listener of listeners) listener();
    },
  };
  return registration;
};

const register = vi.fn();
let controllerListeners: Listener[] = [];

const setServiceWorker = (controller: object | null) =>
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      register,
      controller,
      addEventListener: (_type: string, listener: Listener) => controllerListeners.push(listener),
    },
    configurable: true,
  });

const setSecureContext = (value: boolean) =>
  Object.defineProperty(window, 'isSecureContext', { value, configurable: true });

/** A fresh module for each test: the waiting worker is module state. */
const load = async () => {
  vi.resetModules();
  return import('../registerServiceWorker');
};

describe('registerServiceWorker', () => {
  beforeEach(() => {
    controllerListeners = [];
    register.mockReset().mockResolvedValue(makeRegistration());
    setServiceWorker({});
    setSecureContext(true);
    vi.stubEnv('PROD', true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, 'serviceWorker');
    Reflect.deleteProperty(window, 'isSecureContext');
  });

  it('registers the service worker next to the page in a secure production build', async () => {
    const { registerServiceWorker } = await load();
    await registerServiceWorker();
    expect(register).toHaveBeenCalledWith('./sw.js');
  });

  it('does not register in development', async () => {
    const { registerServiceWorker } = await load();
    vi.stubEnv('PROD', false);
    await registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
  });

  it('does not register in a context that is not secure', async () => {
    const { registerServiceWorker } = await load();
    setSecureContext(false);
    await registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing when the browser has no service workers', async () => {
    const { registerServiceWorker } = await load();
    Reflect.deleteProperty(navigator, 'serviceWorker');
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it('ignores a failed registration, because the app works without it', async () => {
    const { registerServiceWorker } = await load();
    register.mockRejectedValue(new Error('blocked'));
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });
});

describe('update of a new version', () => {
  beforeEach(() => {
    controllerListeners = [];
    setSecureContext(true);
    vi.stubEnv('PROD', true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, 'serviceWorker');
    Reflect.deleteProperty(window, 'isSecureContext');
  });

  it('finds a worker that already waits when the page has a controller', async () => {
    const { registerServiceWorker, useUpdateReady } = await load();
    register.mockResolvedValue(makeRegistration(makeWorker()));
    setServiceWorker({});
    const { result } = renderHook(() => useUpdateReady());
    expect(result.current).toBe(false);
    await act(registerServiceWorker);
    expect(result.current).toBe(true);
  });

  it('does not take the first install for an update', async () => {
    const { registerServiceWorker, useUpdateReady } = await load();
    const registration = makeRegistration(makeWorker());
    register.mockResolvedValue(registration);
    setServiceWorker(null);
    const { result } = renderHook(() => useUpdateReady());
    await act(registerServiceWorker);
    const worker = makeWorker();
    act(() => {
      registration.find(worker);
      worker.setState('installed');
    });
    expect(result.current).toBe(false);
  });

  it('finds a new worker when it is installed', async () => {
    const { registerServiceWorker, useUpdateReady } = await load();
    const registration = makeRegistration();
    register.mockResolvedValue(registration);
    setServiceWorker({});
    const { result } = renderHook(() => useUpdateReady());
    await act(registerServiceWorker);
    act(() => registration.find(null));
    const worker = makeWorker();
    act(() => registration.find(worker));
    expect(result.current).toBe(false);
    act(() => worker.setState('installed'));
    expect(result.current).toBe(true);
  });

  it('activates the waiting worker and reloads one time when it takes control', async () => {
    const { applyUpdate, registerServiceWorker, SKIP_WAITING_MESSAGE } = await load();
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload });
    const worker = makeWorker();
    register.mockResolvedValue(makeRegistration(worker));
    setServiceWorker({});
    await registerServiceWorker();
    applyUpdate();
    expect(worker.postMessage).toHaveBeenCalledWith(SKIP_WAITING);
    expect(SKIP_WAITING_MESSAGE).toBe(SKIP_WAITING);
    for (const listener of controllerListeners) listener();
    for (const listener of controllerListeners) listener();
    expect(reload).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });

  it('does nothing on Reload when no worker waits', async () => {
    const { applyUpdate } = await load();
    setServiceWorker({});
    applyUpdate();
    expect(controllerListeners).toHaveLength(0);
  });
});
