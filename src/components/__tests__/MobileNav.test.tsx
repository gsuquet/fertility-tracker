import type { ComponentProps } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MobileNav } from '../MobileNav';
import { ObservationDrawer } from '../ObservationDrawer';
import { en } from '../../i18n';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { getTodayStr } from '../../utils/dateUtils';
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

  it.each([
    ['opens the saved observation of today', true, en.drawer.editTitle, '10KL'],
    ['opens an empty form when today has no observation', false, en.actions.newEntry, ''],
  ])('%s from the add button', (_, logged, title, code) => {
    const today = makeObservation({
      date: getTodayStr(),
      stretch: '10',
      modifiers: ['K', 'L'],
      codeString: '10KL',
    });
    renderWithProviders(
      <>
        <MobileNav activeTab="today" setActiveTab={vi.fn()} />
        <ObservationDrawer />
      </>,
      { observations: logged ? [today] : [] }
    );
    fireEvent.click(screen.getByRole('button', { name: en.mobileTabs.log }));
    const drawer = screen.getByRole('dialog', { name: title });
    expect(within(drawer).getByLabelText(en.labels.directInput)).toHaveValue(code);
  });

  it('switches to the chart and analytics tabs', () => {
    const setActiveTab = vi.fn();
    renderMobileNav({ activeTab: 'today', setActiveTab });
    fireEvent.click(screen.getByText('Chart'));
    fireEvent.click(screen.getByText('Analytics'));
    expect(setActiveTab.mock.calls).toEqual([['chart'], ['analytics']]);
  });
});
