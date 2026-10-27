import { describe, it, expect, vi, beforeEach } from 'vitest';

const render = vi.fn();
vi.mock('react-dom/client', () => ({ default: { createRoot: vi.fn(() => ({ render })) } }));
vi.mock('../App', () => ({ default: () => null }));
const registerServiceWorker = vi.fn();
vi.mock('../pwa/registerServiceWorker', () => ({ registerServiceWorker }));

describe('main entry point', () => {
  beforeEach(() => {
    vi.resetModules();
    render.mockClear();
    registerServiceWorker.mockClear();
    document.body.innerHTML = '';
  });

  it('renders the app into #root', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import('../main');
    expect(render).toHaveBeenCalledOnce();
  });

  it('registers the service worker from the bundle, not from an inline script', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import('../main');
    expect(registerServiceWorker).toHaveBeenCalledOnce();
  });

  it('throws when #root is missing', async () => {
    await expect(import('../main')).rejects.toThrow('Root element #root not found');
  });
});
