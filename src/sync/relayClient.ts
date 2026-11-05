/** The client of the relay: one function for each route. See docs/reference/sync-client.md. */
import type { InviteStep } from '../relay/invites';

export type RelayResult =
  | { ok: true; status: number; text: string; etag: string | null }
  | { ok: false; status: number; error: string };

/** A request to the relay that takes longer fails as a network error. */
export const RELAY_TIMEOUT_MS = 30_000;

export type Fetcher = (request: Request) => Promise<Response>;

export interface RelayClient {
  getVault(vaultId: string, token: string): Promise<RelayResult>;
  /** With a null ETag, the write makes a new vault. */
  putVault(vaultId: string, token: string, text: string, etag: string | null): Promise<RelayResult>;
  getRecovery(lookupId: string): Promise<RelayResult>;
  putRecovery(
    lookupId: string,
    token: string,
    vaultId: string,
    text: string,
    etag: string | null
  ): Promise<RelayResult>;
  deleteRecovery(lookupId: string, token: string): Promise<RelayResult>;
  putInvite(inviteId: string, token: string, vaultId: string): Promise<RelayResult>;
  getInvite(inviteId: string, token: string): Promise<RelayResult>;
  postInvite(
    inviteId: string,
    step: InviteStep,
    message: unknown,
    token?: string
  ): Promise<RelayResult>;
  deleteInvite(inviteId: string, token: string): Promise<RelayResult>;
}

interface Call {
  method: string;
  path: string;
  token?: string | undefined;
  body?: string;
  headers?: Record<string, string>;
}

const condition = (etag: string | null): Record<string, string> =>
  etag === null ? { 'If-None-Match': '*' } : { 'If-Match': `"${etag}"` };

const errorOf = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === 'string' ? body.error : 'unknown';
  } catch {
    return 'unknown';
  }
};

export function createRelayClient(
  fetcher: Fetcher = request => fetch(request),
  origin: string = globalThis.location.origin
): RelayClient {
  const call = async ({ method, path, token, body, headers = {} }: Call): Promise<RelayResult> => {
    const all = new Headers(headers);
    if (token !== undefined) all.set('Authorization', `Bearer ${token}`);
    // A stalled network gives a network error, so that Settings does not wait forever
    const init: RequestInit = {
      method,
      headers: all,
      cache: 'no-store',
      // Cloudflare Access redirects to its sign-in page, which the CSP blocks: see the redirect
      redirect: 'manual',
      signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
    };
    if (body !== undefined) init.body = body;
    let response: Response;
    try {
      response = await fetcher(new Request(`${origin}/api/${path}`, init));
    } catch {
      return { ok: false, status: 0, error: 'network' };
    }
    if (response.type === 'opaqueredirect') return { ok: false, status: 302, error: 'signIn' };
    if (!response.ok) return { ok: false, status: response.status, error: await errorOf(response) };
    const etag = response.headers.get('ETag');
    return {
      ok: true,
      status: response.status,
      text: await response.text(),
      etag: etag === null ? null : etag.replace(/^W\//, '').replaceAll('"', ''),
    };
  };
  return {
    getVault: (vaultId, token) => call({ method: 'GET', path: `vaults/${vaultId}`, token }),
    putVault: (vaultId, token, text, etag) =>
      call({
        method: 'PUT',
        path: `vaults/${vaultId}`,
        token,
        body: text,
        headers: condition(etag),
      }),
    getRecovery: lookupId => call({ method: 'GET', path: `recovery/${lookupId}` }),
    putRecovery: (lookupId, token, vaultId, text, etag) =>
      call({
        method: 'PUT',
        path: `recovery/${lookupId}`,
        token,
        body: text,
        headers: { ...condition(etag), 'X-Vault-Id': vaultId },
      }),
    deleteRecovery: (lookupId, token) =>
      call({ method: 'DELETE', path: `recovery/${lookupId}`, token }),
    putInvite: (inviteId, token, vaultId) =>
      call({
        method: 'PUT',
        path: `invites/${inviteId}`,
        token,
        headers: { 'X-Vault-Id': vaultId },
      }),
    getInvite: (inviteId, token) => call({ method: 'GET', path: `invites/${inviteId}`, token }),
    postInvite: (inviteId, step, message, token) =>
      call({
        method: 'POST',
        path: `invites/${inviteId}/${step}`,
        token,
        body: JSON.stringify(message),
      }),
    deleteInvite: (inviteId, token) =>
      call({ method: 'DELETE', path: `invites/${inviteId}`, token }),
  };
}
