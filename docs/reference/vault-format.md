# Vault format

This page gives the format of the encrypted vault object, the keyring, the signing key chain and the recovery code. [ADR 0012](../records/adrs/0012-encrypted-sync-and-partner-sharing.md) gives the design and the reasons. The content of the vault is in [Sync rules](sync-rules.md).

**Source folder:** [src/domain/vault/](../../src/domain/vault/)

The functions use only WebCrypto and `CompressionStream`. They have no network code and no storage code. Until step 3 of the ADR plan is complete, the application does not call them.

## Files

| File              | Content                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `bytes.ts`        | `toBase64Url()`, `fromBase64Url()`, `randomBytes()`, `sha256()`                                |
| `paddedGzip.ts`   | `compressAndPad()`, `unpadAndDecompress()`: gzip and padding to steps of 16 KB                 |
| `recoveryCode.ts` | `newRecoverySecret()`, `formatRecoveryCode()`, `parseRecoveryCode()`, `deriveRecoveryValues()` |
| `keyWrap.ts`      | `wrapKey()`, `unwrapKey()`, `wrapWithKey()`, `unwrapWithKey()`                                 |
| `signingChain.ts` | `newSigningChain()`, `extendSigningChain()`, `currentSigningKey()`                             |
| `vaultObject.ts`  | `sealVault()`, `openVault()`, `decryptVaultDays()`                                             |

## Encoding

- Each byte array in JSON is base64url without padding (`toBase64Url()`). `fromBase64Url()` gives `null` for a text that is not base64url.
- A public key is the raw P-256 point of 65 bytes.
- A token hash is the SHA-256 of the token, in base64url.

## Padded gzip

