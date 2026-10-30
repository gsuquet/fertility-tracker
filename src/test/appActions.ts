import { fireEvent, screen, within } from '@testing-library/react';
import { en } from '../i18n';

/**
 * The paths of a user to the dialogs of the app (RFC 0002): Share chart is in the ⋮ menu of
 * Chart, the guide and About are in Settings, and the version notes are in the footer.
 */

/** Opens Share chart from the ⋮ menu of Chart, when the chart page has loaded */
export const openShareChartNow = () => {
  fireEvent.click(screen.getByRole('tab', { name: en.tabs.chart }));
  fireEvent.click(screen.getByRole('button', { name: en.chartStrip.optionsLabel }));
  fireEvent.click(screen.getByRole('menuitem', { name: en.chartStrip.shareChart }));
};

/** Opens Share chart from the ⋮ menu of Chart. The chart page is a lazy chunk. */
export const openShareChart = async () => {
  fireEvent.click(screen.getByRole('tab', { name: en.tabs.chart }));
  await screen.findByRole('button', { name: en.chartStrip.optionsLabel });
  openShareChartNow();
};

/** Opens Settings with the gear and clicks one of its buttons */
export const openFromSettings = async (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: en.settings.open }));
  const settings = await screen.findByRole('dialog', { name: en.settings.title });
  fireEvent.click(within(settings).getByRole('button', { name }));
};

/** Opens the release notes from the version number of the footer */
export const openVersionNotes = () =>
  fireEvent.click(
    within(screen.getByRole('contentinfo')).getByRole('button', { name: /^v\d+\.\d+\.\d+$/ })
  );
