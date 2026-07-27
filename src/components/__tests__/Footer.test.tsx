import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Footer } from '../Footer';
import { LanguageProvider } from '../../context/LanguageContext';

describe('Footer Component', () => {
  it('renders trademark and medical disclaimers', () => {
    render(
      <LanguageProvider>
        <Footer />
      </LanguageProvider>
    );

    expect(screen.getByText(/Saint Paul VI Institute/i)).toBeInTheDocument();
    expect(screen.getByText(/Fertility Tracker is an independent open-source/i)).toBeInTheDocument();
    expect(screen.getByText(/medical advice, diagnosis, or treatment/i)).toBeInTheDocument();
  });
});
