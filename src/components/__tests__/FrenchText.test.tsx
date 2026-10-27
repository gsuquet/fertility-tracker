import { screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { CalendarGrid } from '../CalendarGrid';
import { ChartRow } from '../ChartRow';
import { CycleAnalyticsView } from '../CycleAnalyticsView';
import { CyclePicker } from '../CyclePicker';
import { CycleStatsHeader } from '../CycleStatsHeader';
import { ExportModal } from '../ExportModal';
import { Footer } from '../Footer';
import { Header } from '../Header';
import { MobileNav } from '../MobileNav';
import { ObservationDrawer } from '../ObservationDrawer';
import { PrintExportView } from '../PrintExportView';
import { StampBadge } from '../StampBadge';
import { TodayView } from '../TodayView';
import { VersionModal } from '../VersionModal';
import { WelcomeModal } from '../WelcomeModal';
import { useCycleUi } from '../../context/CycleContext';
import { buildDemoObservations } from '../../domain/demoData';
import { fr, formatMessage } from '../../i18n';
import { makeObservation } from '../../test/factories';
import { renderWithProviders } from '../../test/render';
import type { Observation } from '../../types/crms';

// Today is 2026-09-15 in these tests
const TODAY = '2026-09-15';
const demo = () => buildDemoObservations(TODAY);
const inFrench = (observations?: Observation[], selectedCycleId?: string) => ({
  language: 'fr' as const,
  ...(observations ? { observations } : {}),
  ...(selectedCycleId ? { selectedCycleId } : {}),
});

/** Opens the drawer on one observation */
const OpenDrawer = ({ obs }: { obs: Observation }) => {
  const { setIsDrawerOpen, setSelectedObservation } = useCycleUi();
  return (
    <button
      type="button"
      onClick={() => {
        setSelectedObservation(obs);
        setIsDrawerOpen(true);
      }}
    >
      open
    </button>
  );
};

describe('French text of the components', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('translates the calendar month, weekdays, buttons and day labels', () => {
    renderWithProviders(<CalendarGrid />, inFrench());
    expect(screen.getByRole('heading', { name: 'Septembre 2026' })).toBeInTheDocument();
    expect(screen.getByText('Lun')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fr.calendar.prevMonth })).toHaveAttribute(
      'title',
      fr.calendar.prevMonth
    );
    expect(screen.getByRole('button', { name: fr.calendar.futureDisabled })).toBeDisabled();
    const day = screen.getByRole('button', {
      name: formatMessage(fr.calendar.dayLabel, {
        date: '2026-09-01',
        status: fr.calendar.noObservation,
      }),
    });
    expect(within(day).getByText(fr.calendar.add)).toBeInTheDocument();
    expect(within(day).getByTitle(fr.calendar.clickToAdd)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: fr.calendar.prevMonth }));
    expect(screen.getByRole('button', { name: fr.calendar.nextMonth })).toBeEnabled();
  });

  it('translates the calendar label of a day with an observation', () => {
    renderWithProviders(
      <CalendarGrid />,
      inFrench([makeObservation({ date: '2026-09-02', codeString: '0' })])
    );
    expect(
      screen.getByRole('button', {
        name: formatMessage(fr.calendar.dayLabel, {
          date: '2026-09-02',
          status: formatMessage(fr.calendar.observationStatus, { code: '0' }),
        }),
      })
    ).toBeInTheDocument();
  });

  it('translates the empty state of the analytics', () => {
    renderWithProviders(<CycleAnalyticsView />, inFrench());
    expect(screen.getByRole('heading', { name: fr.analytics.emptyTitle })).toBeInTheDocument();
    expect(screen.getByText(fr.analytics.emptyText)).toBeInTheDocument();
  });

  it('translates the analytics of one cycle', () => {
    renderWithProviders(<CycleAnalyticsView />, inFrench(demo()));
    expect(screen.getByText(fr.analytics.stampRed)).toBeInTheDocument();
    expect(screen.getByText(fr.analytics.stampDarkGreen)).toBeInTheDocument();
    expect(screen.getByText(fr.analytics.stampWhite)).toBeInTheDocument();
    expect(screen.getByText(fr.analytics.stampLightGreen)).toBeInTheDocument();
    expect(screen.getByText(fr.analytics.mensesDays)).toBeInTheDocument();
    expect(screen.getByText(fr.analytics.dryDays)).toBeInTheDocument();
    expect(screen.getByText(fr.analytics.fertileDays)).toBeInTheDocument();
    expect(screen.getByText(fr.analytics.postPeakDays)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: `${fr.analytics.phasesTitle} ${formatMessage(fr.analytics.cycleInTitle, { number: 2 })}`,
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/^JC\d+$/).length).toBeGreaterThan(0);
    expect(screen.getByText(/au total$/)).toBeInTheDocument();
    expect(screen.getByText(/^JC \d+ \(\d{4}-\d{2}-\d{2}\)$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: fr.analytics.mcsGuideTitle }));
    expect(screen.getByText(fr.analytics.mcsDry)).toBeInTheDocument();
    expect(screen.getByText(fr.analytics.mcsStretch10)).toBeInTheDocument();
    expect(screen.getByText(formatMessage(fr.analytics.mcsPoints, { points: 10 }))).toBeVisible();
  });

  it('translates the analytics of all the cycles', () => {
    const observations = demo();
    renderWithProviders(<CycleAnalyticsView />, inFrench(observations, 'all'));
    expect(
      screen.getByRole('heading', {
        name: `${fr.analytics.phasesTitle} ${fr.analytics.allCyclesCombined}`,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        formatMessage(fr.analytics.cycleStarted, { number: 1, date: observations[0]!.date })
      )
    ).toBeInTheDocument();
  });

  it('translates the cycle picker', () => {
    renderWithProviders(<CyclePicker />, inFrench(demo()));
    const button = screen.getByRole('button', { name: fr.cyclePicker.buttonLabel });
    expect(button).toHaveAttribute('title', fr.cyclePicker.buttonTitle);
    expect(button).toHaveTextContent(formatMessage(fr.common.cycleNumber, { number: 2 }));

    fireEvent.click(button);
    expect(screen.getByText(fr.cyclePicker.menuTitle)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fr.cyclePicker.closeMenu })).toBeInTheDocument();
    expect(screen.getByText(fr.cyclePicker.allCycles)).toBeInTheDocument();
    expect(
      screen.getByText(formatMessage(fr.cyclePicker.displayAll, { count: 2 }))
    ).toBeInTheDocument();
    expect(screen.getByText(fr.cyclePicker.current)).toBeInTheDocument();
    expect(screen.getAllByText(/^Début le .* jours saisis$/)).toHaveLength(2);

    fireEvent.click(screen.getByRole('option', { name: new RegExp(fr.cyclePicker.allCycles) }));
    expect(button).toHaveTextContent(formatMessage(fr.cyclePicker.allCyclesCount, { count: 2 }));
    expect(button).toHaveTextContent(formatMessage(fr.cyclePicker.allShort, { count: 2 }));
  });

  it('uses the singular for a cycle with one observation', () => {
    renderWithProviders(<CyclePicker />, inFrench([makeObservation({ date: TODAY })]));
    const button = screen.getByRole('button', { name: fr.cyclePicker.buttonLabel });
    expect(button).toHaveTextContent(
      formatMessage(fr.cyclePicker.cycleWithDate, { number: 1, date: TODAY })
    );
    fireEvent.click(button);
    expect(
      screen.getByText(formatMessage(fr.cyclePicker.startedOneDay, { date: TODAY, count: 1 }))
    ).toBeInTheDocument();
  });

  it('translates the footer', () => {
    renderWithProviders(<Footer onOpenWelcome={() => {}} />, inFrench());
    expect(screen.getByRole('contentinfo', { name: fr.footer.label })).toBeInTheDocument();
    expect(screen.getByText(fr.footer.legalTitle)).toBeInTheDocument();
    expect(screen.getByText(fr.footer.medicalTitle)).toBeInTheDocument();
    expect(screen.getByText(fr.footer.userGuide)).toBeInTheDocument();
    expect(
      screen.getByText(formatMessage(fr.footer.copyright, { year: 2026 }))
    ).toBeInTheDocument();
  });

  it('translates the header and the mobile menu', () => {
    renderWithProviders(
      <Header
        activeTab="today"
        setActiveTab={() => {}}
        onOpenExport={() => {}}
        onOpenVersion={() => {}}
        onOpenWelcome={() => {}}
      />,
      inFrench()
    );
    expect(screen.getByRole('button', { name: fr.menu.homeLabel })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: fr.menu.mainNavLabel })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fr.menu.languageLabel })).toHaveAttribute(
      'title',
      fr.menu.languageTitle
    );
    expect(screen.getByRole('button', { name: fr.menu.themeToggleLabel })).toBeInTheDocument();
    const more = screen.getByRole('button', { name: fr.menu.moreActionsLabel });
    expect(more).toHaveAttribute('title', fr.menu.moreActionsTitle);

    fireEvent.click(more);
    const sheet = screen.getByRole('dialog', { name: fr.menu.mobileMenuLabel });
    expect(within(sheet).getByRole('button', { name: fr.menu.closeMenu })).toBeInTheDocument();
  });

  it('translates the mobile navigation', () => {
    renderWithProviders(<MobileNav activeTab="today" setActiveTab={() => {}} />, inFrench());
    expect(screen.getByRole('navigation', { name: fr.mobileTabs.navLabel })).toBeInTheDocument();
  });

  it('translates the drawer title and close button for a saved observation', () => {
    const saved = makeObservation({ date: TODAY, codeString: '0' });
    renderWithProviders(
      <>
        <ObservationDrawer />
        <OpenDrawer obs={saved} />
      </>,
      inFrench([saved])
    );
    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByRole('heading', { name: fr.drawer.editTitle })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fr.drawer.close })).toBeInTheDocument();
  });

  it('prints the practitioner report in the language of the interface', () => {
    renderWithProviders(<PrintExportView selectedCycleIds={['all']} />, inFrench(demo()));
    expect(screen.getByRole('heading', { name: fr.printExport.title })).toBeInTheDocument();
    expect(screen.getByText(fr.printExport.subtitle)).toBeInTheDocument();
    expect(
      screen.getByText(formatMessage(fr.printExport.exportDate, { date: '15/09/2026' }))
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatMessage(fr.printExport.cyclesIncluded, { count: 2 }))
    ).toBeInTheDocument();
    expect(screen.getByText(fr.chartStrip.legendTitle)).toBeInTheDocument();
    expect(screen.getByText(fr.chartStrip.legendDry)).toBeInTheDocument();
    expect(
      screen.getByText(`${fr.chartStrip.phaseMenses} ${fr.chartStrip.legendBleeding}`)
    ).toBeInTheDocument();
    expect(screen.getByText(fr.labels.intercourse)).toBeInTheDocument();
    expect(screen.getAllByText(/^Jour Sommet \(P\) : jour \d+$/).length).toBeGreaterThan(0);
  });

  it('translates the chart strip, its cells, popover, phases and legend', () => {
    renderWithProviders(<ChartRow />, inFrench(demo()));
    expect(screen.getAllByRole('button', { name: /^Jour du cycle 1, date / }).length).toBe(1);
    expect(screen.getByRole('button', { name: /, aujourd’hui$/ })).toBeInTheDocument();
    expect(screen.getAllByTitle(fr.todayView.todayLabel).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: fr.chartStrip.scrollLeft })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fr.chartStrip.scrollRight })).toBeInTheDocument();
    expect(screen.getAllByText(/^Jour Sommet \(P\) : jour \d+$/).length).toBeGreaterThan(0);

    const [cell] = screen.getAllByRole('button', { name: /^Jour du cycle 1, / }) as [HTMLElement];
    fireEvent.mouseEnter(cell);
    expect(within(cell).getByText(fr.chartStrip.popoverCode)).toBeInTheDocument();
    expect(within(cell).getByText(fr.chartStrip.popoverBleeding)).toBeInTheDocument();
    expect(within(cell).getByText(fr.chartStrip.clickToEdit)).toBeInTheDocument();
    expect(
      within(cell).getByText(formatMessage(fr.common.dayNumber, { day: 1 }))
    ).toBeInTheDocument();

    const phases = screen.getByRole('button', { name: fr.chartStrip.phases });
    expect(phases).toHaveAttribute('title', fr.chartStrip.togglePhases);
    expect(
      screen.getAllByTitle(
        formatMessage(fr.chartStrip.dayPhase, { day: 1, phase: fr.chartStrip.phaseMenses })
      ).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByTitle(/^Jour \d+ : (Glaire fertile|Sec \/ infertile)$/).length
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: fr.chartStrip.showLegend }));
    expect(screen.getByText(fr.chartStrip.legendTitle)).toBeInTheDocument();
    expect(
      screen.getByText(`${fr.chartStrip.phasePeak} ${fr.chartStrip.legendPeak}`)
    ).toBeInTheDocument();
  });

  it('translates the popover rows of stretch, modifiers, intercourse and symptoms', () => {
    const obs = makeObservation({
      date: TODAY,
      codeString: '10KL I AP',
      stretch: '10',
      modifiers: ['K', 'L'],
      intercourse: true,
      symptoms: ['AP'],
    });
    renderWithProviders(<ChartRow />, inFrench([obs]));
    const cell = screen.getByRole('button', { name: /^Jour du cycle 1, / });
    expect(
      within(cell).getByTitle(formatMessage(fr.chartStrip.symptomsTitle, { symptoms: 'AP' }))
    ).toBeInTheDocument();
    fireEvent.focus(cell);
    expect(within(cell).getByText(fr.chartStrip.popoverStretch)).toBeInTheDocument();
    expect(within(cell).getByText(fr.chartStrip.popoverModifiers)).toBeInTheDocument();
    expect(within(cell).getByText(fr.chartStrip.popoverIntercourse)).toBeInTheDocument();
    expect(within(cell).getByText(fr.chartStrip.popoverYes)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /- vide\. Cliquez pour ajouter/ })).toHaveLength(
      34
    );
  });

  it('translates the blank chart grid', () => {
    renderWithProviders(<ChartRow />, inFrench());
    expect(screen.getByText(fr.chartStrip.blankHint)).toBeInTheDocument();
    expect(
      screen.getByText(`${fr.chartStrip.cycleBadge} 1 ${fr.chartStrip.blankDays}`)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: formatMessage(fr.chartStrip.blankCellLabel, {
          day: 1,
          date: TODAY,
          today: fr.chartStrip.todaySuffix,
        }),
      })
    ).toBeInTheDocument();
  });

  it('translates the stamp intercourse title', () => {
    renderWithProviders(<StampBadge stamp="DARK_GREEN" intercourse />, inFrench());
    expect(screen.getByTitle(fr.labels.intercourse)).toBeInTheDocument();
  });

  it('translates the stats header', () => {
    renderWithProviders(<CycleStatsHeader />, inFrench(demo(), 'all'));
    expect(screen.getAllByText(/\(moy\.\)$/).length).toBe(2);
    expect(screen.getByText(/^JC \d+ \(/)).toBeInTheDocument();
  });

  it('translates the version dialog pills and tagline', () => {
    renderWithProviders(<VersionModal isOpen onClose={() => {}} />, inFrench());
    expect(screen.getByText(/^Spéc\. CrMS v/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByText(fr.versionTracker.tabSystemInfo)[0]!);
    expect(screen.getByText(fr.versionTracker.openSourceTagline)).toBeInTheDocument();
  });

  it('translates the welcome guide steps', () => {
    renderWithProviders(<WelcomeModal isOpen onClose={() => {}} />, inFrench());
    expect(screen.getByRole('tablist', { name: fr.welcomeModal.stepsLabel })).toBeInTheDocument();
    fireEvent.click(screen.getByTitle(formatMessage(fr.welcomeModal.goToStep, { step: 3 })));
    expect(screen.getByText(fr.todayView.modeDetailed, { selector: 'span' })).toBeInTheDocument();
  });

  it('translates the today form titles, placeholder, day badge and saved state', () => {
    renderWithProviders(
      <TodayView />,
      inFrench([makeObservation({ date: TODAY, codeString: '0' })])
    );
    expect(screen.getByTitle(fr.todayView.modeDirectTitle)).toBeInTheDocument();
    expect(screen.getByTitle(fr.todayView.modeDetailedTitle)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(fr.todayView.notesPlaceholder)).toBeInTheDocument();
    expect(screen.getByText(fr.todayView.savedLabel)).toBeInTheDocument();
    expect(screen.getByText(formatMessage(fr.common.dayNumber, { day: 1 }))).toBeInTheDocument();
  });

  it('translates the close button of the export dialog', () => {
    renderWithProviders(
      <ExportModal isOpen onClose={() => {}} onPreparePrint={() => {}} />,
      inFrench()
    );
    expect(screen.getByRole('button', { name: fr.exportModal.close })).toBeInTheDocument();
  });
});
