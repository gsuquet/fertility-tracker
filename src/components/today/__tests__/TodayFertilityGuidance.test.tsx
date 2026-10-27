import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { TodayFertilityGuidance } from '../TodayFertilityGuidance';
import { renderWithProviders } from '../../../test/render';
import { en } from '../../../i18n';
import type { StampType } from '../../../types/crms';

const renderGuidance = (stamp: StampType, variant: 'banner' | 'card', currentCode = '') =>
  renderWithProviders(
    <TodayFertilityGuidance
      stamp={stamp}
      currentCode={currentCode}
      isManualPeak={false}
      intercourse={false}
      variant={variant}
    />
  );

describe('TodayFertilityGuidance', () => {
  it.each([
    ['RED', en.todayView.guidance.red],
    ['WHITE_BABY', en.todayView.guidance.whiteBaby],
    ['LIGHT_GREEN_BABY_1', en.todayView.guidance.postPeak],
    ['LIGHT_GREEN_BABY_2', en.todayView.guidance.postPeak],
    ['LIGHT_GREEN_BABY_3', en.todayView.guidance.postPeak],
    ['DARK_GREEN', en.todayView.guidance.dry],
    ['YELLOW', en.todayView.guidance.dry],
  ] as const)('gives the guidance for a %s stamp', (stamp, text) => {
    renderGuidance(stamp, 'card');
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it.each(['banner', 'card'] as const)('shows a placeholder code in the %s', variant => {
    renderGuidance('DARK_GREEN', variant);
    expect(screen.getByText('---')).toBeInTheDocument();
  });

  it.each(['banner', 'card'] as const)('shows the current code in the %s', variant => {
    renderGuidance('DARK_GREEN', variant, '0AD');
    expect(screen.getByText('0AD')).toBeInTheDocument();
  });
});
