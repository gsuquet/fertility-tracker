import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSheetDrag } from '../useSheetDrag';

/** A sheet like the drawer: a dialog with a panel, a handle, a header and a body. */
const Sheet = ({ onClose, open = true }: { onClose: () => void; open?: boolean }) => {
  const { handlers, bodyRef } = useSheetDrag(onClose, open);
  return (
    <dialog open data-testid="backdrop">
      <div data-testid="sheet">
        <div data-testid="handle" {...handlers} />
        <div data-testid="header" {...handlers}>
          <button type="button">close</button>
        </div>
        <form ref={bodyRef} data-testid="body" />
      </div>
    </dialog>
  );
};

const setMedia = ({ phone = true, reducedMotion = false } = {}) => {
  vi.mocked(window.matchMedia).mockImplementation(
    query =>
      ({
        matches: query.includes('max-width') ? phone : reducedMotion,
        media: query,
      }) as MediaQueryList
  );
};

const sheet = () => screen.getByTestId('sheet');
const backdrop = () => screen.getByTestId('backdrop');
const body = () => screen.getByTestId('body');

/** Sends a cancelable touchmove of `count` fingers at (x, y) to the element, and tells if it was prevented. */
const prevented = (element: Element, y: number, { x = 0, count = 1 } = {}) => {
  const move = new TouchEvent('touchmove', { cancelable: true, bubbles: true });
  const touches = Array.from({ length: count }, () => ({ clientX: x, clientY: y }));
  Object.defineProperty(move, 'touches', { value: touches });
  element.dispatchEvent(move);
  return move.defaultPrevented;
};

/** Waits `ms` milliseconds of the fake clock. */
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

/** Drags the handle by `distance` pixels, in moves of `step` milliseconds, then releases it. */
const dragHandle = (distance: number, { step = 50, pause = 0, target = 'handle' } = {}) => {
  const element = screen.getByTestId(target);
  fireEvent.pointerDown(element, { pointerId: 1, button: 0, clientY: 100 });
  for (const y of [100 + distance / 2, 100 + distance]) {
    vi.advanceTimersByTime(step);
    fireEvent.pointerMove(element, { pointerId: 1, clientY: y });
  }
  vi.advanceTimersByTime(pause);
  fireEvent.pointerUp(element, { pointerId: 1, clientY: 100 + distance });
};

const touch = (type: 'start' | 'move' | 'end' | 'cancel', y: number, x = 0, count = 1) => {
  const touches = Array.from({ length: count }, () => ({ clientX: x, clientY: y }));
  const init = { touches: type === 'end' || type === 'cancel' ? [] : touches };
  if (type === 'start') fireEvent.touchStart(body(), init);
  if (type === 'move') fireEvent.touchMove(body(), init);
  if (type === 'end') fireEvent.touchEnd(body(), init);
  if (type === 'cancel') fireEvent.touchCancel(body(), init);
};

const nativeCapture = Element.prototype.setPointerCapture;

beforeEach(() => {
  vi.useFakeTimers();
  setMedia();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    height: 800,
  } as DOMRect);
  Element.prototype.setPointerCapture = vi.fn();
  // The body has content to scroll, as the form of the drawer
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(1000);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Element.prototype.setPointerCapture = nativeCapture;
});

