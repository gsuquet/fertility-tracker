/** The Pages Function of the relay. Cloudflare runs it for each request to /api/. */
import { handleRelay } from '../../src/relay/handler';
import type { RelayEnv } from '../../src/relay/handler';

export const onRequest = (context: { request: Request; env: RelayEnv }): Promise<Response> =>
  handleRelay(context.request, context.env);
