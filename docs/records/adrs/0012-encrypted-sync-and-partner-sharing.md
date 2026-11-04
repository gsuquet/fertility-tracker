# ADR 0012: End-to-end encrypted sync and partner sharing

- **Date:** 2026-11-04
- **Status:** Accepted
- **Decision makers:** Gabriel

This ADR supersedes [ADR 0001](0001-automated-backup-and-sync-privacy.md). It keeps the goals of ADR 0001 and its Cloudflare relay. It changes how the data moves, how the keys work and how a partner gets access.

## Context and problem

The application keeps the observations only in the `localStorage` of one browser. The main goal is to share the chart with a partner. The user also wants the same chart on a phone and a computer, and a copy that survives the loss of a device. How can devices and a partner share the observations, while the server and the host never read them?

## Decision drivers

- Partner sharing is the main goal. The partner reads the chart. The partner cannot change it.
- The server, Cloudflare and the network must never see an observation, a code or a note in clear text.
- The application must work offline. A sync must not lose a day that a device recorded offline.
- The design must use the most secure option when two options are possible. A leaked link or a lost device must not give access to new data.
- Only the important data syncs: the observations. The settings of each device stay on that device.
- The project accepts that Cloudflare sees IP addresses and the times of the syncs. Cloudflare already sees the IP addresses of the visitors.
- The application stays a static site on Cloudflare Pages. No second codebase and no separate server.
- The application loads no file and sends no request to a different site. The Content Security Policy stays `connect-src 'self'`.

## Options

- A full encrypted snapshot on a same-origin relay with R2, with a merge on each device (selected).
- Encrypted changes for each observation in D1 or KV, as in ADR 0001.
- An encrypted backup file that the user moves between devices.
- Storage of the user: WebDAV, Nextcloud or Google Drive.
- A direct connection between devices with WebRTC, with or without a CRDT library.

## Decision

Each user has one **vault**. A vault holds one encrypted snapshot of all the observations and one keyring. Each device and each partner is a **member** of the vault with its own key. A Cloudflare Pages Function in this repository keeps the vault in R2 and checks who can read and write. The devices merge the snapshot by date before they write it.

The reasons:

- A full snapshot of one year is about 70 KB of JSON. It is small enough to send at each sync.
- A snapshot shows less to the server than a change for each day.
- A key for each member lets the owner remove a partner or a lost device without new keys on the other devices.

### Data that syncs

The snapshot holds only the fields that the user enters for each day:

| Field                                                          | Syncs |
| -------------------------------------------------------------- | ----- |
| `date`                                                         | Yes   |
| `bleeding`, `stretch`, `modifiers`, `frequency`, `symptoms`    | Yes   |
| `intercourse`, `notes`, `isManualPeak`, `isCycleStart`         | Yes   |
| `id`, `cycleDay`, `stamp`, `codeString`, `isPeakDay`           | No    |
| Language, theme, entry mode, shortcuts, badge, haptics         | No    |
| Backup dates, welcome guide, install banner, last version seen | No    |

Each device calculates `cycleDay`, `stamp`, `codeString` and `isPeakDay` again after a merge. The `id` of an observation is different on each device. Thus, the key of a day is its `date`.

### Encryption

- One random AES-256-GCM **data key** encrypts the snapshot. Only members know it.
- The device compresses the JSON with gzip. Then it adds padding to the next multiple of 16 KB. Then it encrypts the result with a random 12-byte IV.
- The additional data of AES-GCM is the vault id and the format version. Thus, the server cannot move a snapshot to a different vault.
- The snapshot has a counter that increases at each write. A device refuses a snapshot with a counter lower than the last counter that it saw. Thus, the server cannot give an old snapshot.
- The application uses only WebCrypto and `CompressionStream`. It adds no cryptography library.

### Members and keys

| Member          | Key                                                       | Role   | Can                                 |
| --------------- | --------------------------------------------------------- | ------ | ----------------------------------- |
| Each own device | An ECDH P-256 key pair, made on the device                | Owner  | Read, write, add and remove members |
| Recovery code   | A random 128-bit secret, shown one time to the user       | Owner  | Read, write, add and remove members |
| Each partner    | An ECDH P-256 key pair, made on the device of the partner | Reader | Read only                           |

