import { screen, fireEvent, within } from '@testing-library/react';
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
    const log = screen.getByRole('button', { name: 'Log' });
    expect(log).toHaveAttribute('title', 'Log Observation (N)');
    fireEvent.click(log);
    expect(setActiveTab).toHaveBeenCalledWith('today');
    expect(screen.getByTestId('selection')).toHaveTextContent('none');
  });

  it('shows the short tab names and keeps the full names as the accessible names', () => {
    renderHeader();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(tab => tab.textContent)).toEqual(['Today', 'Chart', 'Calendar', 'Analytics']);
    // Label in name: each full name contains the visible short name
    for (const tab of tabs) {
      expect(tab.getAttribute('aria-label')).toContain(tab.textContent);
    }
    expect(screen.queryByText('Creighton Model System (CrMS)')).toBeNull();
  });

  it('has no buttons other than the brand, Log and the gear (RFC 0002)', () => {
    renderHeader();
    // The tabs have the role tab. With no cycles, the cycle picker does not show.
    expect(
      within(screen.getByRole('banner'))
        .getAllByRole('button')
        .map(button => button.getAttribute('aria-label') ?? button.textContent)
    ).toEqual(['Creighton FertilityCare System Home', 'Log', 'Settings']);
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
