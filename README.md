# Fertility Tracker

Fertility Tracker is a web application to chart fertility signs with the Creighton Model FertilityCare System (CrMS). You record bleeding and cervical mucus each day with the standard codes. The application gives the stamps, the Peak Day and the cycle statistics automatically.

- **Site:** [fertility-tracker.gsuquet.com](https://fertility-tracker.gsuquet.com)
- **Repository:** [github.com/gsuquet/fertility-tracker](https://github.com/gsuquet/fertility-tracker)
- **License:** [MIT](LICENSE)

> **WARNING:** This application is not a medical device. It does not give medical advice, a diagnosis or a treatment. Use it with a certified FertilityCare Practitioner or Medical Consultant.

## Features

- Record each day with a code, for example `10KLAD`, or with buttons.
- Get the CrMS stamp of each day: red, green, white with a baby, and light green with a baby for the count of three.
- Get the Peak Day automatically, or set it yourself.
- See your cycles as a paper chart, a monthly calendar or statistics.
- Print a 35-day chart for your practitioner, or save it as a PDF file.
- Make a backup file and restore it.
- Use the application in English or French, with a light or dark theme.

Your data stays in your browser. The application has no account and no server database. Read [Privacy and data storage](docs/explanation/privacy-and-data-storage.md).

## Start

- To learn the application, do the tutorial [Chart your first cycle](docs/tutorials/chart-your-first-cycle.md).
- To run the code on your computer, read [Install and run locally](docs/how-to/install-and-run-locally.md).

The short procedure for contributors:

```bash
git clone https://github.com/gsuquet/fertility-tracker.git
cd fertility-tracker
mise install          # Node.js 26.12.1, npm 11.20.0, pre-commit, gitleaks
mise run install      # npm ci
mise run hooks        # Git pre-commit hooks
mise run dev          # http://localhost:5173
```

## Documentation

All the documentation is in [docs/](docs/README.md). It has tutorials, how-to guides, reference pages and explanations. The full specification is in [SPEC.md](SPEC.md).

## Contribute

1. Make a branch from `main`.
2. Write the change in `SPEC.md`.
3. Write a test first, then the code. Read [Write a test first](docs/how-to/write-a-test-first.md).
4. Increase the version and add the release notes. Read [Release a new version](docs/how-to/release-a-new-version.md).
5. Run all the quality gates:

   ```bash
   mise run validate
   ```

6. Open a pull request to `main`. The CI workflow must pass.

Report a problem or ask for a feature in [GitHub Issues](https://github.com/gsuquet/fertility-tracker/issues).

## Trademarks

FertilityCare™ and Creighton Model FertilityCare™ System (CrMS) are trademarks of the Saint Paul VI Institute for the Study of Human Reproduction.

Fertility Tracker is an independent open-source project. It has no connection with the Saint Paul VI Institute, FertilityCare™ Centers of America (FCCA) or FertilityCare™ Centers International (FCCI). These organizations do not approve, certify or sponsor it.
