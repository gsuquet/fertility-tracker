import { describe, expect, it } from 'vitest';
import { flickVelocity, sheetDragProgress, shouldCloseSheet } from '../sheetDrag';

describe('shouldCloseSheet', () => {
  it('closes after a drag of more than 25% of the sheet height', () => {
    expect(shouldCloseSheet({ distance: 201, height: 800, velocity: 0 })).toBe(true);
    expect(shouldCloseSheet({ distance: 200, height: 800, velocity: 0 })).toBe(false);
  });

  it('closes after a fast flick down of at least 24 pixels', () => {
    expect(shouldCloseSheet({ distance: 24, height: 800, velocity: 0.5 })).toBe(true);
    expect(shouldCloseSheet({ distance: 60, height: 800, velocity: 2 })).toBe(true);
  });

  it('puts the sheet back after a slow short drag, a fast tap or a flick up', () => {
    expect(shouldCloseSheet({ distance: 100, height: 800, velocity: 0.49 })).toBe(false);
    expect(shouldCloseSheet({ distance: 23, height: 800, velocity: 3 })).toBe(false);
    expect(shouldCloseSheet({ distance: 100, height: 800, velocity: -1 })).toBe(false);
  });
});

describe('sheetDragProgress', () => {
  it('gives the part of the sheet height that the drag moved, from 0 to 1', () => {
    expect(sheetDragProgress(200, 800)).toBe(0.25);
    expect(sheetDragProgress(-50, 800)).toBe(0);
    expect(sheetDragProgress(900, 800)).toBe(1);
    expect(sheetDragProgress(100, 0)).toBe(0);
  });
});

describe('flickVelocity', () => {
  it('measures the moves of the last 100 milliseconds', () => {
    const samples = [
      { y: 0, time: 0 },
      { y: 100, time: 150 },
      { y: 140, time: 200 },
      { y: 160, time: 250 },
    ];
    expect(flickVelocity(samples, 250)).toBe(0.6);
  });

  it('does not make a slow drag a flick with one small last move', () => {
    const samples = [
      { y: 0, time: 0 },
      { y: 10, time: 50 },
      { y: 20, time: 100 },
      { y: 25, time: 108 },
    ];
    expect(flickVelocity(samples, 108)).toBeLessThan(0.5);
  });

  it('gives 0 after a pause, or with fewer than two moves at different times', () => {
    expect(
      flickVelocity(
        [
          { y: 0, time: 0 },
          { y: 80, time: 20 },
        ],
        200
      )
    ).toBe(0);
    expect(flickVelocity([{ y: 0, time: 0 }], 0)).toBe(0);
    expect(
      flickVelocity(
        [
          { y: 0, time: 5 },
          { y: 10, time: 5 },
        ],
        5
      )
    ).toBe(0);
    expect(flickVelocity([], 0)).toBe(0);
  });
});
