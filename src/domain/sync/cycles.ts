/** The cycle of each date, from the cycle rules of the application. */
import type { Observation } from '../../types/crms';
import { groupObservationsIntoCycles } from '../cycleBoundaryDetector';
import type { SyncDay } from './canonical';

/** The cycle id of each date. Only the bleeding and `isCycleStart` decide the cycles. */
export function cycleOfDates(days: { date: string; day: SyncDay }[]): Map<string, string> {
  const observations: Observation[] = days.map(({ date, day }) => ({
    id: date,
    date,
    cycleDay: 1,
    stamp: 'DARK_GREEN',
    codeString: '',
    ...day,
  }));
  const cycleOf = new Map<string, string>();
  for (const cycle of groupObservationsIntoCycles(observations)) {
    for (const observation of cycle.observations) cycleOf.set(observation.date, cycle.id);
  }
  return cycleOf;
}
