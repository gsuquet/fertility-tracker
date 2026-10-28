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

beforeEach(() => {
  vi.useFakeTimers();
  setMedia();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    height: 800,
  } as DOMRect);
  Element.prototype.setPointerCapture = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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
});
