import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SwipeDirection } from '../../domain/swipe';
import { useDaySwipe } from '../useDaySwipe';

/** A page like Today: a container with the handlers, and content that follows the finger. */
const Page = ({
  onSwipe,
  onClick,
}: {
  onSwipe: (d: SwipeDirection) => void;
  onClick?: () => void;
}) => {
  const { handlers, contentRef } = useDaySwipe(onSwipe);
  return (
    <div data-testid="page" {...handlers}>
      <div data-testid="content" ref={contentRef}>
        <button type="button" onClick={onClick}>
          code
        </button>
        <input aria-label="notes" />
        <div data-testid="row" style={{ overflowX: 'auto' }}>
          <span data-testid="chip">chip</span>
        </div>
      </div>
    </div>
  );
};

const content = () => screen.getByTestId('content');

const setReducedMotion = (reduced: boolean) => {
  vi.mocked(window.matchMedia).mockImplementation(
    query => ({ matches: reduced, media: query }) as MediaQueryList
  );
};

/** A finger that goes down at (x, y), moves by steps to (x + dx, y + dy) in `ms`, then lifts. */
const swipe = (
  dx: number,
  { dy = 0, ms = 300, x = 200, target = 'page', type = 'touch', id = 1 } = {}
) => {
  const element = screen.getByTestId(target);
  fireEvent.pointerDown(element, { pointerId: id, pointerType: type, clientX: x, clientY: 300 });
  for (const part of [0.5, 1]) {
    vi.advanceTimersByTime(ms / 2);
    fireEvent.pointerMove(element, {
      pointerId: id,
      clientX: x + dx * part,
      clientY: 300 + dy * part,
    });
  }
  fireEvent.pointerUp(element, { pointerId: id, clientX: x + dx, clientY: 300 + dy });
};

