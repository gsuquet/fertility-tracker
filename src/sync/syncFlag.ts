/**
 * The sync stays off until the relay has its R2 bucket. The pull request that adds the binding
 * in wrangler.json also sets this flag. See docs/how-to/set-up-the-sync-relay.md.
 */
export const SYNC_ENABLED: boolean = false;
