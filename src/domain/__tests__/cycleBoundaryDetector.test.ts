import { describe, it, expect } from 'vitest';
import { groupObservationsIntoCycles } from '../cycleBoundaryDetector';
import { Observation } from '../../types/crms';

describe('cycleBoundaryDetector', () => {
  it('groups single cycle observations properly', () => {
    const rawObs: Observation[] = [
      { id: '1', date: '2026-07-01', cycleDay: 1, bleeding: 'H', stamp: 'RED', codeString: 'H' },
      { id: '2', date: '2026-07-02', cycleDay: 2, stretch: '0', stamp: 'DARK_GREEN', codeString: '0' },
    ];

    const cycles = groupObservationsIntoCycles(rawObs);
    expect(cycles.length).toBe(1);
    expect(cycles[0].observations.length).toBe(2);
  });

  it('splits multiple cycles when a new menses phase begins', () => {
    const rawObs: Observation[] = [
      // Cycle 1
      { id: '1', date: '2026-06-01', cycleDay: 1, bleeding: 'H', stamp: 'RED', codeString: 'H' },
      { id: '2', date: '2026-06-02', cycleDay: 2, stretch: '0', stamp: 'DARK_GREEN', codeString: '0' },
      // Cycle 2 (Menses start on July 1)
      { id: '3', date: '2026-07-01', cycleDay: 1, bleeding: 'H', stamp: 'RED', codeString: 'H' },
      { id: '4', date: '2026-07-02', cycleDay: 2, stretch: '0', stamp: 'DARK_GREEN', codeString: '0' },
    ];

    const cycles = groupObservationsIntoCycles(rawObs);
    expect(cycles.length).toBe(2);
    expect(cycles[0].startDate).toBe('2026-07-01'); // Most recent cycle first
    expect(cycles[1].startDate).toBe('2026-06-01'); // Past cycle second
  });
});
