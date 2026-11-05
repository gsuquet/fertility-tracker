# Sync client

This page gives the rules of the sync client of the application: the relay client, the device record and the vault store. The [Relay API](relay-api.md) gives the server side. The [Vault format](vault-format.md) gives the objects.

**Source folder:** [src/sync/](../../src/sync/)

Until `SYNC_ENABLED` is `true`, the application does not call these functions. The relay has its R2 binding ([Set up the sync relay](../how-to/set-up-the-sync-relay.md)). The flag stays `false` until the application follows all the rules of [ADR 0012](../records/adrs/0012-encrypted-sync-and-partner-sharing.md).

## Files

| File                | Content                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `relayClient.ts`    | `createRelayClient()`: one function for each route of the relay    |
| `keyStore.ts`       | `openKeyStore()`: the device record in IndexedDB                   |
| `deviceVault.ts`    | `createVault()`, the vault session, `vaultStoreOf()`, `VaultError` |
| `invitationFlow.ts` | The invitation on the owner device and on the new device           |
| `membership.ts`     | The removal of a member, the new recovery code and the recovery    |
| `syncFlag.ts`       | `SYNC_ENABLED`: `false` until the application follows ADR 0012     |
| `syncRunner.ts`     | `runSync()` and `finishSync()`: one sync of the application        |

## Relay client

`createRelayClient(fetch, origin)` gives a function for each route of the relay. The tests give the relay handler as the `fetch` function.

- Each function gives `{ ok: true }` with the text and the ETag of the answer, or `{ ok: false, status, error }`.
- When the network fails, the result is `{ ok: false, status: 0, error: "network" }`.
- The ETag of the result has no quotes. The client adds the quotes in `If-Match`.
- Each request has `cache: "no-store"`.
- A request that takes more than 30 seconds (`RELAY_TIMEOUT_MS`) fails as a network error.

## Device record

The device record is in the IndexedDB database `fertility-tracker-sync`, version 1. The object store is `device`, and the key of the record is `current`.

| Field               | Content                                                                               |
| ------------------- | ------------------------------------------------------------------------------------- |
| `vaultId`           | The id of the vault                                                                   |
| `memberId`          | The id of the device in the keyring                                                   |
| `role`              | `owner` or `reader`                                                                   |
| `token`             | The access token of the device                                                        |
| `privateKey`        | The ECDH private key of the device, as a `CryptoKey` that is not extractable          |
| `publicKey`         | The ECDH public key of the device, in base64url                                       |
| `trustedSigningKey` | The last signing public key that the device accepted                                  |
| `last`              | The counter and the digest of the last vault that the device read or wrote, or `null` |

- `openKeyStore()` gives `load()`, `save(record)` and `clear()`.
- `load()` gives `null` when the device has no record.
- Each function closes its connection. It gives an error when the request fails or the transaction aborts, for example when the storage is full.
- The device keeps no data key and no signing private key. It unwraps them from its keyring entry at each read.

## New vault

`createVault(relay, keyStore, name)` makes a vault for this device, as the first owner. It gives the device record and the recovery code.

