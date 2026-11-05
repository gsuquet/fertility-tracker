/**
 * The relay has its R2 bucket in wrangler.json (docs/how-to/set-up-the-sync-relay.md). The sync
 * stays off until the application follows ADR 0012: "on this device only" or
 * "on all devices" for Delete all data and Replace, no Load demo data in the welcome guide while
 * the device is in a vault, and the QR code of the invitation.
 */
export const SYNC_ENABLED: boolean = false;
