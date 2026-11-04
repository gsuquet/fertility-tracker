import { describe, expect, it } from 'vitest';
import { compareClocks, nextClock, receiveClock, zeroClock } from '../clock';

const clock = (time: number, counter = 0, member = 'a') => ({ time, counter, member });

describe('clock', () => {
  it('orders by the time, then the counter, then the member', () => {
    expect(compareClocks(clock(2), clock(1))).toBeGreaterThan(0);
    expect(compareClocks(clock(1, 1), clock(1, 2))).toBeLessThan(0);
    expect(compareClocks(clock(1, 1, 'b'), clock(1, 1, 'a'))).toBeGreaterThan(0);
    expect(compareClocks(clock(1, 1, 'a'), clock(1, 1, 'b'))).toBeLessThan(0);
    expect(compareClocks(clock(1, 1), clock(1, 1))).toBe(0);
  });

  it('puts a missing clock before each clock', () => {
    expect(compareClocks(undefined, zeroClock('a'))).toBeLessThan(0);
    expect(compareClocks(zeroClock('a'), undefined)).toBeGreaterThan(0);
    expect(compareClocks(undefined, undefined)).toBe(0);
  });

  it('gives a later clock with a time of at least now', () => {
    expect(nextClock(clock(100, 3), 200)).toEqual(clock(200, 0));
    // The device clock went back: the time stays and the counter increases
    expect(nextClock(clock(100, 3), 50)).toEqual(clock(100, 4));
    expect(nextClock(clock(100, 3), 100)).toEqual(clock(100, 4));
  });

  it('receives the latest clock with its own member', () => {
    expect(
      receiveClock(clock(100, 0, 'a'), [clock(300, 2, 'b'), undefined, clock(200, 0, 'c')])
    ).toEqual(clock(300, 2, 'a'));
    expect(receiveClock(clock(400, 1, 'a'), [clock(300, 2, 'b')])).toEqual(clock(400, 1, 'a'));
    const received = receiveClock(clock(1, 0, 'a'), [clock(300, 2, 'b')]);
    expect(compareClocks(nextClock(received, 0), clock(300, 2, 'b'))).toBeGreaterThan(0);
  });
});
