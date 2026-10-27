import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from '../utils/storageKeys';

// Records each lazy chunk that the app imports
const loaded = vi.hoisted(() => new Set<string>());

vi.mock('../components/CycleAnalyticsView', async importOriginal => {
  loaded.add('CycleAnalyticsView');
  return importOriginal();
});
vi.mock('../components/ExportModal', async importOriginal => {
  loaded.add('ExportModal');
  return importOriginal();
});
vi.mock('../components/VersionModal', async importOriginal => {
  loaded.add('VersionModal');
  return importOriginal();
});
vi.mock('../components/WelcomeModal', async importOriginal => {
  loaded.add('WelcomeModal');
  return importOriginal();
});

describe('App chunk preload', () => {
  it('imports the lazy pages and dialogs when the browser is idle, without opening them', async () => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    render(<App />);
    expect(loaded.size).toBe(0);

    await vi.waitFor(
      () =>
        expect([...loaded].sort()).toEqual([
          'CycleAnalyticsView',
          'ExportModal',
          'VersionModal',
          'WelcomeModal',
        ]),
      { timeout: 5000 }
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