`compressAndPad(text)` compresses the UTF-8 text with gzip. It puts the length of the gzip data in 4 bytes first, big-endian. Then it adds zero bytes to the next multiple of 16,384 bytes. `unpadAndDecompress(bytes)` gives the text, or `null` when the length or the gzip data is not valid. The [encrypted backup file](data-format.md#encrypted-backup-file) uses the same functions.

## Recovery code

The recovery secret is 16 random bytes (`newRecoverySecret()`).

| Item            | Rule                                                          |
| --------------- | ------------------------------------------------------------- |
| Alphabet        | Crockford base32: `0123456789ABCDEFGHJKMNPQRSTVWXYZ`          |
| Data characters | 26: the 128 bits of the secret, with 2 zero bits first        |
| Check character | 1: the first 5 bits of the SHA-256 of the secret              |
| Display         | The 27 characters in groups of 4, with `-` between the groups |

`parseRecoveryCode(text)` ignores spaces, `-` and the case of the letters. It reads `I` and `L` as `1`, and `O` as `0`. It gives the secret, or `null` in these conditions:

- The text does not have 27 characters after these changes.
- A character is not in the alphabet.
- The first character gives a value of more than 7, so the 2 first bits are not zero.
- The check character is not correct.

`deriveRecoveryValues(secret)` uses HKDF-SHA256 with the salt `fertility-tracker-recovery:1`:

| Value         | HKDF info      | Result                                         |
| ------------- | -------------- | ---------------------------------------------- |
| `lookupId`    | `lookup-id`    | 16 bytes in base64url: the name of the object  |
| `lookupKey`   | `lookup-key`   | An AES-256-GCM key for the lookup object       |
| `wrappingKey` | `wrapping-key` | An AES-256-GCM key for the recovery blob       |
| `accessToken` | `access-token` | 32 bytes in base64url: the token of the member |

## Wrapped keys

`wrapKey(bytes, publicKey, context)` encrypts a key for one member:

- It makes an ephemeral ECDH P-256 key pair.
- It derives 256 bits from the shared secret of the ephemeral private key and the public key of the member.
- It derives an AES-256-GCM key from these bits with HKDF-SHA256, the salt `fertility-tracker-wrap:1` and an empty info.
- It encrypts the bytes with a random 12-byte IV.

The result is `{ "epk": public key, "iv": IV, "data": ciphertext }`. `wrapWithKey(bytes, key, context)` encrypts with an AES-GCM key that the device has, for example the wrapping key of the recovery code. Its result is `{ "iv": IV, "data": ciphertext }`.

The additional data is the UTF-8 text `fertility-tracker-key:1:<vault id>:<member id>:<key id>:<purpose>`. The purpose is `data`, `signing`, `lookup`, `earlier` or `recovery`. `unwrapKey()` and `unwrapWithKey()` give the bytes, or `null` when the key, the context or the data is wrong.

## Signing key chain

The chain is a list of links. Each link has a signing public key. Each link after the first one also has a signature by the private key of the link before it.

- The signed text is `fertility-tracker-chain:1:<vault id>:<index>:<public key>`. `index` is the position of the link, from 0.
- `newSigningChain()` makes a signing key pair and a chain of one link.
- `extendSigningChain(chain, vaultId, privateKey)` makes a new key pair and adds a link that the current private key signs.
- `currentSigningKey(chain, vaultId, trustedKey)` finds the trusted key in the chain. It checks each signature after it, and gives the last public key. It gives `null` when the trusted key is not in the chain or when one signature is not correct.

## Vault object

The vault object is JSON text with three fields:

| Field        | Content                                                          |
| ------------ | ---------------------------------------------------------------- |
| `header`     | The header as JSON text. The signature covers this exact text.   |
| `ciphertext` | The encrypted vault days                                         |
| `signature`  | ECDSA P-256 with SHA-256 over the header text and the ciphertext |

The signed bytes are the UTF-8 header text, one zero byte, then the bytes of the ciphertext. The header has these fields:

| Field          | Content                                                                              |
| -------------- | ------------------------------------------------------------------------------------ |
| `format`       | `1`                                                                                  |
| `vaultId`      | 16 random bytes in base64url                                                         |
| `keyId`        | The id of the data key, 8 random bytes in base64url                                  |
| `counter`      | A whole number. It increases by 1 at each write.                                     |
| `iv`           | The IV of the ciphertext                                                             |
| `keyring`      | The members                                                                          |
| `signingChain` | The signing key chain                                                                |
| `earlierKeys`  | The earlier data keys, each one with its key id, encrypted with the current data key |
| `recoveryBlob` | Optional. The recovery blob, encrypted with the wrapping key of the recovery code    |

A member of the keyring has these fields:

| Field        | Content                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------- |
| `id`         | 8 random bytes in base64url                                                                  |
| `role`       | `owner` or `reader`                                                                          |
| `publicKey`  | The ECDH public key of the member                                                            |
| `tokenHash`  | The hash of the access token of the member                                                   |
| `dataKey`    | The data key, wrapped for the member with the purpose `data`                                 |
| `signingKey` | Owner only. The signing private key in PKCS #8, wrapped with the purpose `signing`           |
| `lookup`     | Owner only, optional. The lookup id and the lookup object, wrapped with the purpose `lookup` |

`sealVault(input)` encrypts the days with AES-256-GCM after `compressAndPad()`. The additional data is `fertility-tracker-vault:1:<vault id>:<key id>:<counter>`. Then it signs the header and the ciphertext with the current signing private key.

`openVault(text, check)` gives the header and the ciphertext, or the reason of a refusal:

| Condition                                                         | Reason                                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| The text, the header or a field is not valid                      | `invalid`                                                                       |
| The vault id is not the expected vault id                         | `wrongVault`                                                                    |
| The trusted signing key does not reach the last key of the chain  | `untrusted`                                                                     |
| The signature is not correct with the last key of the chain       | `badSignature`                                                                  |
| The counter is lower than the last counter that the device saw    | `rollback`                                                                      |
| The counter is the same, and the SHA-256 of the text is different | `rollback`                                                                      |
| **Else**                                                          | The header, the ciphertext, the current signing key and the SHA-256 of the text |

`decryptVaultDays(opened, dataKey)` decrypts the ciphertext and gives the vault days of [parseVaultDays()](sync-rules.md#vault-content), or `null`.

## Related documents

- [ADR 0012: End-to-end encrypted sync and partner sharing](../records/adrs/0012-encrypted-sync-and-partner-sharing.md)
- [Sync rules](sync-rules.md)
- [Data format](data-format.md)
