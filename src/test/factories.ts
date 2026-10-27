import type { Observation } from '../types/crms';

/**
 * Builds a valid Observation for tests. Pass only the fields the test cares about.
 */
export const makeObservation = (
  overrides: Partial<Observation> & { date: string }
): Observation => ({
  id: `obs_${overrides.date}`,
  cycleDay: 1,
  stamp: 'DARK_GREEN',
  codeString: '',
  ...overrides,
});
