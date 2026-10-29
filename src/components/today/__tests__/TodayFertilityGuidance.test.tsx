import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { TodayFertilityGuidance } from '../TodayFertilityGuidance';
import { renderWithProviders } from '../../../test/render';
import { en, formatMessage } from '../../../i18n';
import type { StampType } from '../../../types/crms';

const renderGuidance = (stamp: StampType, variant: 'banner' | 'card', currentCode = '') =>
  renderWithProviders(
    <TodayFertilityGuidance
      menu={null}
      stamp={stamp}
      currentCode={currentCode}
      isEmpty={!currentCode}
      isManualPeak={false}
      intercourse={false}
      variant={variant}
    />
  );

describe('TodayFertilityGuidance', () => {
  it.each([
    ['RED', en.todayView.guidance.red],
    ['WHITE_BABY', en.todayView.guidance.whiteBaby],
    ['LIGHT_GREEN_BABY_1', formatMessage(en.todayView.guidance.postPeak, { day: 1 })],
    ['LIGHT_GREEN_BABY_2', formatMessage(en.todayView.guidance.postPeak, { day: 2 })],
    ['LIGHT_GREEN_BABY_3', formatMessage(en.todayView.guidance.postPeak, { day: 3 })],
    ['DARK_GREEN', en.todayView.guidance.dry],
    ['YELLOW', en.todayView.guidance.dry],
  ] as const)('gives the guidance for a %s stamp', (stamp, text) => {
    renderGuidance(stamp, 'card', '0AD');
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it.each(['banner', 'card'] as const)(
    'shows the empty stamp and no guidance for a day with no code in the %s',
    variant => {
      const { container } = renderGuidance('DARK_GREEN', variant);
      expect(screen.getByText(en.todayView.noObservation)).toBeInTheDocument();
      expect(screen.queryByText(en.todayView.guidance.dry)).toBeNull();
      expect(screen.queryByText(/Infertile/)).toBeNull();
      expect(container.querySelector('.stamp-empty')).toBeInTheDocument();
    }
  );

  it.each(['banner', 'card'] as const)('shows the current code in the %s', variant => {
    renderGuidance('DARK_GREEN', variant, '0AD');
    expect(screen.getByText('0AD')).toBeInTheDocument();
  });
});
