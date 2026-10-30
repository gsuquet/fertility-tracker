import type React from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { averagePhases, getCyclePhases } from '../domain/cyclePhases';
import { getCycleEndDate } from '../domain/cycleBoundaryDetector';
import { formatMessage } from '../i18n';
import { shortDate } from '../utils/printCycles';

interface StatTileProps {
  label: string;
  value: string;
  /** The unit after the value, for example "days" */
  unit?: string | undefined;
  detail: string;
}

/** One tile: the label, the value with its unit, and one line of detail */
const StatTile: React.FC<StatTileProps> = ({ label, value, unit, detail }) => (
  <li className="stat-card">
    <span className="stat-label">{label}</span>
    <span className="stat-value">
      <strong>{value}</strong>
      {unit && <span className="stat-unit"> {unit}</span>}
    </span>
    <span className="stat-detail">{detail}</span>
  </li>
);

/** A whole number as it is, else one decimal */
const formatDays = (days: number) => (Number.isInteger(days) ? String(days) : days.toFixed(1));

/**
 * The four tiles of the selected cycle, or the averages of all cycles: the cycle length, the Peak
 * Day, the luteal phase and the intercourse days (RFC 0002).
 */
export const CycleStatsHeader: React.FC = () => {
  const { observations, cycles, selectedCycleId } = useCycle();
  const { t } = useLanguage();

  if (cycles.length === 0) return null;

  // 'all' matches no cycle, so it shows the averages
  const selectedCycle = cycles.find(c => c.id === selectedCycleId);
  const days = t.stats.days;
  const none = '---';

  let length: StatTileProps;
  let luteal: StatTileProps;
  let intercourse: StatTileProps;
  // Cycles are ordered newest first, so in all cycles the first peak is the latest one
  const peak = selectedCycle
    ? getCyclePhases(selectedCycle).peak
    : cycles.map(c => getCyclePhases(c).peak).find(Boolean);

  if (selectedCycle) {
    const phases = getCyclePhases(selectedCycle);
    length = {
      label: t.stats.cycleLength,
      value: String(phases.lengthDays),
      unit: days,
      detail: `${shortDate(selectedCycle.startDate, t.locale)} – ${shortDate(getCycleEndDate(selectedCycle), t.locale)}`,
    };
    luteal = {
      label: t.stats.lutealPhase,
      value: peak ? String(phases.lutealDays) : none,
      unit: peak ? days : undefined,
      detail: t.stats.afterPeak,
    };
    intercourse = {
      label: t.stats.intercourseCount,
      value: String(selectedCycle.observations.filter(o => o.intercourse).length),
      unit: days,
      detail: t.stats.inThisCycle,
    };
  } else {
    const average = averagePhases(cycles);
    const averageOf = formatMessage(t.stats.averageOf, { count: cycles.length });
    length = {
      label: t.stats.cycleLength,
      value: formatDays(average.lengthDays),
      unit: days,
      detail: averageOf,
    };
    luteal = {
      label: t.stats.lutealPhase,
      value: peak ? formatDays(average.lutealDays) : none,
      unit: peak ? days : undefined,
      detail: peak
        ? formatMessage(t.stats.averageOf, { count: average.cyclesWithPeak })
        : t.stats.afterPeak,
    };
    intercourse = {
      label: t.stats.intercourseCount,
      value: String(observations.filter(o => o.intercourse).length),
      unit: days,
      detail: t.stats.inAllCycles,
    };
  }

  return (
    <ul className="stats-dashboard" aria-label={t.stats.label}>
      <StatTile {...length} />
      <StatTile
        label={t.stats.peakDay}
        value={peak ? formatMessage(t.stats.peakValue, { day: peak.cycleDay }) : none}
        detail={peak ? shortDate(peak.date, t.locale) : t.stats.notYet}
      />
      <StatTile {...luteal} />
      <StatTile {...intercourse} />
    </ul>
  );
};
