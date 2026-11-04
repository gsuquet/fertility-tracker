# Set up the sync relay

Do this procedure one time, before the application turns on the sync. The relay needs an R2 bucket, lifecycle rules and a rate limiting rule ([Relay API](../reference/relay-api.md)).

## Before you start

- You have a Cloudflare account with the Pages project `fertility-tracker`.
- The domain `fertility-tracker.gsuquet.com` is on Cloudflare.

## Make the R2 bucket

1. In the Cloudflare dashboard, open **R2 Object Storage**.
2. Click **Create bucket**.
3. Type the name `fertility-tracker-vaults`. Keep the default location.
4. Click **Create bucket**.

## Add the lifecycle rules

1. Open the bucket `fertility-tracker-vaults`, then **Settings**.
2. In **Object lifecycle rules**, add a rule for each prefix of this table:

   | Prefix      | Delete objects after |
   | ----------- | -------------------- |
   | `vaults/`   | 365 days             |
   | `recovery/` | 365 days             |
   | `history/`  | 30 days              |
   | `invites/`  | 1 day                |

3. Save each rule.

## Add the rate limiting rule

1. Open the zone `gsuquet.com`, then **Security** and **Security rules**.
2. Add a rate limiting rule for the URI path that starts with `/api/`.
3. Count the requests for each IP address. Allow 20 requests in 10 seconds.
4. Select the action **Block** for 10 seconds, then save the rule.

The Free plan has these values. A different plan can use a longer period with the same rate.

## Bind the bucket

The Pages project reads its bindings from `wrangler.json`. Thus, a pull request adds the binding after the bucket exists:

```json
"r2_buckets": [{ "binding": "VAULTS", "bucket_name": "fertility-tracker-vaults" }]
```

Do not add the binding before the bucket exists. Else the deploy fails.

## Result

After the deploy, `GET https://fertility-tracker.gsuquet.com/api/recovery/AAAAAAAAAAAAAAAAAAAAAA` gives `404` with the error `notFound`. Before the binding, it gives `503`.

## Related documents

- [Relay API](../reference/relay-api.md)
- [Deploy to Cloudflare Pages](deploy-to-cloudflare.md)
- [Deployment](../reference/deployment.md)
