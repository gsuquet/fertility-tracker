import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodayDateNav } from '../TodayDateNav';
import { TodayHistoryList } from '../TodayHistoryList';
import { TodayFertilityGuidance } from '../TodayFertilityGuidance';
import { LanguageProvider } from '../../../context/LanguageContext';

describe('Today View Subcomponents', () => {
  it('TodayDateNav triggers navigation callbacks', async () => {
    const user = userEvent.setup();
    const handlePrev = vi.fn();
    const handleNext = vi.fn();
    const handleToday = vi.fn();
    const handleChange = vi.fn();

    render(
      <LanguageProvider>
        <TodayDateNav
          selectedDate="2026-09-02"
          isToday={false}
          onPrevDay={handlePrev}
          onNextDay={handleNext}
          onGoToToday={handleToday}
          onDateChange={handleChange}
        />
      </LanguageProvider>
    );

    await user.click(screen.getByLabelText('Previous Day'));
    expect(handlePrev).toHaveBeenCalledTimes(1);

    await user.click(screen.getByLabelText('Next Day'));
    expect(handleNext).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText(/Jump to Today|Aujourd'hui/i));
    expect(handleToday).toHaveBeenCalledTimes(1);
  });

  it('TodayHistoryList displays 5 recent slots and handles selection', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(
      <LanguageProvider>
        <TodayHistoryList
          selectedDate="2026-09-02"
          observations={[
            {
              id: 'obs-1',
              date: '2026-09-02',
              cycleDay: 1,
              bleeding: 'H',
              stamp: 'RED',
              codeString: 'H',
            },
          ]}
          onSelectDate={handleSelect}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('H')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(5);

    await user.click(buttons[0]!);
    expect(handleSelect).toHaveBeenCalled();
  });

  it('TodayFertilityGuidance renders correctly in card and banner variants', () => {
    const { rerender } = render(
      <LanguageProvider>
        <TodayFertilityGuidance
          stamp="WHITE_BABY"
          currentCode="10KL"
          isEmpty={false}
          isManualPeak={false}
          intercourse={true}
          variant="card"
        />
      </LanguageProvider>
    );

    expect(screen.getByText('10KL')).toBeInTheDocument();
    expect(screen.getByText(/Fertile cervical mucus present/i)).toBeInTheDocument();

    rerender(
      <LanguageProvider>
        <TodayFertilityGuidance
          stamp="RED"
          currentCode="H"
          isEmpty={false}
          isManualPeak={false}
          intercourse={false}
          variant="banner"
        />
      </LanguageProvider>
    );

    expect(screen.getByText(/Menses phase/i)).toBeInTheDocument();
  });

  it('TodayHistoryList draws the empty stamp for each day with no code', () => {
    const { container } = render(
      <LanguageProvider>
        <TodayHistoryList
          selectedDate="2026-09-02"
          observations={[
            { id: 'obs-1', date: '2026-09-02', cycleDay: 1, stamp: 'DARK_GREEN', codeString: '' },
          ]}
          onSelectDate={vi.fn()}
        />
      </LanguageProvider>
    );
    // The saved day with notes only and the 4 days with no observation
    expect(container.querySelectorAll('.stamp-empty')).toHaveLength(5);
    expect(container.querySelector('.stamp-dark_green')).toBeNull();
  });
});
