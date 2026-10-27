import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeProvider, useTheme } from '../ThemeContext';

const TestComponent = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button type="button" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

describe('ThemeContext Provider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('provides default light theme when no preference stored', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggles theme between light and dark and updates localStorage', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleBtn = screen.getByText('Toggle Theme');
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('fertility_care_theme')).toBe('dark');

    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('initializes from saved theme in localStorage', () => {
    localStorage.setItem('fertility_care_theme', 'dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('throws error when useTheme is used outside ThemeProvider', () => {
    const renderOutside = () => render(<TestComponent />);
    expect(renderOutside).toThrow('useTheme must be used within ThemeProvider');
  });

  it('follows the system dark preference when no theme is stored', () => {
    vi.mocked(window.matchMedia).mockReturnValueOnce({ matches: true } as MediaQueryList);
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
  });

  it('uses the light theme when matchMedia is not available', () => {
    const original = window.matchMedia;
    // @ts-expect-error simulate a browser without matchMedia
    window.matchMedia = undefined;
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    window.matchMedia = original;
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
  });
});