- The keyring has one entry for each member. The entry holds an id, the role, the public key and the hash of an access token. It also holds the data key, wrapped for that member.
- A device keeps its private key and the data key as `CryptoKey` objects in IndexedDB. A private key is not extractable. The data key is extractable only on owner devices, because they wrap it for new members.
- The recovery code is 26 Crockford base32 characters in groups of 4, plus one check character. HKDF-SHA256 derives the vault id, the access token and the wrapping key of the recovery member from it.
- The recovery code uses base32 and not BIP39 words. The two give the same 128 bits. The check character finds a typing error, and base32 needs no word list for each language.
- Owner devices also keep the wrapping key of the recovery member. Thus, they can wrap a new data key for the recovery code after a removal.
- PBKDF2 is not necessary for the recovery code, because the code is random. PBKDF2 with 600,000 iterations applies only to a password that the user selects for an encrypted backup file.

### Adding a member

A device or a partner joins with a one-time invitation and an approval on an owner device:

1. An owner device makes an invitation with a random secret. It shows a QR code and a link `https://<application>/#invite=<id>.<secret>`.
2. The new device opens the link. The browser does not send the fragment after `#` to the server.
3. The new device makes its key pair. It sends its public key and an HMAC of that key with the invitation secret.
4. The two devices show a 6-digit code from a hash of the invitation secret and the public key.
5. The owner compares the two codes and approves. The owner device wraps the data key for the new public key.
6. The invitation stops after its first use or after 24 hours.

The approval stops a person who gets the link but is not next to the owner. The 6-digit code stops a server that changes the public key. The system camera of a phone can read the QR code. Thus, the application needs no camera permission.

On iOS, an installed web application has a storage that is separate from Safari. Thus, the join screen also accepts the invitation as pasted text.

When no own device is available, the user types the recovery code on a new device. The new device then adds itself as an owner device.

### Removing a member

An owner device removes a partner or a lost device in one write:

1. It makes a new data key.
2. It encrypts the snapshot again with the new key.
3. It wraps the new key for each member that stays.
4. It removes the entry of the old member from the keyring.

The server refuses the access token of the removed member at once. A removed partner keeps the data that the partner device already shows. No design can take back data that a person already saw.

### Conflicts and merge

Each device keeps the last snapshot that it merged. This copy is the **base**. A sync compares the local data, the base and the remote snapshot for each date:

| Condition                                               | Result                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| Local and remote are the same as the base               | No change                                                           |
| Only local is different from the base                   | The local day stays. This includes a deleted day.                   |
| Only remote is different from the base                  | The remote day replaces the local day. This includes a deleted day. |
| Local and remote are different from the base, and equal | No change                                                           |
| Else                                                    | The day with the later clock wins. The other goes to the undo copy. |

- The clock is a hybrid logical clock: the time, a counter and the member id. A device saves the clock of a date when the user changes that date.
- The comparison uses only the fields that sync. Arrays are in sort sequence and empty notes are absent.
- A day stays one unit. The merge never combines the bleeding of one device with the mucus of a different device.
- After the merge, a cycle with two manual Peak Days keeps the one with the later clock. Each device applies the same rule, so all the devices get the same result.
- The device writes with `If-Match` and the version of the snapshot that it merged. When the server answers `412`, the device reads the snapshot again, merges again and writes again.
- The base finds deleted days. Thus, the data needs no `deletedAt` field and no tombstones.
- The sync state is in its own `localStorage` key. Thus, the format of `fertility_care_observations` does not change.

**Delete all data** and **Replace** from a file delete days on all the devices. Thus, Settings must ask "on this device only" or "on all devices". "On this device only" removes the device from the vault first. The server keeps the 5 previous snapshots, so an owner can restore a snapshot after an error.

### Partner devices

A partner device keeps the shared chart in a separate `localStorage` key. It never merges the shared chart with observations of its own. It shows the chart read only, with all the fields that sync, the notes too. **Stop viewing** deletes the shared chart and the keys of the vault from that device.

### Relay

| Item      | Value                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------- |
| Code      | Cloudflare Pages Functions in `functions/api/vault/`, in this repository                             |
| Storage   | One R2 bucket, bound in `wrangler.json`                                                              |
| Objects   | `vaults/<id>/snapshot`, `vaults/<id>/keyring`, `vaults/<id>/history/<n>`, `vaults/<id>/invites/<id>` |
| Access    | `Authorization: Bearer <token>`. The server keeps only the SHA-256 of each token.                    |
| Writes    | Only with an owner token, and only with `If-Match` on the snapshot and on the keyring                |
| Limits    | 1 MB for each snapshot. A rate limit for each IP address.                                            |
| Logs      | The function writes no log.                                                                          |
| Retention | R2 deletes a vault 12 months after its last write                                                    |

