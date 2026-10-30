import type React from 'react';
import { useCycle } from '../context/CycleContext';
import { useLanguage } from '../context/LanguageContext';
import { averagePhases, getCyclePhases } from '../domain/cyclePhases';
import { getCycleEndDate } from '../domain/cycleBoundaryDetector';
import { formatDays, formatMessage, isSingular } from '../i18n';
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
  const none = '---';
  // The value with its unit, in the singular when the language uses it
  const dayValue = (value: number) => ({
    value: formatDays(value, t.locale),
    unit: isSingular(value, t.locale) ? t.stats.day : t.stats.days,
  });
  const averageOf = (count: number) =>
    count === 1 ? t.stats.averageOfOne : formatMessage(t.stats.averageOf, { count });

  let length: StatTileProps;
  let luteal: StatTileProps;
  let intercourse: StatTileProps;
  // Cycles are ordered newest first, so in all cycles the first peak is the latest one
  const peak = selectedCycle
    ? getCyclePhases(selectedCycle).peak
    : cycles.map(c => getCyclePhases(c).peak).find(Boolean);

  if (selectedCycle) {
    const phases = getCyclePhases(selectedCycle);
    const start = shortDate(selectedCycle.startDate, t.locale);
    const end = shortDate(getCycleEndDate(selectedCycle), t.locale);
    length = {
      label: t.stats.cycleLength,
      ...dayValue(phases.lengthDays),
      detail: start === end ? start : `${start} – ${end}`,
    };
    luteal = {
      label: t.stats.lutealPhase,
      ...(peak ? dayValue(phases.lutealDays) : { value: none }),
      detail: t.stats.afterPeak,
    };
    intercourse = {
      label: t.stats.intercourseCount,
      ...dayValue(selectedCycle.observations.filter(o => o.intercourse).length),
      detail: t.stats.inThisCycle,
    };
  } else {
    const average = averagePhases(cycles);
    length = {
      label: t.stats.cycleLength,
      ...dayValue(average.lengthDays),
      detail: averageOf(cycles.length),
    };
    luteal = {
      label: t.stats.lutealPhase,
      ...(peak ? dayValue(average.lutealDays) : { value: none }),
      detail: peak ? averageOf(average.cyclesWithPeak) : t.stats.afterPeak,
    };
    intercourse = {
      label: t.stats.intercourseCount,
      ...dayValue(observations.filter(o => o.intercourse).length),
      detail: t.stats.inAllCycles,
    };
  }

  return (
    <ul className="stats-dashboard" aria-label={t.stats.label}>
      <StatTile {...length} />
      <StatTile
        label={t.stats.peakDay}
        value={peak ? formatMessage(t.stats.peakValue, { day: peak.cycleDay }) : none}
        detail={
          !peak
            ? t.stats.notYet
            : selectedCycle
              ? shortDate(peak.date, t.locale)
              : formatMessage(t.stats.latestPeak, { date: shortDate(peak.date, t.locale) })
        }
      />
      <StatTile {...luteal} />
      <StatTile {...intercourse} />
    </ul>
  );
};
