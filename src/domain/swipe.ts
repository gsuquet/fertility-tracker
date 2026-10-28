/** A swipe longer than this changes the day, in pixels. */
export const SWIPE_MIN_DISTANCE = 60;
/** A flick at this speed or faster also changes the day, in pixels per millisecond. */
export const SWIPE_FLICK_VELOCITY = 0.5;
/** A flick must move at least this distance, so that a fast tap does not change the day. */
export const SWIPE_FLICK_MIN_DISTANCE = 24;
/** The largest angle from horizontal of a swipe, in degrees. */
export const SWIPE_MAX_ANGLE = 30;
/** The finger must move this distance before the direction of the gesture is known. */
export const SWIPE_SLOP = 10;
/** A swipe that starts this close to the left or right edge belongs to the system gestures. */
export const SWIPE_EDGE = 20;
/** The part of the move that the content follows during a swipe. */
export const SWIPE_FOLLOW = 0.4;
/** The time of the slide out and of the slide in, in milliseconds. */
export const SWIPE_SLIDE_DURATION = 150;

export type SwipeDirection = 'next' | 'prev';

const MAX_SLOPE = Math.tan((SWIPE_MAX_ANGLE * Math.PI) / 180);

/** True when the move is less than 30 degrees from horizontal. */
const isHorizontal = (dx: number, dy: number) => Math.abs(dy) < Math.abs(dx) * MAX_SLOPE;

/**
 * The kind of gesture after a move of (dx, dy): null before the slop, `horizontal` for a
 * possible swipe, else `other` (a scroll).
 */
export function swipeIntent(dx: number, dy: number): 'horizontal' | 'other' | null {
  if (Math.hypot(dx, dy) < SWIPE_SLOP) return null;
  return isHorizontal(dx, dy) ? 'horizontal' : 'other';
}

export interface SwipeRelease {
  /** The horizontal move, in pixels. Negative is to the left. */
  dx: number;
  /** The vertical move, in pixels. */
  dy: number;
  /** The time from the start of the gesture to the release, in milliseconds. */
  duration: number;
}

/**
 * The day that a swipe opens: `next` for a swipe to the left, `prev` for a swipe to the right,
 * or null. A swipe is mostly horizontal, and long or fast.
 */
export function detectDaySwipe({ dx, dy, duration }: SwipeRelease): SwipeDirection | null {
  if (!isHorizontal(dx, dy)) return null;
  const distance = Math.abs(dx);
  const flick =
    distance >= SWIPE_FLICK_MIN_DISTANCE &&
    distance / Math.max(1, duration) >= SWIPE_FLICK_VELOCITY;
  if (distance <= SWIPE_MIN_DISTANCE && !flick) return null;
  return dx < 0 ? 'next' : 'prev';
}
