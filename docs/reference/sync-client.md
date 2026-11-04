# Sync client

This page gives the rules of the sync client of the application: the relay client, the device record and the vault store. The [Relay API](relay-api.md) gives the server side. The [Vault format](vault-format.md) gives the objects.

**Source folder:** [src/sync/](../../src/sync/)

Until step 3 of the [ADR plan](../records/adrs/0012-encrypted-sync-and-partner-sharing.md#plan) is complete, the application does not call these functions.

## Files

| File                | Content                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `relayClient.ts`    | `createRelayClient()`: one function for each route of the relay    |
| `keyStore.ts`       | `openKeyStore()`: the device record in IndexedDB                   |
| `deviceVault.ts`    | `createVault()`, the vault session, `vaultStoreOf()`, `VaultError` |
| `invitationFlow.ts` | The invitation on the owner device and on the new device           |

## Relay client

`createRelayClient(fetch, origin)` gives a function for each route of the relay. The tests give the relay handler as the `fetch` function.

- Each function gives `{ ok: true }` with the text and the ETag of the answer, or `{ ok: false, status, error }`.
- When the network fails, the result is `{ ok: false, status: 0, error: "network" }`.
- The ETag of the result has no quotes. The client adds the quotes in `If-Match`.
- Each request has `cache: "no-store"`.

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

`createVault(relay, keyStore)` makes a vault for this device, as the first owner. It gives the device record and the recovery code.

- It makes the ECDH key pair of the device, the access token, the vault id, the key id and the data key.
- It makes the signing key chain, the recovery secret and the key pair of the recovery member.
- The keyring has the device and the recovery member. Both are owners.
- The entry of the device also has the lookup copy, wrapped with the purpose `lookup`.
- The vault has counter 1 and no days.
- It writes the vault with `If-None-Match: *`. Then it writes the lookup object of the recovery code with `If-None-Match: *`.
- It saves the device record only after the two writes. The `last` field of the record has counter 1 and the digest of the vault.

When a write fails, `createVault()` gives a `VaultError` with the reason `relay` and saves nothing.

## Vault session

A vault session is the last vault that the device read or wrote: the record, the header, the ETag, the days and the data key.

- `openSession(relay, keyStore, record)` reads, checks and decrypts the vault. It saves the new trusted signing key, the counter and the role in the record.
- `ownerKeys(session)` unwraps the signing private key and the lookup copy of the device. It gives a `reader` error when the entry is not an owner with a signing key.
- `memberFor(session, keys, member)` makes a keyring entry for a new member. It wraps the data key, and for an owner also the signing key and the lookup copy.
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

| Reason    | Condition                                                                        |
| --------- | -------------------------------------------------------------------------------- |
| `relay`   | The relay gives an error. On a write, `412` is not an error.                     |
| `refused` | `openVault()` refuses the vault. The `refusal` field gives the reason.           |
| `removed` | The keyring has no entry for the device                                          |
| `keys`    | A wrapped key of the device does not unwrap                                      |
| `content` | The days do not decrypt                                                          |
| `reader`  | `write()` occurs, and the entry of the device is not an owner with a signing key |
| `noRead`  | `write()` occurs before a `read()`                                               |

The relay refuses the token of a removed member. Thus, a removed device gets the reason `relay` with the status `401`.

## Invitation

The functions follow [Adding a member](../records/adrs/0012-encrypted-sync-and-partner-sharing.md#adding-a-member). The application calls each check again until the status changes.

On the owner device:

- `startInvitation(relay, record, role)` makes the invitation on the relay. It gives a `reader` error on a reader device.
- `checkAsOwner(relay, record, owner)` reads the messages. When the join request is valid and the offer is missing, it sends the offer.
- `checkAsOwner()` gives `confirm` with the code after a valid reveal. It gives `refused` and deletes the invitation when the HMAC or the reveal is wrong.
- `approveInvitation(relay, keyStore, record, owner, request)` adds the member to the vault and sends the signed answer. The application calls it only after its user confirms the codes.

On the new device:

- `startJoin(relay, invitation)` makes the key pair and the token of the device, and sends the join request.
- `checkAsNewDevice(relay, join)` sends the reveal after the offer. It gives `confirm` with the code, then `answered` with the checked answer.
- `finishJoin(relay, keyStore, join, offer, content)` makes the device record and reads the vault with it. Then it deletes the invitation.
- The application calls `finishJoin()` only after its user confirms the codes. Thus, the device shows no data before the confirmation.

A check gives `waiting` while the other device did not send its message. It gives `expired` when the relay gives `404`.

## Related documents

- [ADR 0012: End-to-end encrypted sync and partner sharing](../records/adrs/0012-encrypted-sync-and-partner-sharing.md)
- [Relay API](relay-api.md)
- [Vault format](vault-format.md)
- [Sync rules](sync-rules.md)
