import { describe, it, expect } from 'vitest';
import { buildDemoObservations } from '../demoData';
import { groupObservationsIntoCycles } from '../cycleBoundaryDetector';

describe('buildDemoObservations', () => {
  const demo = buildDemoObservations('2026-09-30');

  it('builds 56 consecutive days that end on the given date', () => {
    expect(demo).toHaveLength(56);
    expect(demo[0]?.date).toBe('2026-08-06');
    expect(demo.at(-1)?.date).toBe('2026-09-30');
  });

  it('forms two cycles, each with its Peak Day on cycle day 13', () => {
    const cycles = groupObservationsIntoCycles(demo);
    expect(cycles).toHaveLength(2);
    for (const cycle of cycles) {
      expect(cycle.observations.find(o => o.isPeakDay)?.cycleDay).toBe(13);
    }
  });

  it('uses the expected code for each phase of the cycle', () => {
    expect(demo.slice(0, 16).map(o => o.codeString)).toEqual([
      'H',
      'M',
      'L',
      'VL',
      '0AD',
      '0AD',
      '0AD',
      '0AD',
      '2CX2',
      '2CX2',
      '6C/KX3 I',
      '8KX3',
      '10KLAD',
      '0AD',
      '0AD I',
      '0AD',
    ]);
    expect(demo[20]?.codeString).toBe('0AD I');
    expect(demo[21]?.codeString).toBe('0AD');
  });
});
