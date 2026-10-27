import type { ComponentProps } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MobileNav } from '../MobileNav';
import { LanguageProvider } from '../../context/LanguageContext';
import { CycleProvider, useCycleUi } from '../../context/CycleContext';

const DrawerProbe = () => {
  const { isDrawerOpen } = useCycleUi();
  return <span data-testid="drawer">{isDrawerOpen ? 'open' : 'closed'}</span>;
};

const renderMobileNav = (props: ComponentProps<typeof MobileNav>) => {
  return render(
    <LanguageProvider>
      <CycleProvider>
        <MobileNav {...props} />
        <DrawerProbe />
      </CycleProvider>
    </LanguageProvider>
  );
};

describe('MobileNav Component (Phone Navigation)', () => {
  it('renders mobile navigation items including Today tab', () => {
    renderMobileNav({ activeTab: 'chart', setActiveTab: vi.fn() });
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Chart')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('triggers setActiveTab when mobile tab buttons are tapped', () => {
    const setActiveTab = vi.fn();
    renderMobileNav({ activeTab: 'chart', setActiveTab });

    fireEvent.click(screen.getByText('Today'));
    expect(setActiveTab).toHaveBeenCalledWith('today');

    fireEvent.click(screen.getByText('Calendar'));
    expect(setActiveTab).toHaveBeenCalledWith('calendar');
  });

  it('opens the observation drawer from the add button', () => {
    renderMobileNav({ activeTab: 'today', setActiveTab: vi.fn() });
    fireEvent.click(screen.getByRole('button', { name: 'Log' }));
    expect(screen.getByTestId('drawer')).toHaveTextContent('open');
  });

  it('switches to the chart and analytics tabs', () => {
    const setActiveTab = vi.fn();
    renderMobileNav({ activeTab: 'today', setActiveTab });
    fireEvent.click(screen.getByText('Chart'));
    fireEvent.click(screen.getByText('Analytics'));
    expect(setActiveTab.mock.calls).toEqual([['chart'], ['analytics']]);
  });
});
