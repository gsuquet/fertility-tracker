import { screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../Header';
import { useCycleUi } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { getAppVersion } from '../../domain/appVersion';
import type { ActiveTab } from '../../types/crms';

const SelectionProbe = () => {
  const { selectedObservation } = useCycleUi();
  return <span data-testid="selection">{selectedObservation?.date ?? 'none'}</span>;
};

const renderHeader = (
  options: Parameters<typeof renderWithProviders>[1] = {},
  activeTab: ActiveTab = 'chart'
) => {
  const props = {
    activeTab,
    setActiveTab: vi.fn(),
    onOpenExport: vi.fn(),
    onOpenVersion: vi.fn(),
    onOpenWelcome: vi.fn(),
  };
  renderWithProviders(
    <>
      <Header {...props} />
      <SelectionProbe />
    </>,
    options
  );
  return props;
};

const openSheet = () => {
  fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
  return screen.getByRole('dialog', { name: 'Mobile Navigation Menu' });
};

describe('Header', () => {
  it('renders the brand and returns to Today from it', () => {
    const { setActiveTab } = renderHeader();
    expect(screen.getByText('Fertility Tracker')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Creighton FertilityCare System Home' }));
    expect(setActiveTab).toHaveBeenCalledWith('today');
  });

  it('switches between all four tabs', () => {
    const { setActiveTab } = renderHeader();
    for (const name of ['Today', 'Paper Chart Strip', 'Monthly Calendar', 'Cycle Analytics']) {
      fireEvent.click(screen.getByRole('tab', { name }));
    }
    expect(setActiveTab.mock.calls).toEqual([['today'], ['chart'], ['calendar'], ['analytics']]);
    expect(screen.getByRole('tab', { name: 'Paper Chart Strip' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it.each([
    ['today', 'Today'],
    ['chart', 'Paper Chart Strip'],
    ['calendar', 'Monthly Calendar'],
    ['analytics', 'Cycle Analytics'],
  ] as const)('marks the %s tab as selected', (tab, name) => {
    renderHeader({}, tab);
    expect(screen.getByRole('tab', { name })).toHaveClass('active');
    expect(screen.getAllByRole('tab', { selected: true })).toHaveLength(1);
  });

  it('clears the selection and opens Today for a new entry', () => {
    const { setActiveTab } = renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Log Observation' }));
    expect(setActiveTab).toHaveBeenCalledWith('today');
    expect(screen.getByTestId('selection')).toHaveTextContent('none');
  });

  it('opens the export, guide and version dialogs from the desktop buttons', () => {
    const props = renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Practitioner PDF / PNG' }));
    fireEvent.click(screen.getByRole('button', { name: 'Welcome to Fertility Tracker' }));
    fireEvent.click(screen.getByRole('button', { name: 'About & Version Tracker' }));
    expect(props.onOpenExport).toHaveBeenCalledOnce();
    expect(props.onOpenWelcome).toHaveBeenCalledOnce();
    expect(props.onOpenVersion).toHaveBeenCalledOnce();
  });

  it('toggles the language in both directions', () => {
    renderHeader();
    const langBtn = screen.getByRole('button', { name: 'Switch Language' });
    fireEvent.click(langBtn);
    expect(langBtn).toHaveTextContent('FR');
    fireEvent.click(langBtn);
    expect(langBtn).toHaveTextContent('EN');
  });

  it('toggles the theme from the desktop button', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Dark/Light Mode' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Dark/Light Mode' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('runs each sheet action and closes the sheet', () => {
    const props = renderHeader();
    for (const [label, handler] of [
      ['Print or export PDF / JSON charts', props.onOpenExport],
      ['Interactive guide & biomarker chart tutorial', props.onOpenWelcome],
      ['Release notes & system storage diagnostics', props.onOpenVersion],
    ] as const) {
      fireEvent.click(within(openSheet()).getByText(label));
      expect(handler).toHaveBeenCalledOnce();
      expect(screen.queryByRole('dialog')).toBeNull();
    }
  });

  it('shows the app version in the sheet', () => {
    renderHeader();
    expect(within(openSheet()).getByText(`v${getAppVersion()}`)).toBeInTheDocument();
  });

  it('toggles language and theme from the sheet', () => {
    renderHeader();
    const sheet = openSheet();
    fireEvent.click(within(sheet).getByText('Theme : Light'));
    expect(within(sheet).getByText('Theme : Dark')).toBeInTheDocument();
    fireEvent.click(within(sheet).getByText('Language : English'));
    expect(within(sheet).getByText('Langue : Français')).toBeInTheDocument();
    expect(within(sheet).getByText('Thème : Sombre')).toBeInTheDocument();
    fireEvent.click(within(sheet).getByText('Langue : Français'));
    expect(within(sheet).getByText('Language : English')).toBeInTheDocument();
  });

  it('closes the sheet with the close button, the overlay and Escape', () => {
    renderHeader();
    fireEvent.click(within(openSheet()).getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(openSheet());
    expect(screen.queryByRole('dialog')).toBeNull();

    openSheet();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the sheet as a native modal dialog and gives the focus back to More actions', () => {
    renderHeader();
    const more = screen.getByRole('button', { name: 'More actions' });
    more.focus();
    const sheet = openSheet();
    expect(sheet.tagName).toBe('DIALOG');
    expect(sheet).toHaveAttribute('aria-modal', 'true');
    expect(within(sheet).getByRole('button', { name: 'Close menu' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(more).toHaveFocus();
  });

  it('keeps the sheet open when the sheet body is clicked', () => {
    renderHeader({ observations: [makeObservation({ date: '2026-09-01' })] });
    fireEvent.click(within(openSheet()).getByText('Menu & Options'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
