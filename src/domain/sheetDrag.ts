/** A drag longer than this part of the sheet height closes the sheet. */
export const SHEET_CLOSE_RATIO = 0.25;
/** A flick down at this speed or faster closes the sheet, in pixels per millisecond. */
export const SHEET_FLICK_VELOCITY = 0.5;
/** A flick must move at least this distance, so that a fast tap does not close the sheet. */
export const SHEET_FLICK_MIN_DISTANCE = 24;
/** A pointer must move this distance before a drag starts, so that a tap stays a tap. */
export const SHEET_DRAG_SLOP = 8;
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
