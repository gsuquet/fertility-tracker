import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../App';
import { STORAGE_HAS_SEEN_WELCOME_KEY } from '../../domain/versionTracker';

describe('App Root Component Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_HAS_SEEN_WELCOME_KEY, 'true');
  });

  it('renders app shell with header and default today view', () => {
    render(<App />);

    expect(screen.getAllByText(/Fertility Tracker/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Today's Observation/i)).toBeInTheDocument();
  });

  it('switches tabs between Today, Paper Chart, Calendar, and Analytics', async () => {
    render(<App />);

    // Switch to Paper Chart
    const chartTab = screen.getByRole('tab', { name: /Paper Chart Strip/i });
    fireEvent.click(chartTab);
    expect(screen.getByText(/Days 1 - 35/i)).toBeInTheDocument();

    // Switch to Monthly Calendar
    const calTab = screen.getByRole('tab', { name: /Monthly Calendar/i });
    fireEvent.click(calTab);
    expect(screen.getByRole('tab', { name: /Monthly Calendar/i })).toHaveClass('active');

    // Switch to Cycle Analytics
    const analyticsTab = screen.getByRole('tab', { name: /Cycle Analytics/i });
    fireEvent.click(analyticsTab);
    await waitFor(() => {
      expect(screen.getByText(/No Observations Logged/i)).toBeInTheDocument();
    });

    // Switch back to Today
    const todayTab = screen.getByRole('tab', { name: /Today/i });
    fireEvent.click(todayTab);
    expect(screen.getByText(/Today's Observation/i)).toBeInTheDocument();
  });

  it('opens and closes version modal from header', async () => {
    render(<App />);

    const versionBtns = screen.getAllByLabelText(/About & Version Tracker/i);
    fireEvent.click(versionBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const closeBtn = screen.getByLabelText(/Close/i);
    fireEvent.click(closeBtn);
  });
});
