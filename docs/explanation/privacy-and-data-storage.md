# Privacy and data storage

This page tells where the application keeps your data, why, and what the limits of this choice are.

## Your data stays in your browser

The application keeps all observations in the `localStorage` of your browser. It has no user accounts, no server database and no analytics. It sends no observation to a server.

Fertility data is very personal health data. Data that is not on a server cannot leak from a server. This is the most important reason for the design.

## No requests to other sites

The application loads all its files from its own site: scripts, styles, icons and the font. The font Plus Jakarta Sans is a file of the application. It does not come from Google Fonts or from a different font service. Thus, no other company gets a request, your IP address or the time of your visit when you open the application.

The Content Security Policy in `public/_headers` enforces this rule. It permits styles and fonts only from the site of the application.

## Offline use and the cache

The service worker keeps a copy of the application files in the browser cache, so that the application works offline. The cache contains only the application files. It does not contain your observations. Your observations stay in `localStorage`.

## The limits of this design

This design has costs. You must know them:

- If you clear the data of the site in your browser, you lose your observations.
- A different browser or device does not see your data. There is no automatic synchronization.
- A person who can use your browser can see your data. The application has no password.
- A private browser window deletes the data when you close it.

The application decreases some of these risks:

- When you have observations, it asks the browser to keep the data (`navigator.storage.persist()`). Without this permission, a browser can delete the data of a site when the device has little space. A browser can refuse the request.
- If the browser does not save a change, a warning stays at the top of the page. Your changes then stay only until you close the page.
- If you have no backup, or your last backup is more than 30 days old, a reminder shows at the top of the page.

To decrease these risks more, make a backup file regularly. Read [Back up and restore your data](../how-to/back-up-and-restore-your-data.md).

## The backup file

The backup file is a JSON file that is not encrypted. Any person who has the file can read your observations. Keep it in a safe location. Do not send it through a service that you do not trust.

## Synchronization in the future

[ADR 0001](../adr/0001-automated-backup-and-sync-privacy.md) compares methods to synchronize data between devices without a loss of privacy. The application does not have synchronization yet.

## Related documents

- [Data format](../reference/data-format.md)
- [Architecture](architecture.md)
