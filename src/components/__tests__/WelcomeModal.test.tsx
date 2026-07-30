import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WelcomeModal } from '../WelcomeModal';
import { LanguageProvider } from '../../context/LanguageContext';
import { CycleProvider } from '../../context/CycleContext';

describe('WelcomeModal Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <LanguageProvider>
        <CycleProvider>
          <WelcomeModal isOpen={false} onClose={() => {}} />
        </CycleProvider>
      </LanguageProvider>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders slide 1 title and step indicators when isOpen is true', () => {
    render(
      <LanguageProvider>
        <CycleProvider>
          <WelcomeModal isOpen={true} onClose={() => {}} />
        </CycleProvider>
      </LanguageProvider>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to Fertility Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Clinical Charting, Privacy First/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
  });

  it('navigates through slides when Next and Previous buttons are clicked', () => {
    render(
      <LanguageProvider>
        <CycleProvider>
          <WelcomeModal isOpen={true} onClose={() => {}} />
        </CycleProvider>
      </LanguageProvider>
    );

    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText(/Understanding Chart Stamps/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: /Previous/i });
    fireEvent.click(prevBtn);

    expect(screen.getByText(/Clinical Charting, Privacy First/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
  });

  it('navigates directly to a step when step dot is clicked', () => {
    render(
      <LanguageProvider>
        <CycleProvider>
          <WelcomeModal isOpen={true} onClose={() => {}} />
        </CycleProvider>
      </LanguageProvider>
    );

    const step3Dot = screen.getByTitle('Go to step 3');
    fireEvent.click(step3Dot);

    expect(screen.getByText(/How to Log Observations/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 3 of 4/i)).toBeInTheDocument();
  });

  it('calls onClose and sets localStorage when close or Skip is clicked', () => {
    const handleClose = vi.fn();
    render(
      <LanguageProvider>
        <CycleProvider>
          <WelcomeModal isOpen={true} onClose={handleClose} />
        </CycleProvider>
      </LanguageProvider>
    );

    const skipBtn = screen.getByRole('button', { name: /Skip Tour/i });
    fireEvent.click(skipBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('fertility_tracker_has_seen_welcome')).toBe('true');
  });

  it('renders quick start buttons on slide 4', () => {
    render(
      <LanguageProvider>
        <CycleProvider>
          <WelcomeModal isOpen={true} onClose={() => {}} />
        </CycleProvider>
      </LanguageProvider>
    );

    const step4Dot = screen.getByTitle('Go to step 4');
    fireEvent.click(step4Dot);

    expect(screen.getByText(/Explore Demo Data/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Fresh/i)).toBeInTheDocument();
  });
});
