import { afterEach, describe, expect, it, vi } from 'vitest';
import { SIGN_IN_PATH as WORKER_SIGN_IN_PATH } from '../../sw/serviceWorker';
import { SIGN_IN_PATH, leaveSignInPath, signInAgain } from '../signIn';

describe('signIn', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  it('goes to the sign-in path next to the app', () => {
    window.history.replaceState(null, '', '/app/?a=1');
    const assign = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: window.location.href,
      assign,
    });
    signInAgain();
    expect(assign).toHaveBeenCalledWith(`${window.location.origin}/app/sign-in`);
  });

  it('changes the sign-in path to the app address, and keeps the query, the fragment and the state', () => {
    window.history.replaceState({ ftLayerDepth: 0 }, '', '/app/sign-in?a=1#chart');
    leaveSignInPath();
    expect(window.location.pathname).toBe('/app/');
    expect(window.location.search).toBe('?a=1');
    expect(window.location.hash).toBe('#chart');
    expect(window.history.state).toEqual({ ftLayerDepth: 0 });
  });

  it('keeps another address', () => {
    window.history.replaceState(null, '', '/app/sign-in-later');
    leaveSignInPath();
    expect(window.location.pathname).toBe('/app/sign-in-later');
  });
});

describe('SIGN_IN_PATH', () => {
  it('is the path that the service worker gets from the network', () => {
    expect(SIGN_IN_PATH).toBe(WORKER_SIGN_IN_PATH);
  });
});
