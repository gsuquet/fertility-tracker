import { describe, expect, it } from 'vitest';
import { makeObservation } from '../../../test/factories';
import { zeroClock } from '../clock';
import { firstSyncDays, stampLocalChanges } from '../localChanges';

const start = { time: 100, counter: 0, member: 'phone' };
const at = (time: number, counter = 0) => ({ time, counter, member: 'phone' });

describe('stampLocalChanges', () => {
  it('gives a new clock to a new, a changed and a deleted day only', () => {
    const first = stampLocalChanges(
      [
        makeObservation({ date: '2026-10-01', bleeding: 'H' }),
        makeObservation({ date: '2026-10-02', stretch: '0' }),
        makeObservation({ date: '2026-10-03', stretch: '2' }),
      ],
      [],
      start,
      200
    );
    expect(first.days.map(d => d.clock)).toEqual([at(200, 0), at(200, 1), at(200, 2)]);
    expect(first.clock).toEqual(at(200, 2));

    const second = stampLocalChanges(
      [
        makeObservation({ id: 'other_id', date: '2026-10-01', bleeding: 'H' }),
        makeObservation({ date: '2026-10-02', stretch: '10' }),
      ],
      first.days,
      first.clock,
      300
    );
    expect(second.days).toEqual([
      { date: '2026-10-01', day: { bleeding: 'H' }, clock: at(200, 0) },
      { date: '2026-10-02', day: { stretch: '10' }, clock: at(300, 0) },
      { date: '2026-10-03', day: null, clock: at(300, 1) },
    ]);

    // A tombstone stays with its clock while the date stays gone
    const third = stampLocalChanges(
      [
        makeObservation({ date: '2026-10-01', bleeding: 'H' }),
        makeObservation({ date: '2026-10-02', stretch: '10' }),
      ],
      second.days,
      second.clock,
      400
    );
    expect(third.days).toEqual(second.days);
    expect(third.clock).toEqual(second.clock);
  });

  it('never stamps a demo day', () => {
    const { days } = stampLocalChanges(
      [makeObservation({ id: 'demo_1', date: '2026-10-01', stretch: '0' })],
      [],
      start,
      200
    );
    expect(days).toEqual([]);
  });

  it('gives a Peak Day clock to a gain and to an explicit removal', () => {
    const gained = stampLocalChanges(
      [makeObservation({ date: '2026-10-10', stretch: '10', isManualPeak: true })],
      [],
      start,
      200
    );
    expect(gained.days[0]?.peak).toEqual({ value: true, clock: at(200, 1) });

    const removed = stampLocalChanges(
      [makeObservation({ date: '2026-10-10', stretch: '10' })],
      gained.days,
      gained.clock,
      300
    );
    expect(removed.days[0]?.peak).toEqual({ value: false, clock: at(300, 0) });
    expect(removed.days[0]?.clock).toEqual(at(200, 0));
  });

  it('keeps the Peak Day clock of a date that loses it to a date of the same cycle', () => {
    const before = stampLocalChanges(
      [
        makeObservation({ date: '2026-10-01', bleeding: 'H' }),
        makeObservation({ date: '2026-10-10', stretch: '10', isManualPeak: true }),
        makeObservation({ date: '2026-10-11', stretch: '10' }),
      ],
      [],
      start,
      200
    );
    const moved = stampLocalChanges(
      [
        makeObservation({ date: '2026-10-01', bleeding: 'H' }),
        makeObservation({ date: '2026-10-10', stretch: '10' }),
        makeObservation({ date: '2026-10-11', stretch: '10', isManualPeak: true }),
      ],
      before.days,
      before.clock,
      300
    );
    expect(moved.days[1]?.peak).toEqual({ value: false, clock: at(200, 3) });
    expect(moved.days[2]?.peak).toEqual({ value: true, clock: at(300, 0) });
  });

  it('gives a clock to a Peak Day loss when the gain is in a different cycle', () => {
    const before = stampLocalChanges(
      [
        makeObservation({ date: '2026-10-10', stretch: '10', isManualPeak: true }),
        makeObservation({ date: '2026-11-01', bleeding: 'H' }),
        makeObservation({ date: '2026-11-10', stretch: '10' }),
      ],
      [],
      start,
      200
    );
    const after = stampLocalChanges(
      [
        makeObservation({ date: '2026-10-10', stretch: '10' }),
        makeObservation({ date: '2026-11-01', bleeding: 'H' }),
        makeObservation({ date: '2026-11-10', stretch: '10', isManualPeak: true }),
      ],
      before.days,
      before.clock,
      300
    );
    expect(after.days[0]?.peak).toEqual({ value: false, clock: at(300, 0) });
    expect(after.days[2]?.peak).toEqual({ value: true, clock: at(300, 1) });
  });

  it('gives a deleted day a removal of its Peak Day with a new clock', () => {
    const before = stampLocalChanges(
      [
        makeObservation({ date: '2026-10-10', stretch: '10', isManualPeak: true }),
        makeObservation({ date: '2026-10-11', stretch: '10' }),
      ],
      [],
      start,
      200
    );
    const after = stampLocalChanges(
      [makeObservation({ date: '2026-10-11', stretch: '10', isManualPeak: true })],
      before.days,
      before.clock,
      300
    );
    expect(after.days[0]).toEqual({
      date: '2026-10-10',
      day: null,
      clock: at(300, 0),
      peak: { value: false, clock: at(300, 1) },
    });
    expect(after.days[1]?.peak).toEqual({ value: true, clock: at(300, 2) });
  });
});

describe('firstSyncDays', () => {
  it('gives each user day and each manual Peak Day the zero clock', () => {
    const zero = zeroClock('tablet');
    expect(
      firstSyncDays(
        [
          makeObservation({ date: '2026-10-02', stretch: '10', isManualPeak: true }),
          makeObservation({ date: '2026-10-01', bleeding: 'M' }),
          makeObservation({ id: 'demo_1', date: '2026-10-03' }),
        ],
        'tablet'
      )
    ).toEqual([
      { date: '2026-10-01', day: { bleeding: 'M' }, clock: zero },
      {
        date: '2026-10-02',
        day: { stretch: '10' },
        clock: zero,
        peak: { value: true, clock: zero },
      },
    ]);
  });
});
