import { act, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { CyclePicker } from '../CyclePicker';
import { renderWithProviders } from '../../test/render';
import { makeObservation } from '../../test/factories';
import { buildDemoObservations } from '../../domain/demoData';

const demo = buildDemoObservations('2026-09-30');
const pickerButton = () => screen.getByRole('button', { name: 'Filter cycle view' });
const openMenu = () => {
  fireEvent.click(pickerButton());
  return screen.getByRole('listbox');
};

const panel = () => document.querySelector('.cycle-dropdown-menu') as HTMLElement;

const setWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
};

describe('CyclePicker menu', () => {
  afterEach(() => setWidth(1024));

  it('renders nothing without cycles', () => {
    const { container } = renderWithProviders(<CyclePicker />);
    expect(container).toBeEmptyDOMElement();
  });

  it('labels the selected cycle and the combined view', () => {
    renderWithProviders(<CyclePicker />, { observations: demo });
    expect(pickerButton()).toHaveTextContent('Cycle 2 (2026-09-03)Cycle 2');
    fireEvent.click(within(openMenu()).getByRole('option', { name: /All Cycles/ }));
    expect(pickerButton()).toHaveTextContent('All Cycles (2)All (2)');
    expect(within(openMenu()).getByRole('option', { name: /All Cycles/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('lists each cycle with its day count and marks the selection', () => {
    renderWithProviders(<CyclePicker />, { observations: demo });
    const menu = openMenu();
    const current = within(menu).getByRole('option', { name: /Cycle 2/ });
    expect(current).toHaveAttribute('aria-selected', 'true');
    expect(current).toHaveTextContent('Current');
    expect(current).toHaveTextContent('28 days logged');

    fireEvent.click(within(menu).getByRole('option', { name: /Cycle 1/ }));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(pickerButton()).toHaveTextContent('Cycle 1 (2026-08-06)');
  });

  it('uses the singular for a cycle with one day', () => {
    renderWithProviders(<CyclePicker />, {
      observations: [makeObservation({ date: '2026-09-01', bleeding: 'H' })],
    });
    expect(within(openMenu()).getByRole('option', { name: /Cycle 1/ })).toHaveTextContent(
      '1 day logged'
    );
  });

  it('opens a modal dialog with the focus on the selected cycle', () => {
    renderWithProviders(<CyclePicker />, { observations: demo });
    expect(pickerButton()).toHaveAttribute('aria-haspopup', 'dialog');
    openMenu();
    const dialog = screen.getByRole('dialog', { name: 'Filter Cycle View' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('option', { name: /Cycle 2/ })).toHaveFocus();

    // The focus follows the selection the next time the menu opens
    fireEvent.click(within(dialog).getByRole('option', { name: /All Cycles/ }));
    expect(within(openMenu()).getByRole('option', { name: /All Cycles/ })).toHaveFocus();
  });

  it('closes from the close button, the backdrop and Escape', () => {
    renderWithProviders(<CyclePicker />, { observations: demo });
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Close cycle menu' }));
    expect(screen.queryByRole('listbox')).toBeNull();

    openMenu();
    fireEvent.click(document.querySelector('.cycle-dropdown-backdrop') as Element);
    expect(screen.queryByRole('listbox')).toBeNull();

    openMenu();
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes on Back', async () => {
    renderWithProviders(<CyclePicker />, { observations: demo });
    openMenu();
    // The menu adds its history entry after the render
    await act(async () => {});
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
  });

  it('stays open on a click in the menu', () => {
    renderWithProviders(<CyclePicker />, { observations: demo });
    openMenu();
    fireEvent.click(within(panel()).getByText('Filter Cycle View'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('places the menu under the button on desktop and follows it on scroll and resize', () => {
    renderWithProviders(<CyclePicker />, { observations: demo });
    openMenu();
    expect(panel().style.position).toBe('fixed');
    expect(panel().style.top).toBe('6px');

    setWidth(800);
    fireEvent.scroll(window);
    fireEvent(window, new Event('resize'));
    expect(panel().style.right).toBe('800px');
  });

  it('lets the stylesheet place the menu on mobile', () => {
    setWidth(400);
    renderWithProviders(<CyclePicker />, { observations: demo });
    openMenu();
    expect(panel().getAttribute('style')).toBeNull();
  });

  it('closes with a drag down on its handle on a phone', () => {
    setWidth(400);
    const media = vi.mocked(window.matchMedia);
    const original = media.getMockImplementation();
    // A phone that prefers reduced motion: the sheet closes at the release
    media.mockImplementation(query => ({ matches: true, media: query }) as MediaQueryList);
    // jsdom has no pointer capture
    const nativeCapture = Element.prototype.setPointerCapture;
    Element.prototype.setPointerCapture = vi.fn();
    try {
      renderWithProviders(<CyclePicker />, { observations: demo });
      openMenu();
      const handle = panel().querySelector('.sheet-handle') as HTMLElement;
      fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 100 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: 700 });
      fireEvent.pointerUp(handle, { pointerId: 1, clientY: 700 });
      expect(screen.queryByRole('listbox')).toBeNull();
    } finally {
      media.mockImplementation(original as (query: string) => MediaQueryList);
      Element.prototype.setPointerCapture = nativeCapture;
    }
  });
});
