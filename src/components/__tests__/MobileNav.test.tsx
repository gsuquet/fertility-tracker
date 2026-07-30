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
});
