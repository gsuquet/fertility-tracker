import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../Header';
import { useCycleUi } from '../../context/CycleContext';
import { renderWithProviders } from '../../test/render';
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
    onOpenSettings: vi.fn(),
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

describe('Header', () => {
  it('renders the brand and returns to Today from it', () => {
    const { setActiveTab } = renderHeader();
    expect(screen.getByText('Fertility Tracker')).toBeInTheDocument();
    const home = screen.getByRole('button', { name: 'Creighton FertilityCare System Home' });
    expect(home.querySelector('svg.brand-mark')).toBeInTheDocument();
    expect(home).not.toHaveTextContent('🌱');
    fireEvent.click(home);
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

  it('opens Settings from the gear, on each screen width', () => {
    const props = renderHeader();
    const gear = screen.getByRole('button', { name: 'Settings' });
    expect(gear).toHaveAttribute('title', 'Settings');
    fireEvent.click(gear);
    expect(props.onOpenSettings).toHaveBeenCalledOnce();
    // The phone menu is gone: Settings has its actions (RFC 0002)
    expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
  });
});