- It makes the ECDH key pair of the device, the access token, the vault id, the key id and the data key.
- It makes the signing key chain, the recovery secret and the key pair of the recovery member.
- The keyring has the device and the recovery member. Both are owners. The entry of the device has its [name](vault-format.md#device-name).
- The entry of the device also has the lookup copy, wrapped with the purpose `lookup`.
- The vault has counter 1 and no days.
- It writes the vault with `If-None-Match: *`. Then it writes the lookup object of the recovery code with `If-None-Match: *`.
- It saves the device record only after the two writes. The `last` field of the record has counter 1 and the digest of the vault.

When a write fails, `createVault()` gives a `VaultError` with the reason `relay` and saves nothing.

## Vault session

A vault session is the last vault that the device read or wrote: the record, the header, the ETag, the days and the data key.

- `openSession(relay, keyStore, record)` reads, checks and decrypts the vault. It saves the new trusted signing key, the counter and the role in the record.
- `ownerKeys(session)` unwraps the signing private key and the lookup copy of the device. It gives a `reader` error when the entry is not an owner with a signing key.
- `memberFor(session, keys, member)` makes a keyring entry for a new member. It wraps the data key, and for an owner also the signing key and the lookup copy. It encrypts the name of the member with the data key.
- `memberNames(session)` gives the id, the role and the name of each member of the keyring. The name is `null` when the member has no name or the name does not decrypt.
- `writeSession(relay, keyStore, session, change)` writes the next vault with new days or a new keyring. It gives `null` for `412`.

## Vault store

`vaultStoreOf(relay, keyStore, record)` gives the `VaultStore` of the [sync engine](sync-rules.md#sync) for the vault of the record.

`read()` gets the vault, then:

- It opens the vault with `openVault()`, the trusted signing key and the `last` field of the record.
- It finds the entry of the device in the keyring, and unwraps the data key.
- It decrypts the days.
- It saves the new `last` field and the current signing key in the record. Then it gives the days and the ETag.

`write(days, etag)` writes the next vault:

- It uses the header of the last `read()`, with the counter plus 1.
- It unwraps the signing private key of the device, and seals the days.
- It writes the vault with `If-Match` and the ETag.
- It gives `null` for `412`. Else it saves the new `last` field and gives the new ETag.

The functions give a `VaultError` in these conditions:

| Reason       | Condition                                                                            |
| ------------ | ------------------------------------------------------------------------------------ |
| `relay`      | The relay gives an error. For `write()` and `writeSession()`, `412` is not an error. |
| `refused`    | `openVault()` refuses the vault. The `refusal` field gives the reason.               |
| `removed`    | The keyring has no entry for the device                                              |
| `keys`       | A wrapped key of the device does not unwrap                                          |
| `content`    | The days do not decrypt                                                              |
| `reader`     | `write()` occurs, and the entry of the device is not an owner with a signing key     |
| `noRead`     | `write()` occurs before a `read()`                                                   |
| `member`     | The member to remove is not in the keyring, or it is the device                      |
| `code`       | The recovery code is not valid, or the lookup object does not decrypt                |
| `invitation` | `approveInvitation()` occurs before the confirm status, or the member does not agree |

The relay refuses the token of a removed member. Thus, a removed device gets the reason `relay` with the status `401`.

## Invitation

The functions follow [Adding a member](../records/adrs/0012-encrypted-sync-and-partner-sharing.md#adding-a-member). The application calls each check again until the status changes.

On the owner device:

- `startInvitation(relay, keyStore, record, role)` reads the vault, then makes the invitation on the relay. It gives a `reader` error on a device that is not an owner.
- It also makes the offer of the owner device, with the current signing key. The owner device keeps this offer.
- `checkAsOwner(relay, record, owner)` reads the messages. When the join request is valid and the offer is missing, it sends its offer.
- It gives `refused` and deletes the invitation for a wrong HMAC, a wrong reveal, or an offer on the relay that is not its offer.
- It gives `confirm` with the code and the name of the new device after a valid reveal. The code uses the offer that the owner device keeps, not the offer on the relay.
- It also gives `refused` when the name of the request does not decrypt, or is not a valid name.
- `approveInvitation(relay, keyStore, record, owner)` checks the messages again, adds the member to the vault and sends the signed answer.
- The application calls `approveInvitation()` only after its user confirms the codes. Before the confirm status, it gives an `invitation` error.
- When the keyring has the public key of the request already, `approveInvitation()` keeps that member and sends the answer again. Thus, a second call after a failed answer adds no member.
- It gives an `invitation` error when that member has a different role or a different token hash.

On the new device:

- `startJoin(relay, invitation, name)` makes the key pair and the token of the device, and sends the join request with the encrypted name.
- `checkAsNewDevice(relay, join)` sends the reveal after the offer. It gives `confirm` with the code, then `answered` with the checked answer.
- `finishJoin(relay, keyStore, join, offer, content)` makes the device record and reads the vault with it. Then it deletes the invitation.
- The application calls `finishJoin()` only after its user confirms the codes. Thus, the device shows no data before the confirmation.

A check gives `waiting` while the other device did not send its message. It gives `expired` when the relay gives `404`.

Each device keeps the first valid message of the other device in its state. The owner device keeps the request, and the new device keeps the offer.

- The owner device keeps the request before it sends its offer. The new device keeps the offer before it sends its reveal.
- A later check gives `refused` when the message on the relay is not the kept message.
- Thus, a relay with the link cannot change a message after it sees the other nonce. It cannot try many values to get the same code.
- The application keeps the same `OwnerInvitation` or `JoinState` object for all the checks of one invitation.

## Removal of a member

`removeMember(relay, keyStore, record, memberId)` removes a member in one conditional write, as [Removing a member](../records/adrs/0012-encrypted-sync-and-partner-sharing.md#removing-a-member) gives. This is the rekey:

- It makes a new data key and a new key id. The days are encrypted again with the new key.
- It adds the old data key to the earlier keys. It encrypts each earlier key again with the new data key.
- It wraps the new data key for each member that stays. It wraps the signing key and the lookup copy for each owner that stays.
- It decrypts the name of each member that stays, and encrypts it again with the new data key. A name that does not decrypt goes.
- When the removed member is an owner, it adds a new signing key to the chain, signed with the old key. The device then trusts the new key.

It gives a `member` error when the member is not in the keyring, is the device itself, or is the recovery member. **New recovery code** replaces the recovery member. It gives a `keys` error when the device has no lookup copy and the vault has a recovery blob. After the removal of an owner device, the application also makes a new recovery code.

`removeDevice(relay, keyStore, record, memberId)` removes a member, as [Removing a member](../records/adrs/0012-encrypted-sync-and-partner-sharing.md#removing-a-member) gives. It gives the device record and the new code, or `null` for a removed reader.

| Condition              | Result                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The member is a reader | It calls `removeMember()`. The recovery code does not change.                                                                                           |
| **Else**               | One rekey removes the member and the old recovery member, and adds a new recovery member, as `newRecoveryCode()` does. Thus, a failure removes neither. |

It refuses the same members as `removeMember()`.

`leaveVault(relay, keyStore, record)` removes the device itself from the vault, then deletes the device record. **On this device only** of **Delete all data** and of **Replace** uses it ([On a synced device](screens/settings.md#on-a-synced-device)).

- It does the same rekey as `removeMember()`, with a new signing key in the chain. It does not save the record of the rekey.
- The days of the vault do not change. The other devices and the recovery code still open the vault.
- It does not make a new recovery code ([Removing a member](../records/adrs/0012-encrypted-sync-and-partner-sharing.md#removing-a-member)). The recovery blob still names the old signing key.
- When the device is already out of the vault, it only deletes the record. The device is out after a `removed` error, or a `relay` error with the status `401` or `404`.
- A device that is not an owner gives a `reader` error.

## Device list

`listMembers(relay, keyStore, record)` reads the vault and gives each member of the keyring with `memberNames()`. Each member also has a kind:

| Condition                                       | Kind       |
| ----------------------------------------------- | ---------- |
| The member is this device                       | `this`     |
| The lookup copy of this device names the member | `recovery` |
| **Else**                                        | `other`    |

It gives a `reader` error on a device that is not an owner, as `ownerKeys()` does.

## New recovery code

`newRecoveryCode(relay, keyStore, record)` follows [New recovery code](../records/adrs/0012-encrypted-sync-and-partner-sharing.md#new-recovery-code). It gives the device record and the new code.

- It makes the new secret, the new lookup object and the key pair of the new recovery member. It writes the lookup object with `If-None-Match: *`.
- In one rekey write, it removes the old recovery member and adds the new one. The new recovery blob names the new signing key and the new counter.
- Each owner except the recovery member gets the new lookup copy.
- Then it deletes the old lookup object.
- It reads the old lookup id and the old recovery member from the lookup copy of the device, in the vault that it reads.

It gives a `keys` error when the device has no lookup copy. The application shows the code only after the function succeeds.

## Recovery

`recoverWithCode(relay, keyStore, code, name)` adds this device to the vault with the recovery code. It gives the device record and a new recovery code.

- It reads the lookup object, and decrypts the vault id with the lookup key.
- It reads the vault with the access token of the code. It decrypts the recovery blob with the wrapping key.
- It opens the vault with the signing key and the counter of the blob, as the recovery member. It keeps this record only in memory.
- It adds the device as an owner with its name, and with a lookup copy of the old code. It saves the device record.
- Then it makes a new recovery code, which removes the old recovery member. When this step fails, the device can call `newRecoveryCode()` again.

It gives a `code` error when the code is not valid or the lookup object does not decrypt. It gives a `keys` error when the recovery blob does not decrypt.

When the vault changed, `removeMember()`, `leaveVault()`, `newRecoveryCode()` and `recoverWithCode()` give a `relay` error with the status `412`.

## Sync in the application

`runSync(input)` does one sync for the device record in the key store. It uses `syncOnce()` of the [sync engine](sync-rules.md#sync) with `vaultStoreOf()`.

- Without a device record, it gives the status `off`. It does not read the sync state or the vault.
- It reads the sync state from `fertility_care_sync_state`. Without a valid state of the member of the record, it uses `newSyncState()`. Thus, the sync is a first sync.
- Before it reads the vault, it stamps the local changes with `stampLocalChanges()`. Thus, a change keeps its clock when the relay fails.
- A `VaultError` gives the status `error` with the error and the stamped state.
- The other results of `syncOnce()` come back without a change. `runSync()` writes nothing to the browser storage.

For a `synced` result, `finishSync(result, input)` does these steps in this sequence:

- It calls `keepEditsDuringSync()` with the observations of the sync and the current observations.
- It saves the observations with `applySyncedObservations()`. When the save fails, it stops. The sync state does not change.
- It writes the state of the result to `fertility_care_sync_state`. When this write fails, it deletes the stored state and stops. Thus, the next sync is a first sync.
- It adds the conflicts to `fertility_care_sync_conflicts` with `addConflicts()`.

`finishSync()` gives `true` when each write succeeds. Then `useSync()` calls `markSynced()`, which writes today to `fertility_care_last_sync`.

For a `cancelled`, `busy` or `error` result, `finishSync()` writes the state of the result. This state has the clocks of the local changes.

At load, the provider deletes `fertility_care_sync_state` at once when the stored observations are damaged, missing or without their correct mark. Thus, the next sync is a first sync, and the vault wins on each date ([Safety of the local data](../records/adrs/0012-encrypted-sync-and-partner-sharing.md#safety-of-the-local-data)).

### When the application syncs

`useSync()` in [useSync.ts](../../src/hooks/useSync.ts) starts a sync in these conditions, as [When a sync occurs](../records/adrs/0012-encrypted-sync-and-partner-sharing.md#when-a-sync-occurs) gives:

| Event                                 | Sync                                                 |
| ------------------------------------- | ---------------------------------------------------- |
| The application opens                 | At once                                              |
| The page becomes visible              | When the last sync started 60 seconds ago or earlier |
| The browser goes online               | At once                                              |
| An observation changes on this device | 5 seconds after the last change                      |

- Only one sync runs at a time in a tab. A sync that starts while a sync runs occurs after the running sync.
- When the browser has Web Locks, the lock `fertility-tracker-sync` lets only one tab sync at a time.
- A tab does not sync when the stored observations are not its observations. The `storage` event gives it a list that it can read, as [Synced observations](data-storage.md#synced-observations) gives. Else, the tab syncs again only after its next save.
- When the mark of the stored observations is not correct, a version without the sync wrote them. The tab then deletes the sync state before it syncs. Thus, the sync is a first sync.
- When `checkStoredMark()` deletes the sync state during a sync, the tab deletes the state of that sync after `finishSync()`.
- `observationsMissing` is always `false`. The provider deletes the sync state at a load without the observations key, so that sync is a first sync.
- A change that a sync applies does not start a sync.
- When a merge deletes more than 7 days, the application asks the user with `sync.confirmDeletions`. **Cancel** stops the write.
- When the key store or the sync code fails, the next event tries again.
- While `SYNC_ENABLED` is `false`, `useSync()` does nothing and the application does not load the sync code.

### Sync control

`useSync()` gives a `SyncControl` to Settings. The [Sync group](screens/settings.md#sync-group) uses it.

| Field             | Use                                                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`         | The value of `SYNC_ENABLED`                                                                                                                                |
| `services`        | Loads the relay client, the key store and the sync code one time. A failed load loads again at the next call.                                              |
| `syncNow`         | Starts a sync at once, or after the sync that runs. It resolves with a `SyncOutcome` when that sync ends. A sync that did not start yet covers a new call. |
| `withSync`        | Runs an action of Settings after the sync that runs, with the lock `fertility-tracker-sync`. No sync starts before the action ends.                        |
| `lastError`       | The `VaultError` of the last sync, or `null` after a sync without an error                                                                                 |
| `conflicts`       | The conflict list of `fertility_care_sync_conflicts`, sorted by date. It is empty while the sync is off.                                                   |
| `resolveConflict` | Restores or dismisses a conflict that the user saw, with the sync lock ([Conflict list](#conflict-list)).                                                  |

A `SyncOutcome` has these fields:

- `sent` is true when the vault has the changes of this device, or when the device has no record.
- `skipped` is true when the provider has `saveFailed` or `recoveryData`. The tab then does not call `runSync()`.
- `error` is the `VaultError` of a failed sync, or `null`.

### Conflict list

`useSync()` reads `fertility_care_sync_conflicts` again in these conditions:

- When the sync is on, at the start.
- After each sync and after each action of `withSync()`.
- When another tab changes the list (`storage` event).

`resolveConflict(conflict, restore)` runs after the sync that runs, with the sync lock. It reads the stored list again, because another tab or a sync can change it. A sync can replace the conflict of a date with a newer conflict.

| Condition                                                          | Result                                                                                                                                        |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| The list has no conflict with the date and the clock of `conflict` | Nothing changes. Another tab resolved it, or a sync replaced it. The user did not see the new conflict.                                       |
| `restore` is `false`                                               | The conflict goes from the list. The observation of the date does not change.                                                                 |
| `restore` is `true` and the day of the conflict is `null`          | The observation of the date is deleted with `deleteObservation()`. Then the conflict goes from the list.                                      |
| **Else**                                                           | The day of the conflict is saved with `saveObservation()`. The current Peak Day mark of the date stays. Then the conflict goes from the list. |

A restored day is a new local change. Thus, the next sync gives it a new clock, and the restored version goes to the vault ([ADR 0012](../records/adrs/0012-encrypted-sync-and-partner-sharing.md#conflict-list)). The conflict has no Peak Day mark, because the Peak Day mark has its own clock ([Sync rules](sync-rules.md)).

## Related documents

- [ADR 0012: End-to-end encrypted sync and partner sharing](../records/adrs/0012-encrypted-sync-and-partner-sharing.md)
- [Relay API](relay-api.md)
- [Vault format](vault-format.md)
- [Sync rules](sync-rules.md)
