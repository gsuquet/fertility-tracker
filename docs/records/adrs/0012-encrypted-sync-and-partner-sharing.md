# ADR 0012: End-to-end encrypted sync and partner sharing

- **Date:** 2026-11-04
- **Status:** Accepted
- **Decision makers:** Gabriel

This ADR supersedes [ADR 0001](0001-automated-backup-and-sync-privacy.md). It keeps the goals of ADR 0001 and its Cloudflare relay. It changes how the data moves, how the keys work and how a partner gets access. It adds a [Design](#design) section after the options, because the protocol needs exact rules.

## Context and problem

The application keeps the observations only in the `localStorage` of one browser. The main goal is to share the chart with a partner. The user also wants the same chart on a phone and a computer, and a copy that survives the loss of a device. How can devices and a partner share the observations, while the server and the host never read them?

## Decision drivers

- Partner sharing is the main goal. The partner reads the chart. The partner cannot change it.
- The server, Cloudflare and the network must never see an observation, a code or a note in clear text.
- The application must work offline. A sync must not lose a day that a device recorded offline.
- The design must use the most secure option when two options are possible. A leaked link or a removed device must not give access to new data.
- Only the important data syncs: the observations. The settings of each device stay on that device.
- The project accepts that Cloudflare sees IP addresses and the times of the syncs. Cloudflare already sees the IP addresses of the visitors.
- The application stays a static site on Cloudflare Pages. No second codebase and no separate server.
- The application sends no request to a different site. The Content Security Policy stays `connect-src 'self'`.

## Options

- One encrypted and signed vault object in R2, behind a same-origin Pages Function, with a merge on each device.
- Encrypted changes for each observation in D1 or KV, as in ADR 0001.
- An encrypted backup file that the user moves between devices.
- Storage of the user: WebDAV, Nextcloud or Google Drive.
- A direct connection between devices with WebRTC, with or without a CRDT library.

## Decision

The project selects one encrypted and signed vault object in R2, with a merge on each device. With a key for each member, the owner can remove a partner or a device, and the server cannot read, change or add data.

### Consequences

- Good: the server, Cloudflare and the network never see an observation in clear text.
- Good: the server cannot change the data or add a member. It cannot give a vault older than the last one that the device saw.
- Good: the owner can remove a partner or a lost device. The other devices keep their keys.
- Good: a leaked invitation link is not sufficient. The owner must approve the device and compare a code.
- Good: no new field on `Observation` and no change to the storage format.
- Good: the relay is in this repository and deploys with the static files.
- Bad: the server sees the vault ids, the number of members, the IP addresses, the times of the syncs and the padded size.
- Bad: if the user loses all the devices and the recovery code, nobody can decrypt the vault.
- Bad: the server can stop the updates, or give a device the last vault that it saw again and again. To a device that uses the recovery code, it can give an old signed vault, but not one older than the code.
- Bad: after each use of the recovery code and after each removal of an own device, the user must write down a new code.
- Bad: a malicious deploy of the application can read the data in the browser. This risk is already true for the local data.
- Bad: two devices that change the same day before a sync keep only one version as the current day. The other version stays in a conflict list.
- Bad: anyone can make a new vault, because the relay has no accounts. Only the rate limit and the size limits limit the storage.

### Confirmation

- Unit tests of the merge: any sequence of syncs between 3 simulated devices gives the same data on each device. This includes deleted days and Peak Day changes.
- Unit tests of the merge: a device with unreadable data, dropped records or a missing observations key never deletes a remote day.
- Unit tests of the join: when the user of the new device does not confirm the codes, the device sends no day.
- Unit tests of the cryptography: a read fails with a wrong key, a changed byte or a different vault id. It also fails with a wrong signature or an old counter.
- Tests of the functions: a reader token cannot write, a removed token gets `401`, and a write without the current ETag gets `412`.
- An end-to-end test with two browser contexts that change different days offline and then sync.

## Advantages and disadvantages of the options

### One encrypted and signed vault object in R2

- Good: one object for each vault, written with one conditional `PUT` (`If-Match`). R2 gives strong consistency.
- Good: the keyring and the data change together. A failed write cannot leave a key that does not open the data.
- Good: the server sees only one padded size, not the number of days or the time of each change.
- Bad: each write sends the full vault. One year of observations is about 20 KB after gzip.

### Encrypted changes for each observation in D1 or KV

- Good: a small write for each change.
- Bad: the server sees how many days exist and when each day changes.
- Bad: KV gives eventual consistency and no conditional write. The free plan of KV allows about 1,000 writes each day.
- Bad: the server must keep a list of changes for each device that is offline.

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

## Design

### Data that syncs

The vault holds only the fields that the user enters for each day:

| Field                                                          | Syncs |
| -------------------------------------------------------------- | ----- |
| `date`                                                         | Yes   |
| `bleeding`, `stretch`, `modifiers`, `frequency`, `symptoms`    | Yes   |
| `intercourse`, `notes`, `isManualPeak`, `isCycleStart`         | Yes   |
| `id`, `cycleDay`, `stamp`, `codeString`, `isPeakDay`           | No    |
| Language, theme, entry mode, shortcuts, badge, haptics         | No    |
| Backup dates, welcome guide, install banner, last version seen | No    |

Each device calculates `cycleDay`, `stamp`, `codeString` and `isPeakDay` again after a merge. The `id` of an observation is different on each device. Thus, the key of a day is its `date`.

Before a comparison and before a write, each day gets a canonical form:

| Field                              | Canonical form                                                   |
| ---------------------------------- | ---------------------------------------------------------------- |
| `modifiers`, `symptoms`            | Sorted. An empty array is absent.                                |
| `intercourse`, `isManualPeak`      | `true` stays. `false` is absent.                                 |
| `isCycleStart`                     | `true`, `false` and absent are three different values. All stay. |
| `notes`                            | An empty text is absent.                                         |
| `bleeding`, `stretch`, `frequency` | The code stays. A missing code is absent.                        |

A day whose `id` starts with `demo_` (`DEMO_ID_PREFIX`) never goes into the vault. Before a device joins a vault, it removes the demo days. While an undo copy exists, the device refuses to join, and asks the user to click **Undo** or **Delete the copy** first. While the device is in a vault, Settings does not show **Load demo data**.

### Vault object

Each vault is one R2 object, `vaults/<vault id>`. The vault id is 128 random bits. The object has a plain header, a ciphertext and a signature:

| Part       | Content                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------- |
| Header     | Format version, vault id, key id, counter, keyring, signing key chain, earlier data keys |
| Ciphertext | AES-256-GCM of the days, the tombstones and the clocks, after gzip and padding           |
| Signature  | ECDSA P-256 with SHA-256 over the header and the ciphertext                              |

- One random AES-256 **data key** encrypts the ciphertext. Each data key has a key id.
- The device compresses the JSON with gzip. Then it adds padding to the next multiple of 16 KB. Then it encrypts the result with a random 12-byte IV.
- The additional data of AES-GCM is the format version, the vault id, the key id and the counter. Thus, the server cannot move a vault or change its counter.
- The counter increases by 1 at each write. A device refuses a vault with a counter lower than the last counter that it saw. It also refuses the same counter with a different content.
- After a change of the data key, the header keeps the earlier data keys, encrypted with the new data key. Thus, owners can read the history after a removal.
- The application uses only WebCrypto and `CompressionStream`. It adds no cryptography library.

### Signature

- The vault has one ECDSA P-256 **signing key pair**. Only owners have the private key. The keyring wraps it for each owner member.
- Each write has a signature over the header and the ciphertext. Thus, a reader or the server cannot write a false vault.
- The signing key chain lists each signing public key of the vault. Each new key in the chain has a signature by the key before it.
- Each member keeps the newest signing public key that it accepted. At join, this is the key from the owner device. A member walks the chain from its kept key to the current key.
- A member refuses a vault with a wrong signature, or with a signing key that its kept key does not reach through the chain.
- The keyring is in the signed header. Thus, the server cannot add a member or change a public key.

### Members and keys

| Member          | Key                                                       | Role   | Can                                 |
| --------------- | --------------------------------------------------------- | ------ | ----------------------------------- |
| Each own device | An ECDH P-256 key pair, made on the device                | Owner  | Read, write, add and remove members |
| Recovery code   | An ECDH P-256 key pair, opened with a random 128-bit code | Owner  | Read, write, add and remove members |
| Each partner    | An ECDH P-256 key pair, made on the device of the partner | Reader | Read only                           |

- The keyring has one entry for each member. The entry holds an id, the role, the public key and the hash of an access token.
- The entry also holds the data key, wrapped for that member. An owner entry also holds the signing private key, wrapped in the same way.
- To wrap a key, the owner device makes an ephemeral ECDH key pair. It derives a key from the shared secret with HKDF-SHA256. It encrypts with AES-256-GCM.
- The additional data of a wrapped key is the vault id, the member id, the key id and the purpose: `data` or `signing`. Thus, a wrapped key cannot take the place of a different wrapped key.
- A device keeps its private key in IndexedDB as a `CryptoKey` that is not extractable. The data key and the signing private key are extractable only on owner devices, because they wrap them for new members.
- Each member makes its own random access token on its device. It sends only the SHA-256 of the token when it joins, and the owner device puts the hash in the keyring.
- The server refuses a write with a reader token.

### Device names

Each device and each partner has a name that its user types, for example "Phone of Gabriel". The device list of an owner device shows these names ([Removing a member](#removing-a-member)). The server must not see a name.

- The keyring entry of a member holds its name, encrypted with the current data key. Each member that reads the days can read the names.
- The additional data of a name is the vault id, the member id and the key id. Thus, a name cannot move to a different member.
- The keyring is in the signed header. Thus, the server cannot change a name.
- When the data key changes, the owner device encrypts each name again with the new key.
- A name has 1 to 40 characters. The recovery member has no name. The device list calls it "Recovery code".
- A member without a name shows as "Device without a name". For example, a member that joined before this rule has no name.

The device that makes the vault asks its user for a name in **Turn on sync**. A recovery also asks for the name of the new device. A new device asks for its name before it sends its join request.

### Recovery code

- The recovery code is 26 Crockford base32 characters in groups of 4, plus one check character. It holds 128 random bits.
- HKDF-SHA256 derives four values from the code: a lookup id, a lookup key, a wrapping key and the access token of the recovery member.
- The object `recovery/<lookup id>` holds the vault id, encrypted with the lookup key. Thus, a new code does not need a new vault.
- Each owner entry of the keyring holds the current lookup id and a copy of the encrypted lookup object, wrapped like the data key. Readers do not get them. Neither one opens the vault. Thus, each owner device can write the current object again before R2 deletes it.
- The vault keeps the recovery blob, encrypted with the wrapping key. HKDF cannot make an ECDH key pair, so the key pair is random.
- The recovery blob holds the private key of the recovery member, the signing public key and the counter at the time the code is made. Its additional data is the vault id, the lookup id and the purpose `recovery` ([Vault format](../../reference/vault-format.md#wrapped-keys)).
- A device that recovers with the code keeps the signing public key and the counter of the blob. It walks the signing key chain from that key, as at a join. Thus, the server cannot give it a vault that the server made.
- The owner devices do not keep the recovery code or its wrapping key. They keep only the public key of the recovery member. Thus, they can wrap a new data key for the recovery member, but a removed device cannot unwrap it.
- The recovery code uses base32 and not BIP39 words. The two give the same 128 bits. The check character finds a typing error, and base32 needs no word list for each language.
- PBKDF2 is not necessary for the recovery code, because the code is random. PBKDF2 with 600,000 iterations applies only to a password that the user selects for an encrypted backup file.

### Adding a member

A device or a partner joins with a one-time invitation and an approval on an owner device:

1. An owner device makes an invitation with a random secret and a role. It shows a QR code and a link: `https://<application>/#invite=<id>.<secret>`.
2. The new device opens the link. The browser does not send the fragment to the server. The application removes the fragment with `history.replaceState`.
3. The new device makes its key pair, its access token and a random nonce B. It sends the public key, the token hash, a hash of B and its name. It encrypts the name with a key from the invitation secret.
4. The new device also sends an HMAC of these values with the invitation secret.
5. The owner device checks the HMAC. Then it sends a random nonce A, the vault id and the current signing public key to the new device.
6. The new device sends B. The owner device checks B against its hash.
7. The two devices show a 6-digit code from a hash. The hash covers the invitation secret, the public key, A, B, the vault id and the signing public key.
8. The owner compares the two codes in person or by voice. The owner device and the new device each ask their user to confirm that the codes match.
9. After the confirmation on the owner device, the owner device wraps the keys for the new member. It encrypts the name of the new member with the data key.
10. The owner device writes the vault with the new member. Then it signs an answer with the signing private key of the vault.
11. The new device checks the signature with the signing public key of step 5. It uses the keys only after its own user confirmed the codes. It keeps the signing public key and the counter.
12. The invitation stops after its first use or after 24 hours.

- The answer holds the vault id, the member id, the role and the counter of the new vault. The wrapped keys are in the keyring.
- The invitation sets the role. The joining device cannot select its role.
- The HMAC of step 4 stops a server that does not have the link. The 6-digit code stops a person who has the link.
- The server does not have the invitation secret. Thus, it cannot read the name in the join request. The owner device shows the name with the 6-digit code.
- Each device fixes its nonce before it sees the nonce of the other device. Thus, a person with the link cannot try many keys or nonces to get the same code.
- The code covers the signing public key, and the signature of step 10 needs the signing private key. Thus, a server with the link cannot send false keys to the new device.
- Until its user confirms the codes, the new device sends no day and shows no data of the vault.
- The function accepts one join request for each invitation without an access token. The HMAC of step 4 proves the request.
- On an Android phone, the system camera can read the QR code. Thus, the application needs no camera permission. A computer uses the link.

When no own device is available, the user types the recovery code on a new device. The new device opens the recovery member and adds itself as an owner device. Then it makes a new recovery code, as [New recovery code](#new-recovery-code) gives.

### New recovery code

An owner device makes a new recovery code in this sequence:

1. It creates the new `recovery/<lookup id>` object with `If-None-Match: *` and an owner token that is valid now.
2. In one conditional write of the vault, it removes the old recovery member and adds the new one. It follows [Removing a member](#removing-a-member).
3. It deletes the old `recovery/<lookup id>` object.
4. It shows the new code only after the write of step 2 succeeds. The user must write down the code.

### Partner devices on iOS

On iOS, an installed web application has a storage that is separate from Safari. Safari can also delete the storage of a site after 7 days without a visit. `navigator.storage.persist()` does not stop this in Safari.

Thus, on iOS, the partner adds the application to the Home Screen first. Then the partner copies the invitation link and pastes it in the installed application. On iOS, a QR code opens Safari, so the QR code is only for Android phones. When the keys of a vault are missing, the application tells the user to ask for a new invitation.

### Removing a member

An owner device shows the members of the keyring in a device list, with their [names](#device-names) and their roles. The user selects the member to remove in this list.

An owner device removes a partner or a lost device in one conditional write:

1. It makes a new data key and a new key id.
2. It encrypts the days again with the new key.
3. It wraps the new key for each member that stays. It encrypts the name of each member again with the new key.
4. It removes the entry of the old member from the keyring.
5. It signs the new vault and writes it with `If-Match`.

When the removed member is an owner, a device or the recovery code, the owner device also makes a new signing key pair. It adds the new public key to the signing key chain, signed with the old key. After the removal of an owner device, the owner device also makes a new recovery code, as [New recovery code](#new-recovery-code) gives. The removed device can have the old signing key, and the old recovery blob names that key.

A device can also leave the vault itself, for **Delete all data** or **Replace** "on this device only". It does the same rekey with a new signing key, then deletes its own keys. It does not make a new recovery code: the device knows each key that it writes, so a new code from it adds no protection. When the user thinks that someone copied the keys of that device, another owner device must make a new recovery code.

The server refuses the access token of the removed member at once. A removed partner keeps the data that the partner device already shows. No design can take back data that a person already saw.

A removed owner device and a malicious server together can try to write a different vault with the old signing key. Each member accepts only the first new signing key that it sees. This is the remaining risk.

### Conflicts and merge

Each device keeps the last vault content that it merged. This copy is the **base**. Each day and each deleted day has a hybrid logical clock: the time, a counter and the member id. `isManualPeak` has its own clock and is not part of the day comparison.

A sync compares the local data, the base and the remote vault for each date:

| Condition                                               | Result                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| Local and remote are the same as the base               | No change                                                           |
| Only local is different from the base                   | The local day stays. This includes a deleted day.                   |
| Only remote is different from the base                  | The remote day replaces the local day. This includes a deleted day. |
| Local and remote are different from the base, and equal | No change                                                           |
| **Else**                                                | The later clock wins. The other version goes to the conflict list.  |

- 5 seconds after each change, also offline, the device compares its local data with the base. It gives a new clock to each date that changed since the last comparison. Thus, no write path of the application changes.
- Each sync also does this comparison before the merge. Thus, a change saved just before the application closed gets its clock before a merge.
- A deleted day stays in the vault as a tombstone: the date and the clock. A tombstone is small, so the vault keeps it.
- A day stays one unit. The merge never combines the bleeding of one device with the mucus of a different device.
- `isManualPeak` merges for each date by its own clock. A date that gains `isManualPeak` in a comparison gets a Peak Day clock.
- A date that loses `isManualPeak` gets no Peak Day clock when a different date of the same cycle gains it in the same comparison. Else, the loss is an explicit removal and gets a clock.
- After the merge, a cycle with two manual Peak Days keeps the one with the later Peak Day clock. Each device applies the same rule, so all the devices get the same result.
- The device writes with `If-Match` and the ETag of the vault that it merged. When the server answers `412`, the device reads the vault again, merges again and writes again.
- The sync state is in its own `localStorage` key. Thus, the format of `fertility_care_observations` does not change.
- The device writes the base only after the write of `fertility_care_observations` succeeds.

### First sync

When a device with observations joins a vault, its days get clock 0. Thus, on the same date, the day of the vault wins, and the local day goes to the conflict list. A local date that the vault does not have goes into the vault.

### Safety of the local data

At load, when `parseObservationData()` gives `null` or `droppedCount` is more than 0, the device deletes its sync state at once, and thus its base. This occurs before any comparison. The device keeps its keys. Its next sync is a first sync, as [First sync](#first-sync) gives. Then these rules apply:

| Condition                                         | Result                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| `recoveryData` is set                             | No sync. The device does not apply the vault to the local data.            |
| `saveFailed` is true                              | No sync. The device does not apply the vault and does not change the base. |
| The observations key is missing and a base exists | The device reads the vault as a new device. It deletes no day.             |
| A sync deletes more than 7 days                   | The device asks the user before it writes.                                 |
| **Else**                                          | Normal sync                                                                |

### Conflict list

- The days that lose a conflict go to `fertility_care_sync_conflicts`. Sync does not use the undo copy.
- A message tells the user how many days are in the list. The user can restore a day. A restored day is a new local change with a new clock.
- A merge that brings a remote change deletes the undo copy, as `saveObservation()` does. Thus, **Undo** never brings back an old list over remote changes.

**Delete all data** and **Replace** from a file delete days on all the devices. Thus, Settings must ask "on this device only" or "on all devices". "On this device only" removes the device from the vault first.

### History

- Once each day, the first update also copies the vault to `history/<vault id>/<date>`. An R2 lifecycle rule deletes a history copy after 30 days.
- A history copy stays readable after a change of the data key, because the vault keeps the earlier data keys.
- To restore a copy, an owner device restores only its days and tombstones, with new clocks. It keeps the current keyring, data key and signing key chain, and writes the current counter plus 1.

### Partner devices

A partner device keeps the shared chart in a separate `localStorage` key. It never merges the shared chart with observations of its own. It shows the chart read only, with all the fields that sync, the notes too. **Stop viewing** deletes the shared chart and the keys of the vault from that device.

### Relay

| Item      | Value                                                                                                                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code      | Cloudflare Pages Functions in `functions/api/`, in this repository                                                                                                                                                      |
| Storage   | One R2 bucket, bound in `wrangler.json`                                                                                                                                                                                 |
| Objects   | `vaults/<id>`, `recovery/<lookup id>`, `invites/<id>`, `history/<vault id>/<date>`                                                                                                                                      |
| Access    | `Authorization: Bearer <token>`. The server keeps only the SHA-256 of each token.                                                                                                                                       |
| Writes    | With an owner token and `If-Match`. A new vault uses `If-None-Match: *`.                                                                                                                                                |
| Recovery  | A new `recovery/` object needs `If-None-Match: *` and an owner token of a vault. The function keeps that vault id in the R2 metadata. A change or a deletion needs an owner token of that vault. A read needs no token. |
| Limits    | 1 MB for each vault, 256 KB for a new vault. An update is at most 256 KB, or the stored size plus 64 KB. A Cloudflare rate limiting rule for each IP address on `/api/`.                                                |
| Host      | The function refuses a host other than `fertility-tracker.gsuquet.com`. Thus, no request avoids the rate limit through `pages.dev`.                                                                                     |
| Invites   | The function keeps the creation time and refuses an invitation after 24 hours.                                                                                                                                          |
| Caching   | Each answer has `Cache-Control: no-store`. The service worker must not cache `/api/`.                                                                                                                                   |
| Logs      | The function writes no log.                                                                                                                                                                                             |
| Retention | R2 lifecycle rules: `vaults/` and `recovery/` after 12 months, `history/` after 30 days, `invites/` after 1 day                                                                                                         |

R2 deletes an object 12 months after its last write. An owner device writes the vault and the recovery object again when the last write is more than 30 days old. When a read of `recovery/<lookup id>` gives `404`, the owner device makes the object again from its keyring copy. Thus, a vault in use never gets to 12 months. A vault without an owner device for 12 months is deleted. The devices still have their local data.

The relay does not need a separate Worker or a second codebase. The Pages project deploys the functions in `functions/` with the static files. The relay has the same origin as the application, so the Content Security Policy does not change. A separate Worker is necessary only for Durable Objects, for example for live updates. This ADR does not select live updates.

### When a sync occurs

- When the application opens
- When the page becomes visible, at most one time each 60 seconds
- When the browser goes online
- 5 seconds after the last change of an observation

iOS gives no background sync to a web application. Thus, a phone syncs when the user opens the application. A sync in the last 30 days stops the backup reminder.

### Hosting cost

Pages Functions use the request limit of the free Workers plan: about 100,000 requests each day. A sync is one `GET`, and one `PUT` when the data changed. At about 20 requests for each member each day, the free plan is sufficient for about 5,000 members. Above this number, the paid Workers plan is necessary.

### Plan

Each step is one pull request. Each step changes its reference pages first, as [ADR 0004](0004-specification-in-reference-pages.md) requires.

1. Encrypted backup file: the envelope, gzip, padding and a password. No server.
2. Sync engine in `src/domain/sync/`: the canonical form, the merge, the clocks, the Peak Day rule and the conflicts. Tests use an adapter in memory.
3. Relay and owner devices: the Pages Functions, the vault object, the signature and the keyring. Also the invitation, the recovery code, Settings, and a service worker that skips `/api/` ([Deployment](../../reference/deployment.md)).
4. Partner sharing: the reader role, the read-only chart, **Stop viewing** and the removal of a member.

## More information

- [ADR 0001: Automatic backup and synchronization with zero-knowledge privacy](0001-automated-backup-and-sync-privacy.md), superseded by this ADR
- [Privacy and data storage](../../explanation/privacy-and-data-storage.md)
- [Data storage](../../reference/data-storage.md)
- [Data format](../../reference/data-format.md)
