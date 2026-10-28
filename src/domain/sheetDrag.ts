/** A drag longer than this part of the sheet height closes the sheet. */
export const SHEET_CLOSE_RATIO = 0.25;
/** A flick down at this speed or faster closes the sheet, in pixels per millisecond. */
export const SHEET_FLICK_VELOCITY = 0.5;
/** A flick must move at least this distance, so that a fast tap does not close the sheet. */
export const SHEET_FLICK_MIN_DISTANCE = 24;
/** A pointer must move this distance before a drag starts, so that a tap stays a tap. */
export const SHEET_DRAG_SLOP = 8;
/** The speed of a flick is the move of the last part of the drag, in milliseconds. */
export const SHEET_FLICK_WINDOW = 100;
/** The time of the slide down before the sheet closes, in milliseconds. */
export const SHEET_CLOSE_DURATION = 200;

export interface SheetRelease {
  /** The distance of the drag down, in pixels. A drag up is 0. */
  distance: number;
  /** The height of the sheet, in pixels. */
  height: number;
  /** The speed of the last move, in pixels per millisecond. Positive is down. */
  velocity: number;
}

/** True when the release of a drag closes the sheet: a long drag, or a fast flick down. */
export function shouldCloseSheet({ distance, height, velocity }: SheetRelease): boolean {
  if (distance > height * SHEET_CLOSE_RATIO) return true;
  return velocity >= SHEET_FLICK_VELOCITY && distance >= SHEET_FLICK_MIN_DISTANCE;
}

/** How far the sheet moved, from 0 (open) to 1 (closed). The backdrop fades with it. */
export function sheetDragProgress(distance: number, height: number): number {
  if (height <= 0) return 0;
  return Math.min(1, Math.max(0, distance / height));
}

export interface DragSample {
  /** The position of the finger, in pixels. */
  y: number;
  /** The time of the move, in milliseconds. */
  time: number;
}

/**
 * The speed of the drag at `now`, in pixels per millisecond, from the moves of the last
 * 100 milliseconds. One small last move does not make a slow drag a flick, and a pause before
 * the release gives 0.
 */
export function flickVelocity(samples: DragSample[], now: number): number {
  const recent = samples.filter(sample => now - sample.time <= SHEET_FLICK_WINDOW);
  const first = recent[0];
  const last = recent[recent.length - 1];
  if (!first || !last || last.time === first.time) return 0;
  return (last.y - first.y) / (last.time - first.time);
}
