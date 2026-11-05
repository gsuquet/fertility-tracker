/** The Worker of the application. See docs/reference/deployment.md#requests-to-the-worker. */
import { handleRelay } from './handler';
import type { RelayEnv } from './handler';

export interface WorkerEnv extends RelayEnv {
  /** The static assets of `dist`. */
  ASSETS: { fetch(request: Request): Promise<Response> };
}

/** Cloudflare runs the Worker first only for /api/. The other paths get the static assets. */
export default {
  fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const { pathname } = new URL(request.url);
    return pathname.startsWith('/api/') ? handleRelay(request, env) : env.ASSETS.fetch(request);
  },
};
