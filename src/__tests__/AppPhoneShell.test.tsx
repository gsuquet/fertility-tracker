import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { PHONE_QUERY } from '../components/shell/TopBar';
import { STORAGE_HAS_SEEN_WELCOME_KEY, STORAGE_OBSERVATIONS_KEY } from '../utils/storageKeys';
import { makeObservation } from '../test/factories';
import { formatDateDisplay, getTodayStr } from '../utils/dateUtils';
import { en } from '../i18n';

const banner = () => within(screen.getByRole('banner'));
const bottomNav = () => within(screen.getByRole('navigation', { name: en.mobileTabs.navLabel }));

describe('App on a phone', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
    localStorage.setItem(
      STORAGE_OBSERVATIONS_KEY,
      JSON.stringify([makeObservation({ date: getTodayStr(), bleeding: 'H', codeString: 'H' })])
    );
    vi.mocked(window.matchMedia).mockImplementation(
      query =>
        ({
          matches: query === PHONE_QUERY,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('puts the short date and the day buttons of Today in the top bar', () => {
    render(<App />);
    expect(banner().getByRole('button', { name: en.todayView.prevDay })).toBeInTheDocument();
    expect(banner().getByRole('button', { name: en.todayView.nextDay })).toBeInTheDocument();
    const date = formatDateDisplay(getTodayStr(), en.locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    expect(banner().getByText(date)).toBeInTheDocument();
    // The h1 of Today is for screen readers only
    expect(screen.getByRole('heading', { level: 1, name: en.tabs.today })).toHaveClass('sr-only');
    expect(bottomNav().getByRole('button', { name: en.mobileTabs.today })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('puts the chart controls and the title of the other pages in the top bar', () => {
    render(<App />);
    fireEvent.click(bottomNav().getByRole('button', { name: en.mobileTabs.chart }));
    expect(banner().getByRole('group', { name: en.chartStrip.viewLabel })).toBeInTheDocument();
    expect(banner().getByRole('button', { name: en.chartStrip.optionsLabel })).toBeInTheDocument();
    expect(bottomNav().getByRole('button', { name: en.mobileTabs.chart })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(bottomNav().getByRole('button', { name: en.mobileTabs.today })).not.toHaveAttribute(
      'aria-current'
    );

    fireEvent.click(bottomNav().getByRole('button', { name: en.mobileTabs.calendar }));
    expect(banner().getByRole('heading', { level: 1, name: en.mobileTabs.calendar })).toBeVisible();
    // The page has one h1: the print report is hidden on a screen
    expect(within(screen.getByRole('main')).queryByRole('heading', { level: 1 })).toBeNull();
  });
});
