import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageProvider, useLanguage } from '../LanguageContext';

const TestComponent = () => {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="current-lang">{language}</span>
      <span data-testid="app-title">{t.appTitle}</span>
      <span data-testid="today-tab">{t.tabs.today}</span>
      <button onClick={() => setLanguage('fr')}>Switch to FR</button>
      <button onClick={() => setLanguage('en')}>Switch to EN</button>
    </div>
  );
};

describe('LanguageContext Provider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides default English translations when no saved language exists', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId('current-lang')).toHaveTextContent('en');
    expect(screen.getByTestId('today-tab')).toHaveTextContent('Today');
  });

  it('switches language and persists preference to localStorage', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    const frBtn = screen.getByText('Switch to FR');
    fireEvent.click(frBtn);

    expect(screen.getByTestId('current-lang')).toHaveTextContent('fr');
    expect(screen.getByTestId('today-tab')).toHaveTextContent("Aujourd'hui");
    expect(localStorage.getItem('fertility_care_lang')).toBe('fr');

    const enBtn = screen.getByText('Switch to EN');
    fireEvent.click(enBtn);
    expect(screen.getByTestId('current-lang')).toHaveTextContent('en');
    expect(screen.getByTestId('today-tab')).toHaveTextContent('Today');
    expect(localStorage.getItem('fertility_care_lang')).toBe('en');
  });

  it('restores language saved in localStorage on initialization', () => {
    localStorage.setItem('fertility_care_lang', 'fr');

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId('current-lang')).toHaveTextContent('fr');
    expect(screen.getByTestId('today-tab')).toHaveTextContent("Aujourd'hui");
  });

  it('throws error when useLanguage is used outside LanguageProvider', () => {
    const renderOutside = () => render(<TestComponent />);
    expect(renderOutside).toThrow('useLanguage must be used within LanguageProvider');
  });
});
