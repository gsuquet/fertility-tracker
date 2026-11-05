import { afterEach, describe, expect, it } from 'vitest';
import { takeInviteFragment } from '../inviteUrl';

describe('takeInviteFragment', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
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
});
