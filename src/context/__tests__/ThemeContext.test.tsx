import { render, renderHook, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { THEME_COLORS, ThemeProvider, useTheme } from '../ThemeContext';

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

describe('browser theme color', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.innerHTML =
      '<meta name="theme-color" content="#f8f6f1" media="(prefers-color-scheme: light)" />' +
      '<meta name="theme-color" content="#13171d" media="(prefers-color-scheme: dark)" />';
  });

  it('follows the theme of the app, also when it differs from the system', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    const contents = () =>
      [...document.querySelectorAll('meta[name="theme-color"]')].map(m =>
        m.getAttribute('content')
      );
    expect(contents()).toEqual([THEME_COLORS.light, THEME_COLORS.light]);
    fireEvent.click(screen.getByText('Toggle Theme'));
    expect(contents()).toEqual([THEME_COLORS.dark, THEME_COLORS.dark]);
  });
});

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

  it('keeps the same context value when the provider re-renders with the same theme', () => {
    const { result, rerender } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
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
