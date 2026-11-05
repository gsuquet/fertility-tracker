/**
 * The sync stays off until the relay has its R2 bucket. The pull request that adds the binding
 * in wrangler.json also sets this flag. See docs/how-to/set-up-the-sync-relay.md.
 *
 * Before the flag goes on, Settings must also follow ADR 0012: no Load demo data in a vault,
 * "on this device only" or "on all devices" for Delete all data and Replace, and no join while
 * an undo copy exists.
 */
export const SYNC_ENABLED: boolean = false;