describe('useSheetDrag with the handle and the header', () => {
  it('moves the sheet with the finger and fades the backdrop', () => {
    render(<Sheet onClose={vi.fn()} />);
    fireEvent.pointerDown(screen.getByTestId('handle'), { pointerId: 1, button: 0, clientY: 100 });
    fireEvent.pointerMove(screen.getByTestId('handle'), { pointerId: 1, clientY: 300 });
    expect(sheet().style.transform).toBe('translateY(200px)');
    expect(backdrop().style.getPropertyValue('--sheet-drag')).toBe('0.25');
    expect(Element.prototype.setPointerCapture).toHaveBeenCalledWith(1);
  });

  it('slides the sheet down and closes it after a drag of more than 25% of its height', async () => {
    const onClose = vi.fn();
    render(<Sheet onClose={onClose} />);
    dragHandle(300);
    expect(sheet().style.transform).toBe('translateY(100%)');
    expect(sheet().style.pointerEvents).toBe('none');
    expect(backdrop().style.getPropertyValue('--sheet-drag')).toBe('1');
    expect(onClose).not.toHaveBeenCalled();
    await wait(200);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes after a fast flick from the header', async () => {
    const onClose = vi.fn();
    render(<Sheet onClose={onClose} />);
    dragHandle(60, { step: 10, target: 'header' });
    await wait(200);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('puts the sheet back after a short slow drag, or a flick that stopped', async () => {
    const onClose = vi.fn();
    render(<Sheet onClose={onClose} />);
    dragHandle(100, { step: 500 });
    expect(sheet().style.transform).toBe('');
    expect(sheet().style.transition).toBe('transform 200ms ease-out');
    expect(backdrop().style.getPropertyValue('--sheet-drag')).toBe('');
    dragHandle(60, { step: 10, pause: 150 });
    await wait(500);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not count the slow move before the drag starts as a flick', async () => {
    const onClose = vi.fn();
    render(<Sheet onClose={onClose} />);
    const handle = screen.getByTestId('handle');
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 100 });
    // A slow creep crosses the slop after 320 ms, then a moderate pull of 0.45 px/ms
    vi.advanceTimersByTime(320);
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 109 });
    for (const y of [118, 127]) {
      vi.advanceTimersByTime(20);
      fireEvent.pointerMove(handle, { pointerId: 1, clientY: y });
    }
    vi.advanceTimersByTime(5);
    fireEvent.pointerUp(handle, { pointerId: 1 });
    await wait(500);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes at once with no animation when the user prefers reduced motion', () => {
    setMedia({ reducedMotion: true });
    const onClose = vi.fn();
    render(<Sheet onClose={onClose} />);
    dragHandle(300);
    expect(onClose).toHaveBeenCalledOnce();
    expect(sheet().style.transition).toBe('none');
  });

  it('puts the sheet back when the browser cancels the pointer', async () => {
    const onClose = vi.fn();
    render(<Sheet onClose={onClose} />);
    const handle = screen.getByTestId('handle');
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 100 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 500 });
    fireEvent.pointerCancel(handle, { pointerId: 1 });
    await wait(500);
    expect(onClose).not.toHaveBeenCalled();
    expect(sheet().style.transform).toBe('');
  });

  it('does not drag on a larger screen, from a button, or with another button or pointer', () => {
    const onClose = vi.fn();
    const { unmount } = render(<Sheet onClose={onClose} />);
    const handle = screen.getByTestId('handle');
    fireEvent.pointerDown(screen.getByRole('button'), { pointerId: 1, button: 0, clientY: 100 });
    fireEvent.pointerDown(handle, { pointerId: 2, button: 2, clientY: 100 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 500 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(sheet().style.transform).toBe('');

    // A second pointer during a drag does nothing
    fireEvent.pointerDown(handle, { pointerId: 3, button: 0, clientY: 100 });
    fireEvent.pointerDown(handle, { pointerId: 4, button: 0, clientY: 100 });
    fireEvent.pointerMove(handle, { pointerId: 4, clientY: 500 });
    expect(sheet().style.transform).toBe('');
    // A move shorter than the slop is still a tap
    fireEvent.pointerMove(handle, { pointerId: 3, clientY: 105 });
    fireEvent.pointerUp(handle, { pointerId: 3 });
    expect(sheet().style.transform).toBe('');
    unmount();

    setMedia({ phone: false });
    render(<Sheet onClose={onClose} />);
    dragHandle(300);
    expect(sheet().style.transform).toBe('');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close a drawer that closed in another way and opened again during the slide', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<Sheet onClose={onClose} />);
    dragHandle(300);
    rerender(<Sheet onClose={onClose} open={false} />);
    rerender(<Sheet onClose={onClose} />);
    await wait(500);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close after it unmounts during the slide', async () => {
    const onClose = vi.fn();
    const { unmount } = render(<Sheet onClose={onClose} />);
    dragHandle(300);
    unmount();
    await wait(500);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('useSheetDrag in the body', () => {
  it('moves the sheet from the top of the form and closes it', async () => {
    const onClose = vi.fn();
    render(<Sheet onClose={onClose} />);
    touch('start', 100);
    touch('move', 104);
    expect(sheet().style.transform).toBe('');
    touch('move', 150);
    expect(sheet().style.transform).toBe('translateY(50px)');
    touch('move', 400);
    touch('end', 400);
    await wait(200);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('stops the scroll of the browser while the finger moves the sheet', () => {
    render(<Sheet onClose={vi.fn()} />);
    touch('start', 100);
    // A first move with no direction does not stop the scroll
    const still = new TouchEvent('touchmove', { cancelable: true });
    Object.defineProperty(still, 'touches', { value: [{ clientX: 0, clientY: 100 }] });
    body().dispatchEvent(still);
    expect(still.defaultPrevented).toBe(false);
    const pull = new TouchEvent('touchmove', { cancelable: true });
    Object.defineProperty(pull, 'touches', { value: [{ clientX: 0, clientY: 200 }] });
    body().dispatchEvent(pull);
    expect(pull.defaultPrevented).toBe(true);
    const next = new TouchEvent('touchmove', { cancelable: true });
    Object.defineProperty(next, 'touches', { value: [{ clientX: 0, clientY: 250 }] });
    body().dispatchEvent(next);
    expect(next.defaultPrevented).toBe(true);
  });

  it('lets the form scroll when it is not at the top, or for a move up or to the side', () => {
    render(<Sheet onClose={vi.fn()} />);
    body().scrollTop = 40;
    touch('start', 100);
    touch('move', 300);
    expect(sheet().style.transform).toBe('');
    body().scrollTop = 0;
    touch('start', 100);
    touch('move', 50);
    touch('move', 300);
    expect(sheet().style.transform).toBe('');
    touch('start', 100);
    touch('move', 120, 60);
    touch('move', 300);
    touch('end', 300);
    expect(sheet().style.transform).toBe('');
  });

  it('keeps the drag of the first finger when a second finger touches the form', async () => {
    const onClose = vi.fn();
    render(<Sheet onClose={onClose} />);
    touch('start', 100);
    touch('move', 150);
    touch('start', 150, 0, 2);
    fireEvent.touchEnd(body(), { touches: [{ clientX: 0, clientY: 150 }] });
    touch('move', 200);
    expect(sheet().style.transform).toBe('translateY(100px)');
    touch('end', 200);
    expect(sheet().style.transform).toBe('');
    await wait(500);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the handle drag and a touch of the body apart', async () => {
    const onClose = vi.fn();
    render(<Sheet onClose={onClose} />);
    const handle = screen.getByTestId('handle');
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientY: 100 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 150 });
    // A second finger on the form does not move or end the drag of the handle
    touch('start', 300);
    touch('move', 600);
    touch('end', 600);
    expect(sheet().style.transform).toBe('translateY(50px)');
    fireEvent.pointerUp(handle, { pointerId: 1 });

    // A pointer on the handle does not take a drag of the body
    touch('start', 100);
    touch('move', 150);
    fireEvent.pointerDown(handle, { pointerId: 2, button: 0, clientY: 100 });
    fireEvent.pointerMove(handle, { pointerId: 2, clientY: 600 });
    expect(sheet().style.transform).toBe('translateY(50px)');
    touch('end', 150);
    await wait(500);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores two fingers, a larger screen, a closed sheet and a cancelled touch', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<Sheet onClose={onClose} />);
    touch('start', 100, 0, 2);
    touch('move', 400);
    expect(sheet().style.transform).toBe('');

    touch('start', 100);
    touch('move', 400);
    touch('cancel', 400);
    await wait(500);
    expect(onClose).not.toHaveBeenCalled();
    expect(sheet().style.transform).toBe('');

    rerender(<Sheet onClose={onClose} open={false} />);
    touch('start', 100);
    touch('move', 400);
    expect(sheet().style.transform).toBe('');

    rerender(<Sheet onClose={onClose} />);
    setMedia({ phone: false });
    touch('start', 100);
    touch('move', 400);
    expect(sheet().style.transform).toBe('');
  });

  it('stops the scroll of the page for each move in a body with nothing to scroll', () => {
    vi.mocked(
      Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight')?.get as () => number
    ).mockReturnValue(0);
    render(<Sheet onClose={vi.fn()} />);
    // A move up and a move to the side do not drag the sheet, and do not scroll the page
    touch('start', 300);
    expect(prevented(body(), 250)).toBe(true);
    expect(prevented(body(), 400)).toBe(true);
    expect(sheet().style.transform).toBe('');
    touch('end', 400);
    touch('start', 300);
    expect(prevented(body(), 310, { x: 80 })).toBe(true);
    touch('end', 310);

    // A second finger is a pinch: the browser can zoom
    touch('start', 300);
    touch('start', 300, 0, 2);
    expect(prevented(body(), 250, { count: 2 })).toBe(false);
    touch('end', 250);

    // A move down from the top still drags the sheet
    touch('start', 100);
    touch('move', 150);
    expect(sheet().style.transform).toBe('translateY(50px)');
  });

  it('lets a body with content scroll up and down', () => {
    render(<Sheet onClose={vi.fn()} />);
    body().scrollTop = 40;
    touch('start', 300);
    expect(prevented(body(), 250)).toBe(false);
    expect(prevented(body(), 400)).toBe(false);
  });
});

describe('useSheetDrag outside the body', () => {
  it('stops the scroll of the page for a move of one finger on the backdrop or the header', () => {
    render(<Sheet onClose={vi.fn()} />);
    expect(prevented(backdrop(), 300)).toBe(true);
    expect(prevented(screen.getByTestId('header'), 300)).toBe(true);
    expect(prevented(backdrop(), 300, { count: 2 })).toBe(false);
  });

  it('lets the page scroll on a larger screen or after the sheet closes', () => {
    const { rerender } = render(<Sheet onClose={vi.fn()} />);
    setMedia({ phone: false });
    expect(prevented(backdrop(), 300)).toBe(false);
    setMedia();
    rerender(<Sheet onClose={vi.fn()} open={false} />);
    expect(prevented(backdrop(), 300)).toBe(false);
  });
});