An owner device writes the snapshot again when the last write is more than 30 days old. Thus, a vault in use never gets to 12 months. A vault without an owner device for 12 months is deleted. The devices still have their local data.

The relay does not need a separate Worker or a second codebase. The Pages project deploys the functions in `functions/` with the static files. The relay has the same origin as the application, so the Content Security Policy does not change. A separate Worker is necessary only for Durable Objects, for example for live updates. This ADR does not select live updates.

### When a sync occurs

- When the application opens
- When the page becomes visible
- When the browser goes online
- 2 seconds after a change of an observation

iOS gives no background sync to a web application. Thus, a phone syncs when the user opens the application. A sync in the last 30 days stops the backup reminder.

### Plan

Each step is one pull request. Each step changes its reference pages first, as [ADR 0004](0004-specification-in-reference-pages.md) requires.

1. Encrypted backup file: the envelope, gzip, padding and a password. No server.
2. Sync engine in `src/domain/sync/`: the merge, the clock and the Peak Day rule. It uses an adapter in memory for tests.
3. Relay and owner devices: the Pages Functions, the keyring, the invitation, the recovery code and Settings.
4. Partner sharing: the reader role, the read-only chart, **Stop viewing** and the removal of a member.

### Consequences

- Good: the server, Cloudflare and the network never see an observation in clear text.
- Good: the owner can remove a partner or a lost device. The other devices keep their keys.
- Good: a leaked invitation link is not sufficient. The owner must approve the device and compare a code.
- Good: no new field on `Observation` and no change to the storage format.
- Good: the relay is about 150 lines in this repository. The free Cloudflare plan is sufficient for thousands of users.
- Bad: the server sees the vault ids, the number of members, the IP addresses, the times of the syncs and the padded size.
- Bad: if the user loses all the devices and the recovery code, nobody can decrypt the vault.
- Bad: a reader has the data key. A reader and a malicious server together can write a false snapshot. A signature of each snapshot by an owner device can stop this later.
- Bad: a malicious deploy of the application can read the data in the browser. This risk is already true for the local data. The service worker keeps a version until the user updates, and the application shows the commit of its build.
- Bad: two devices that change the same day before a sync keep only one version. The other goes to the undo copy.

### Confirmation

- Unit tests of the merge: any sequence of syncs between 3 simulated devices gives the same data on each device.
- Unit tests of the cryptography: a wrong key, a changed byte, a different vault id or an older counter makes the decryption fail.
- Tests of the functions: a reader token cannot write, a removed token gets `401`, and a write without the current version gets `412`.
- An end-to-end test with two browser contexts that change different days offline and then sync.

## Advantages and disadvantages of the options

### Full encrypted snapshot on R2 with a merge on each device

- Good: one object for each vault. R2 supports a conditional write with `If-Match`, and it gives strong consistency.
- Good: the server sees only one padded size, not the number of days or the time of each change.
- Bad: each write sends the full snapshot. One year is about 20 KB after gzip.

### Encrypted changes for each observation in D1 or KV

- Good: a small write for each change.
- Bad: the server sees how many days exist and when each day changes.
- Bad: KV gives eventual consistency and no conditional write. The free plan of KV allows about 1,000 writes each day.
- Bad: it needs `updatedAt` and `deletedAt` in each write path, and tombstones.

### Encrypted backup file

- Good: no server at all.
- Bad: the user must move the file at each change. A partner gets no new data automatically.
- This option stays as step 1 of the plan, as an extra to sync.

### Storage of the user: WebDAV, Nextcloud or Google Drive

- Good: the project keeps no data.
- Bad: the Content Security Policy must allow other sites.
- Bad: each service needs OAuth or a token, and Nextcloud needs CORS settings.
- Bad: a partner needs access to the storage of the user.

### Direct connection with WebRTC

- Good: no server keeps the data.
- Bad: the two devices must be online at the same time. A partner sees new data only when the phone of the owner is open.
- Bad: it still needs a signaling server, and often a TURN server.
- Bad: a CRDT library adds 50 to 200 KB. The data is a map of days by date, so a merge by date gives the same result without a library.

## More information

- [ADR 0001: Automatic backup and synchronization with zero-knowledge privacy](0001-automated-backup-and-sync-privacy.md), superseded by this ADR
- [Privacy and data storage](../../explanation/privacy-and-data-storage.md)
- [Data storage](../../reference/data-storage.md)
- [Data format](../../reference/data-format.md)
