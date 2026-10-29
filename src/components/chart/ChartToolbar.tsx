import type React from 'react';
import { BarChart3, Info } from 'lucide-react';
import type { TranslationSchema } from '../../i18n';
import type { MenuEntry } from '../MenuButton';
import { MenuButton } from '../MenuButton';
import { InTopBar } from '../shell/TopBar';

export type ChartViewMode = '35-day' | 'compact';

interface ChartViewControls {
  viewMode: ChartViewMode;
  onViewModeChange: (mode: ChartViewMode) => void;
  showPhaseBar: boolean;
  onTogglePhaseBar: () => void;
}

interface ChartToolbarProps {
  t: TranslationSchema;
  showLegend: boolean;
  onToggleLegend: () => void;
  /** View controls of a chart with cycles. The blank grid has none. */
  controls?: ChartViewControls;
}

/**
 * The one row of chart controls: **35-day** or **Strip**, and the ⋮ menu with **Phase bar** and
 * **Legend**. On a phone, the row is in the top bar.
 */
export const ChartToolbar: React.FC<ChartToolbarProps> = ({
  t,
  showLegend,
  onToggleLegend,
  controls,
}) => {
  const entries: MenuEntry[] = [];
  if (controls) {
    entries.push({
      kind: 'check',
      label: t.chartStrip.phaseBar,
      icon: <BarChart3 size={18} />,
      checked: controls.showPhaseBar,
      onSelect: controls.onTogglePhaseBar,
    });
  }
  entries.push({
    kind: 'check',
    label: t.chartStrip.showLegend,
    icon: <Info size={18} />,
    checked: showLegend,
    onSelect: onToggleLegend,
  });

  return (
    <InTopBar>
      <div className="chart-strip-toolbar">
        {controls && (
          <fieldset className="chart-view-toggle">
            <legend className="sr-only">{t.chartStrip.viewLabel}</legend>
            {(['35-day', 'compact'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                aria-pressed={controls.viewMode === mode}
                onClick={() => controls.onViewModeChange(mode)}
              >
                {mode === '35-day' ? t.chartStrip.view35 : t.chartStrip.viewStrip}
              </button>
            ))}
          </fieldset>
        )}
        <span className="chart-toolbar-spacer" />
        <MenuButton label={t.chartStrip.optionsLabel} entries={entries} />
      </div>
    </InTopBar>
  );
};