const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  setReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useDaySwipe', () => {
  it('follows the finger, slides out to the left, opens the next day and slides in', async () => {
    const onSwipe = vi.fn();
    render(<Page onSwipe={onSwipe} />);
    const page = screen.getByTestId('page');
    fireEvent.pointerDown(page, { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 300 });
    fireEvent.pointerMove(page, { pointerId: 1, clientX: 200, clientY: 305 });
    expect(content().style.transform).toBe('translateX(-40px)');
    fireEvent.pointerUp(page, { pointerId: 1, clientX: 200, clientY: 305 });
    expect(content().style.transform).toBe('translateX(-30%)');
    expect(content().style.opacity).toBe('0');
    expect(onSwipe).not.toHaveBeenCalled();
    await wait(150);
    expect(onSwipe).toHaveBeenCalledWith('next');
    expect(content().style.transform).toBe('');
    expect(content().style.opacity).toBe('');
    expect(content().style.transition).toContain('150ms');
  });

  it('opens the previous day after a fast flick to the right with a pen', async () => {
    const onSwipe = vi.fn();
    render(<Page onSwipe={onSwipe} />);
    swipe(40, { ms: 40, type: 'pen' });
    expect(content().style.transform).toBe('translateX(30%)');
    await wait(150);
    expect(onSwipe).toHaveBeenCalledWith('prev');
  });

  it('puts the content back after a short slow swipe or a cancelled pointer', async () => {
    const onSwipe = vi.fn();
    render(<Page onSwipe={onSwipe} />);
    swipe(-50);
    expect(content().style.transform).toBe('');
    const page = screen.getByTestId('page');
    fireEvent.pointerDown(page, { pointerId: 2, pointerType: 'touch', clientX: 300, clientY: 300 });
    fireEvent.pointerMove(page, { pointerId: 2, clientX: 100, clientY: 300 });
    fireEvent.pointerCancel(page, { pointerId: 2 });
    expect(content().style.transform).toBe('');
    await wait(500);
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('changes the day at once with no movement when the user prefers reduced motion', () => {
    setReducedMotion(true);
    const onSwipe = vi.fn();
    render(<Page onSwipe={onSwipe} />);
    swipe(-100);
    expect(onSwipe).toHaveBeenCalledWith('next');
    expect(content().style.transform).toBe('');
    swipe(30);
    expect(onSwipe).toHaveBeenCalledOnce();
  });

  it('leaves a vertical drag to the scroll, and a tap without a move to the button', () => {
    const onSwipe = vi.fn();
    const onClick = vi.fn();
    render(<Page onSwipe={onSwipe} onClick={onClick} />);
    swipe(-100, { dy: 200 });
    expect(content().style.transform).toBe('');
    // A further horizontal move does not start a swipe of the same gesture
    fireEvent.pointerMove(screen.getByTestId('page'), { pointerId: 1, clientX: 0, clientY: 300 });
    expect(content().style.transform).toBe('');

    const button = screen.getByRole('button');
    fireEvent.pointerDown(button, {
      pointerId: 3,
      pointerType: 'touch',
      clientX: 200,
      clientY: 300,
    });
    fireEvent.pointerMove(button, { pointerId: 3, clientX: 203, clientY: 302 });
    fireEvent.pointerUp(button, { pointerId: 3, clientX: 203, clientY: 302 });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('blocks the click that ends a swipe on a button, and not a later click', async () => {
    const onClick = vi.fn();
    render(<Page onSwipe={vi.fn()} onClick={onClick} />);
    swipe(-100, { target: 'content' });
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
    await wait(500);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('ignores a mouse, the screen edges, fields and rows that scroll horizontally', async () => {
    const onSwipe = vi.fn();
    render(<Page onSwipe={onSwipe} />);
    swipe(-100, { type: 'mouse' });
    swipe(100, { x: 10 });
    swipe(-100, { x: window.innerWidth - 10 });
    // A swipe on the content still counts
    swipe(-100, { target: 'content', id: 9 });
    await wait(500);
    expect(onSwipe).toHaveBeenCalledOnce();
    onSwipe.mockClear();

    const input = screen.getByRole('textbox');
    fireEvent.pointerDown(input, {
      pointerId: 4,
      pointerType: 'touch',
      clientX: 200,
      clientY: 300,
    });
    fireEvent.pointerMove(input, { pointerId: 4, clientX: 50, clientY: 300 });
    fireEvent.pointerUp(input, { pointerId: 4, clientX: 50, clientY: 300 });

    const row = screen.getByTestId('row');
    Object.defineProperty(row, 'scrollWidth', { value: 500 });
    Object.defineProperty(row, 'clientWidth', { value: 300 });
    swipe(-100, { target: 'chip', id: 5 });
    await wait(500);
    expect(onSwipe).not.toHaveBeenCalled();
    expect(content().style.transform).toBe('');
  });

  it('follows one finger at a time', async () => {
    const onSwipe = vi.fn();
    render(<Page onSwipe={onSwipe} />);
    const page = screen.getByTestId('page');
    fireEvent.pointerDown(page, { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 300 });
    fireEvent.pointerDown(page, { pointerId: 2, pointerType: 'touch', clientX: 300, clientY: 300 });
    fireEvent.pointerMove(page, { pointerId: 2, clientX: 100, clientY: 300 });
    fireEvent.pointerUp(page, { pointerId: 2, clientX: 100, clientY: 300 });
    expect(content().style.transform).toBe('');
    fireEvent.pointerMove(page, { pointerId: 1, clientX: 304, clientY: 300 });
    fireEvent.pointerUp(page, { pointerId: 1, clientX: 304, clientY: 300 });
    await wait(500);
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('does not change the day after the page unmounts during the slide', async () => {
    const onSwipe = vi.fn();
    const { unmount } = render(<Page onSwipe={onSwipe} />);
    swipe(-100);
    unmount();
    await wait(500);
    expect(onSwipe).not.toHaveBeenCalled();
  });
});
