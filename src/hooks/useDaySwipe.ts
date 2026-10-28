import type React from 'react';
import { useEffect, useRef } from 'react';
import type { SwipeDirection } from '../domain/swipe';
import {
  SWIPE_EDGE,
  SWIPE_FOLLOW,
  SWIPE_SLIDE_DURATION,
  detectDaySwipe,
  swipeIntent,
} from '../domain/swipe';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
/** The time after a swipe when a click is a part of the swipe, in milliseconds. */
const CLICK_AFTER_SWIPE = 500;
/** How far the content slides out and in, as a part of its width. */
const SLIDE_OFFSET = '30%';

/** Fields and lists keep their own gestures. */
const OWN_GESTURE = 'input, textarea, select, [contenteditable="true"]';

/** True when the gesture starts in a field or in an element that scrolls horizontally. */
const startsInOwnGesture = (target: Element, root: Element) => {
  for (let el: Element | null = target; el && el !== root; el = el.parentElement) {
    if (el.matches(OWN_GESTURE)) return true;
    const { overflowX } = window.getComputedStyle(el);
    if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth) {
      return true;
    }
  }
  return false;
};

interface Swipe {
  id: number;
  startX: number;
  startY: number;
  startTime: number;
  /** True when the gesture is a horizontal swipe. */
  tracking: boolean;
}

export interface DaySwipeHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onClickCapture: (e: React.MouseEvent<HTMLElement>) => void;
}

/**
 * A horizontal swipe with a finger or a pen calls `onSwipe` with the direction: `next` to the
 * left, `prev` to the right. Put `handlers` on the page and `contentRef` on the part that
 * follows the finger. A vertical drag stays a scroll, because the page has `touch-action: pan-y`.
 */
export function useDaySwipe(onSwipe: (direction: SwipeDirection) => void): {
  handlers: DaySwipeHandlers;
  contentRef: React.RefObject<HTMLDivElement | null>;
} {
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;
  const contentRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<Swipe | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clickBlockedUntil = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const animate = () => !window.matchMedia(REDUCED_MOTION_QUERY).matches;

  /** Moves the content with a transition of the slide time, or at once with null. */
  const place = (transform: string, opacity: string, timing: string | null) => {
    const content = contentRef.current as HTMLDivElement;
    content.style.transition = timing ? `transform ${timing}, opacity ${timing}` : 'none';
    content.style.transform = transform;
    content.style.opacity = opacity;
  };

  const finish = (direction: SwipeDirection | null) => {
    const timing = `${SWIPE_SLIDE_DURATION}ms ease-out`;
    if (!animate()) {
      if (direction) onSwipeRef.current(direction);
      return;
    }
    if (!direction) {
      place('', '', timing);
      return;
    }
    // Slide out in the swipe direction, change the day, then slide in from the other side
    const out = direction === 'next' ? `-${SLIDE_OFFSET}` : SLIDE_OFFSET;
    const back = direction === 'next' ? SLIDE_OFFSET : `-${SLIDE_OFFSET}`;
    place(`translateX(${out})`, '0', timing);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onSwipeRef.current(direction);
      place(`translateX(${back})`, '0', null);
      // Read the layout, so that the browser starts the slide in from this position
      void (contentRef.current as HTMLDivElement).offsetWidth;
      place('', '', timing);
    }, SWIPE_SLIDE_DURATION);
  };

  const release = (e: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
    const s = swipe.current;
    if (s?.id !== e.pointerId) return;
    swipe.current = null;
    if (!s.tracking) return;
    // A button under the finger must not get a click from the swipe
    clickBlockedUntil.current = performance.now() + CLICK_AFTER_SWIPE;
    finish(
      cancelled
        ? null
        : detectDaySwipe({
            dx: e.clientX - s.startX,
            dy: e.clientY - s.startY,
            duration: performance.now() - s.startTime,
          })
    );
  };

  const handlers: DaySwipeHandlers = {
    onPointerDown: e => {
      if (swipe.current || e.pointerType === 'mouse') return;
      const nearEdge = e.clientX < SWIPE_EDGE || e.clientX > window.innerWidth - SWIPE_EDGE;
      if (nearEdge || startsInOwnGesture(e.target as Element, e.currentTarget)) return;
      swipe.current = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startTime: performance.now(),
        tracking: false,
      };
    },
    onPointerMove: e => {
      const s = swipe.current;
      if (s?.id !== e.pointerId) return;
      const dx = e.clientX - s.startX;
      if (!s.tracking) {
        const intent = swipeIntent(dx, e.clientY - s.startY);
        if (!intent) return;
        if (intent === 'other') {
          swipe.current = null;
          return;
        }
        s.tracking = true;
      }
      if (animate()) place(`translateX(${dx * SWIPE_FOLLOW}px)`, '', null);
    },
    onPointerUp: e => release(e, false),
    onPointerCancel: e => release(e, true),
    onClickCapture: e => {
      if (performance.now() >= clickBlockedUntil.current) return;
      e.preventDefault();
      e.stopPropagation();
    },
  };

  return { handlers, contentRef };
}
