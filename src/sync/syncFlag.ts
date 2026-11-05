/**
 * The sync stays off until the relay has its R2 bucket. The pull request that adds the binding
 * in wrangler.json also sets this flag. See docs/how-to/set-up-the-sync-relay.md.
 *
 * Before the flag goes on, the application must also follow ADR 0012: "on this device only" or
 * "on all devices" for Delete all data and Replace, no join while an undo copy exists, and no
 * Load demo data in the welcome guide while the device is in a vault.
 */
export const SYNC_ENABLED: boolean = false;
