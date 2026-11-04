# Relay API

This page gives the rules of the relay: the routes in `/api/`, the access tokens and the R2 objects. [ADR 0012](../records/adrs/0012-encrypted-sync-and-partner-sharing.md) gives the design. The vault object is in [Vault format](vault-format.md).

**Source files:** [src/relay/](../../src/relay/) and [functions/api/\[\[path\]\].ts](../../functions/api/[[path]].ts)

The relay is a Cloudflare Pages Function in the same project as the application. It stores only encrypted objects. It cannot read the days, because it has no key.

## Environment

| Binding      | Content                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------ |
| `VAULTS`     | The R2 bucket. Without it, each route answers `503` with the error `unavailable`.          |
| `RELAY_HOST` | Optional. The host that the relay accepts. The default is `fertility-tracker.gsuquet.com`. |

Until [Set up the sync relay](../how-to/set-up-the-sync-relay.md) is done, the project has no `VAULTS` binding. Thus, the relay answers only `503`.

## All routes

| Condition                                       | Answer                     |
| ----------------------------------------------- | -------------------------- |
| The host of the request is not the relay host   | `403`, error `host`        |
| The `VAULTS` binding is missing                 | `503`, error `unavailable` |
| The path is not a route of this page            | `404`, error `notFound`    |
| The method is not a method of the route         | `405`, error `method`      |
| The id in the path is not 16 bytes in base64url | `400`, error `invalid`     |

- Each answer has `Cache-Control: no-store`. An error answer is the JSON `{ "error": "<code>" }`.
- The relay writes no log.
- A token is `Authorization: Bearer <token>`. The relay compares the SHA-256 of the token in base64url with the `tokenHash` of each member of the stored vault.

## Vault routes

`GET /api/vaults/<vault id>` gives the vault object:

| Condition                               | Answer                                  |
| --------------------------------------- | --------------------------------------- |
| The vault does not exist                | `404`, error `notFound`                 |
| The token is missing or not of a member | `401`, error `token`                    |
| **Else**                                | `200`, the object text, with its `ETag` |

`PUT /api/vaults/<vault id>` writes the vault object. The body must be at most 1 MB (1,048,576 bytes). The relay reads only the header, without a signature check: it cannot know the trusted signing key.

| Condition                                                                   | Answer                           |
| --------------------------------------------------------------------------- | -------------------------------- |
| The body is more than 1 MB                                                  | `413`, error `tooLarge`          |
| `If-None-Match: *`, and the body is more than 256 KB (262,144 bytes)        | `413`, error `tooLarge`          |
| The body is not a vault object, or its `vaultId` is not the id of the path  | `400`, error `invalid`           |
| The request has no `If-Match` and no `If-None-Match: *`                     | `428`, error `condition`         |
| `If-None-Match: *`, and the vault exists                                    | `412`, error `changed`           |
| `If-None-Match: *`, and the token is not of an owner in the new keyring     | `403`, error `owner`             |
| `If-Match`, and the vault does not exist                                    | `404`, error `notFound`          |
| `If-Match`, and the token is missing or not of a member of the stored vault | `401`, error `token`             |
| `If-Match`, and the token is of a reader                                    | `403`, error `owner`             |
| `If-Match`, and the ETag is not the ETag of the stored vault                | `412`, error `changed`           |
| `If-Match`, and the counter is not the stored counter plus 1                | `409`, error `counter`           |
| **Else**                                                                    | `200`, `{}`, with the new `ETag` |

- An update uses a conditional R2 write with the ETag. When a different write occurs first, the answer is `412`.
- After an update, the relay copies the object to `history/<vault id>/<date>` when that copy does not exist. `date` is the UTC date of the update. Thus, the first update of each day makes the copy.
- A new vault gets no history copy, and its limit is 256 KB. Thus, a stranger who makes vaults uses less storage.

## Recovery routes

The object `recovery/<lookup id>` holds the lookup object of the recovery code. Its R2 metadata has the vault id.

| Route                              | Condition                                                                     | Answer                               |
| ---------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------ |
| `GET /api/recovery/<lookup id>`    | The object exists. No token is necessary.                                     | `200`, the object text               |
| `GET /api/recovery/<lookup id>`    | The object does not exist                                                     | `404`, error `notFound`              |
| `PUT /api/recovery/<lookup id>`    | The body is more than 4 KB, or `X-Vault-Id` is not 16 bytes in base64url      | `413` `tooLarge`, or `400` `invalid` |
| `PUT /api/recovery/<lookup id>`    | The token is not of an owner of the vault of `X-Vault-Id`                     | `401` `token`, or `403` `owner`      |
| `PUT /api/recovery/<lookup id>`    | No `If-Match` and no `If-None-Match: *`                                       | `428`, error `condition`             |
| `PUT /api/recovery/<lookup id>`    | `If-None-Match: *` and the object exists, or `If-Match` with a different ETag | `412`, error `changed`               |
| `PUT /api/recovery/<lookup id>`    | `If-Match`, and the object does not exist                                     | `404`, error `notFound`              |
| `PUT /api/recovery/<lookup id>`    | `If-Match`, and the vault id in the metadata is not `X-Vault-Id`              | `403`, error `owner`                 |
| `PUT /api/recovery/<lookup id>`    | **Else**                                                                      | `200`, `{}`, with the `ETag`         |
| `DELETE /api/recovery/<lookup id>` | The object does not exist                                                     | `404`, error `notFound`              |
| `DELETE /api/recovery/<lookup id>` | The token is not of an owner of the vault in the metadata                     | `401` `token`, or `403` `owner`      |
| `DELETE /api/recovery/<lookup id>` | **Else**                                                                      | `204`                                |

## Service worker

The service worker ignores each request to `/api/`. Thus, the browser never gets a vault from the cache ([Offline use and installation](deployment.md#offline-use-and-installation)).

## Related documents

- [ADR 0012: End-to-end encrypted sync and partner sharing](../records/adrs/0012-encrypted-sync-and-partner-sharing.md)
- [Vault format](vault-format.md)
- [Deployment](deployment.md)
- [Set up the sync relay](../how-to/set-up-the-sync-relay.md)
