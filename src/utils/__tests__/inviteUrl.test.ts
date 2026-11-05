import { afterEach, describe, expect, it, vi } from 'vitest';
import { takeInviteFragment } from '../inviteUrl';
import { KEPT_INVITE_KEY } from '../signIn';

describe('takeInviteFragment', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('gives the invitation fragment and removes it from the address', () => {
    window.history.replaceState({ ftLayerDepth: 0 }, '', '/app/?a=1#invite=abc.def');
    expect(takeInviteFragment()).toBe('#invite=abc.def');
    expect(window.location.href).toMatch(/\/app\/\?a=1$/);
    expect(window.history.state).toEqual({ ftLayerDepth: 0 });
  });

  it('gives null for another fragment, and keeps it', () => {
    window.history.replaceState(null, '', '/#chart');
    expect(takeInviteFragment()).toBeNull();
    expect(window.location.hash).toBe('#chart');
  });

  it('gives the invitation that the join dialog kept during a sign-in, one time', () => {
    sessionStorage.setItem(KEPT_INVITE_KEY, '#invite=abc.def');
    expect(takeInviteFragment()).toBe('#invite=abc.def');
    expect(takeInviteFragment()).toBeNull();
    sessionStorage.setItem(KEPT_INVITE_KEY, '#other');
    expect(takeInviteFragment()).toBeNull();
    expect(sessionStorage.getItem(KEPT_INVITE_KEY)).toBeNull();
  });

  it('gives null when the browser blocks the session storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(takeInviteFragment()).toBeNull();
  });
});
