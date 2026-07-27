import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MobileNav } from '../MobileNav';
import { LanguageProvider } from '../../context/LanguageContext';
import { CycleProvider } from '../../context/CycleContext';

const renderMobileNav = (props: any) => {
  return render(
    <LanguageProvider>
      <CycleProvider>
        <MobileNav {...props} />
      </CycleProvider>
    </LanguageProvider>
  );
};

describe('MobileNav Component (Phone Navigation)', () => {
  it('renders mobile navigation items and center floating action button', () => {
    renderMobileNav({ activeTab: 'chart', setActiveTab: vi.fn() });
    expect(screen.getByText('Paper Chart Strip')).toBeInTheDocument();
    expect(screen.getByText('Monthly Calendar')).toBeInTheDocument();
    expect(screen.getByText('Cycle Analytics')).toBeInTheDocument();
  });

  it('triggers setActiveTab when mobile tab buttons are tapped', () => {
    const setActiveTab = vi.fn();
    renderMobileNav({ activeTab: 'chart', setActiveTab });

    fireEvent.click(screen.getByText('Monthly Calendar'));
    expect(setActiveTab).toHaveBeenCalledWith('calendar');
  });

  it('triggers mobile FAB (+) button to open observation drawer', () => {
    renderMobileNav({ activeTab: 'chart', setActiveTab: vi.fn() });
    const fab = screen.getByTitle('Log Observation');
    expect(fab).toBeInTheDocument();
    fireEvent.click(fab);
  });
});
