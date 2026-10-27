import type { MucusModifier, MucusStretch, Observation } from '../types/crms';

/** Score of each stretch code on the Creighton mucus scale (0 to 10). */
const STRETCH_SCORE: Record<MucusStretch, number> = {
  '0': 0,
  '2': 2,
  '2W': 2,
  '4': 4,
  '6': 6,
  '8': 8,
  '10': 10,
  '10DL': 10,
  '10SL': 10,
  '10WL': 10,
};

/** Modifiers that give the maximum score. C/K is not in this list. */
const MAX_SCORE_MODIFIERS: readonly MucusModifier[] = ['K', 'L'];

/**
 * Returns the mucus score of one day, from 0 to 10.
 * Clear (K) or lubricative (L) mucus scores 10 for any stretch.
 */
export function getMucusScore(obs: Pick<Observation, 'stretch' | 'modifiers'>): number {
  if (obs.modifiers?.some(m => MAX_SCORE_MODIFIERS.includes(m))) return 10;
  return obs.stretch ? STRETCH_SCORE[obs.stretch] : 0;
}
