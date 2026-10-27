import type React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { ChartRow } from '../ChartRow';
import { renderWithProviders } from '../../test/render';
import { buildDemoObservations } from '../../domain/demoData';

// Counts the stamp badge renders: each filled cell renders one badge
const stampRenders = vi.hoisted(() => ({ count: 0 }));

vi.mock('../StampBadge', async importOriginal => {
  const actual = await importOriginal<typeof import('../StampBadge')>();
  const CountedStampBadge: typeof actual.StampBadge = props => {
    stampRenders.count += 1;
    return (actual.StampBadge as (p: typeof props) => React.ReactElement)(props);
  };
  return { StampBadge: CountedStampBadge };
});

describe('ChartRow rendering', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders only the hovered or focused cell again', () => {
    renderWithProviders(<ChartRow />, { observations: buildDemoObservations('2026-09-15') });
    const [cell] = screen.getAllByRole('button', { name: /^Cycle Day 1,/ }) as [HTMLElement];
    expect(stampRenders.count).toBeGreaterThan(10);

    for (const event of [
      fireEvent.mouseEnter,
      fireEvent.mouseLeave,
      fireEvent.focus,
      fireEvent.blur,
    ]) {
      const before = stampRenders.count;
      event(cell);
      expect(stampRenders.count - before).toBeLessThanOrEqual(1);
    }
  });
});
