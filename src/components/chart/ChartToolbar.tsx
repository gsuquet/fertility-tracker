import type React from 'react';
import { Info, Layers, Grid, List } from 'lucide-react';
import type { TranslationSchema } from '../../i18n';

export type ChartViewMode = '35-day' | 'compact';

interface ChartViewControls {
  viewMode: ChartViewMode;
  onViewModeChange: (mode: ChartViewMode) => void;
  showPhaseBar: boolean;
  onTogglePhaseBar: () => void;
}

interface ChartToolbarProps {
  t: TranslationSchema;
  subtitle: string;
  showLegend: boolean;
  onToggleLegend: () => void;
  /** View controls of a chart with cycles. The blank grid has none. */
  controls?: ChartViewControls;
}

/** Title and view controls above the paper chart */
export const ChartToolbar: React.FC<ChartToolbarProps> = ({
  t,
  subtitle,
  showLegend,
  onToggleLegend,
  controls,
}) => (
  <div className="chart-strip-toolbar">
    <div className="toolbar-left">
      <div className="strip-title-group">
        <span className="strip-main-title">{t.tabs.chart}</span>
        <span className="strip-subtitle-badge">{subtitle}</span>
      </div>

      {controls && (
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`toggle-btn ${controls.viewMode === '35-day' ? 'active' : ''}`}
            onClick={() => controls.onViewModeChange('35-day')}
            title={t.chartStrip.fullGrid}
          >
            <Grid size={14} />
            <span>{t.chartStrip.fullGrid}</span>
          </button>
          <button
            type="button"
            className={`toggle-btn ${controls.viewMode === 'compact' ? 'active' : ''}`}
            onClick={() => controls.onViewModeChange('compact')}
            title={t.chartStrip.compactGrid}
          >
            <List size={14} />
            <span>{t.chartStrip.compactGrid}</span>
          </button>
        </div>
      )}
    </div>

    <div className="toolbar-right">
      {controls && (
        <button
          type="button"
          className={`toolbar-btn ${controls.showPhaseBar ? 'active-toggle' : ''}`}
          onClick={controls.onTogglePhaseBar}
          title="Toggle phase timeline bar"
        >
          <Layers size={14} />
          <span>Phases</span>
        </button>
      )}

      <button
        type="button"
        className={controls ? `toolbar-btn ${showLegend ? 'active-toggle' : ''}` : 'toolbar-btn'}
        onClick={onToggleLegend}
        title={t.chartStrip.showLegend}
      >
        <Info size={controls ? 14 : 15} />
        <span>{showLegend ? t.chartStrip.hideLegend : t.chartStrip.showLegend}</span>
      </button>
    </div>
  </div>
);
