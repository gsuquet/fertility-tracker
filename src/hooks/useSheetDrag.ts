import type React from 'react';
import { useEffect, useRef } from 'react';
import type { DragSample } from '../domain/sheetDrag';
import {
  SHEET_CLOSE_DURATION,
  SHEET_DRAG_SLOP,
  SHEET_FLICK_WINDOW,
  flickVelocity,
  sheetDragProgress,
  shouldCloseSheet,
} from '../domain/sheetDrag';

/** The width where the drawer is a bottom sheet. It is the phone width of drawer.css. */
const PHONE_QUERY = '(max-width: 640px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const matches = (query: string) => window.matchMedia(query).matches;

interface Drag {
  /** The panel of the dialog, which moves with the finger. */
  sheet: HTMLElement;
  /** The dialog, which paints the backdrop. */
  backdrop: HTMLElement;
  height: number;
  startY: number;
  /** The moves of the last part of the drag, for the speed of a flick. */
  samples: DragSample[];
}

/** The state of the gesture. It lives in a ref, so the functions below never go stale. */
interface GestureState {
  drag: Drag | null;
  pointer: { id: number; startY: number } | null;
  closeTimer: ReturnType<typeof setTimeout> | undefined;
  onClose: () => void;
}

const beginDrag = (state: GestureState, from: Element, startY: number): Drag => {
  const sheet = from.closest('dialog > *') as HTMLElement;
  const backdrop = sheet.parentElement as HTMLElement;
  sheet.style.transition = 'none';
  backdrop.style.transition = 'none';
  state.drag = {
    sheet,
    backdrop,
    height: sheet.getBoundingClientRect().height,
    startY,
    samples: [{ y: startY, time: performance.now() }],
  };
  return state.drag;
};

const moveDrag = (d: Drag, y: number) => {
  const time = performance.now();
  d.samples = [...d.samples.filter(s => time - s.time <= SHEET_FLICK_WINDOW), { y, time }];
  const distance = Math.max(0, y - d.startY);
  d.sheet.style.transform = `translateY(${distance}px)`;
  d.backdrop.style.setProperty('--sheet-drag', String(sheetDragProgress(distance, d.height)));
};

/** Closes the sheet or puts it back. A cancelled drag (the browser took the touch) puts it back. */
const endDrag = (state: GestureState, cancelled: boolean) => {
  const d = state.drag;
  if (!d) return;
  state.drag = null;
  const velocity = flickVelocity(d.samples, performance.now());
  const lastY = (d.samples[d.samples.length - 1] as DragSample).y;
  const distance = Math.max(0, lastY - d.startY);
  const close = !cancelled && shouldCloseSheet({ distance, height: d.height, velocity });
  const animate = !matches(REDUCED_MOTION_QUERY);
  const timing = `${SHEET_CLOSE_DURATION}ms ease-out`;
  d.sheet.style.transition = animate ? `transform ${timing}` : 'none';
  d.backdrop.style.transition = animate
    ? `background-color ${timing}, backdrop-filter ${timing}`
    : 'none';
  if (!close) {
    d.sheet.style.transform = '';
    d.backdrop.style.removeProperty('--sheet-drag');
    return;
  }
  if (!animate) {
    state.onClose();
    return;
  }
  // The sheet slides away: a tap during the slide does nothing
  d.sheet.style.pointerEvents = 'none';
  d.sheet.style.transform = 'translateY(100%)';
  d.backdrop.style.setProperty('--sheet-drag', '1');
  state.closeTimer = setTimeout(() => state.onClose(), SHEET_CLOSE_DURATION);
};

export interface SheetDragHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
}

/**
 * Lets the user drag a bottom sheet down to close it, on a phone only. Put `handlers` on the
 * grab handle and the header, and `bodyRef` on the scrollable body. The sheet is the panel of
 * the Modal dialog. A close by drag calls `onClose`, as the close button does.
 */
