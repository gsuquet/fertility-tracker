import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { en, fr } from '../../i18n';
import { disableBadge } from '../../pwa/appBadge';
import { renderWithProviders } from '../../test/render';
import { AppBadgeSetting } from '../AppBadgeSetting';

const installBadgeApi = () => {
  for (const name of ['setAppBadge', 'clearAppBadge']) {
    Object.defineProperty(navigator, name, {
      value: vi.fn(() => Promise.resolve()),
      configurable: true,
    });
  }
};

afterEach(() => {
  Reflect.deleteProperty(navigator, 'setAppBadge');
  Reflect.deleteProperty(navigator, 'clearAppBadge');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  disableBadge();
});

describe('AppBadgeSetting', () => {
  it('does not show without the Badging API', () => {
    const { container } = renderWithProviders(<AppBadgeSetting />);
    expect(container).toBeEmptyDOMElement();
  });

  it('turns the badge on and off, and tells that it works only while the app is open', async () => {
    installBadgeApi();
    // Chromium needs no permission, so the hint does not tell about it
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Chrome/140.0');
    renderWithProviders(<AppBadgeSetting />);
    const toggle = screen.getByRole('checkbox', { name: en.appBadge.label });
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveAccessibleDescription(en.appBadge.hint);
    expect(toggle).toBeEnabled();
    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(toggle).toBeChecked();
    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(toggle).not.toBeChecked();
  });

  it('tells why iOS asks for the permission, and what to do when it is refused', async () => {
    installBadgeApi();
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone)');
    let answer: (permission: string) => void = () => {};
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn(
        () =>
          new Promise<string>(resolve => {
            answer = resolve;
          })
      ),
    });
    renderWithProviders(<AppBadgeSetting />, { language: 'fr' });
    const toggle = screen.getByRole('checkbox', { name: fr.appBadge.label });
    expect(toggle).toHaveAccessibleDescription(`${fr.appBadge.hint} ${fr.appBadge.iosPermission}`);
    await act(async () => {
      fireEvent.click(toggle);
    });
    // While the system asks, a second tap does not ask again
    expect(toggle).toBeDisabled();
    await act(async () => {
      answer('denied');
    });
    expect(toggle).toBeEnabled();
    expect(toggle).not.toBeChecked();
    expect(screen.getByRole('alert')).toHaveTextContent(fr.appBadge.denied);
  });
});