export function useSheetDrag(
  onClose: () => void,
  open: boolean
): { handlers: SheetDragHandlers; bodyRef: React.RefObject<HTMLFormElement | null> } {
  const stateRef = useRef<GestureState>({
    drag: null,
    pointer: null,
    closeTimer: undefined,
    onClose,
  });
  const state = stateRef.current;
  state.onClose = onClose;
  const bodyRef = useRef<HTMLFormElement>(null);
  // A close in another way (Escape, Back) during the slide stops the timer, so that it cannot
  // close a drawer that opens again
  // biome-ignore lint/correctness/useExhaustiveDependencies: the cleanup must run each time open changes
  useEffect(() => {
    const gesture = stateRef.current;
    return () => clearTimeout(gesture.closeTimer);
  }, [open]);

  // A drag in the body moves the sheet only from the top of the form. Touch events, and not
  // Pointer Events, can stop the scroll of the browser, so the two gestures do not fight.
  useEffect(() => {
    const body = bodyRef.current;
    if (!open || !body) return;
    const gesture = stateRef.current;
    let start: { x: number; y: number } | null = null;
    // True while the body moves the sheet. A drag of the handle is not the body's to end.
    let owns = false;

    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0] as Touch;
      const free = !gesture.pointer && !gesture.drag;
      start =
        free && e.touches.length === 1 && matches(PHONE_QUERY)
          ? { x: touch.clientX, y: touch.clientY }
          : null;
    };
    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const touch = e.touches[0] as Touch;
      if (owns) {
        e.preventDefault();
        moveDrag(gesture.drag as Drag, touch.clientY);
        return;
      }
      const dy = touch.clientY - start.y;
      // A scroll up, a form that is not at the top or a side move is a scroll
      if (body.scrollTop > 0 || dy < 0 || Math.abs(touch.clientX - start.x) > dy) {
        start = null;
        return;
      }
      // A move with no direction yet does not stop the scroll. iOS decides on the first move.
      if (dy === 0) return;
      e.preventDefault();
      if (dy < SHEET_DRAG_SLOP) return;
      owns = true;
      moveDrag(beginDrag(gesture, body, start.y), touch.clientY);
    };
    const onEnd = (e: TouchEvent) => {
      start = null;
      if (!owns) return;
      owns = false;
      endDrag(gesture, e.type === 'touchcancel');
    };

    body.addEventListener('touchstart', onStart, { passive: true });
    body.addEventListener('touchmove', onMove, { passive: false });
    body.addEventListener('touchend', onEnd);
    body.addEventListener('touchcancel', onEnd);
    return () => {
      body.removeEventListener('touchstart', onStart);
      body.removeEventListener('touchmove', onMove);
      body.removeEventListener('touchend', onEnd);
      body.removeEventListener('touchcancel', onEnd);
    };
  }, [open]);

  const releasePointer = (e: React.PointerEvent<HTMLElement>) => {
    if (state.pointer?.id !== e.pointerId) return;
    state.pointer = null;
    endDrag(state, e.type === 'pointercancel');
  };

  const handlers: SheetDragHandlers = {
    onPointerDown: e => {
      // A press on the close button stays a click
      if (state.pointer || state.drag || e.button !== 0 || !matches(PHONE_QUERY)) return;
      if ((e.target as Element).closest('button')) return;
      // The capture keeps the moves of a mouse that leaves the handle at once
      e.currentTarget.setPointerCapture(e.pointerId);
      state.pointer = { id: e.pointerId, startY: e.clientY };
    },
    onPointerMove: e => {
      const p = state.pointer;
      if (p?.id !== e.pointerId) return;
      let drag = state.drag;
      if (!drag) {
        if (e.clientY - p.startY < SHEET_DRAG_SLOP) return;
        drag = beginDrag(state, e.currentTarget, p.startY);
      }
      moveDrag(drag, e.clientY);
    },
    onPointerUp: releasePointer,
    onPointerCancel: releasePointer,
  };

  return { handlers, bodyRef };
}
