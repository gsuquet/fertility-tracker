# Install and run locally

Use this procedure to run the application on your computer. For example, do this to work on the code or to use the application without the public site.

## Before you start

- Install [Git](https://git-scm.com/).
- Install [mise](https://mise.jdx.dev/getting-started.html).

## Procedure

1. Clone the repository:

   ```bash
   git clone https://github.com/gsuquet/fertility-tracker.git
   cd fertility-tracker
   ```

2. Install the pinned tools (Node.js, npm, pre-commit and gitleaks):

   ```bash
   mise install
   ```

3. Install the dependencies from the lock file:

   ```bash
   mise run install
   ```

4. Start the development server:

   ```bash
   mise run dev
   ```

5. Open `http://localhost:5173` in your browser.

## Run the production build

1. Build the application:

   ```bash
   mise run build
   ```

2. Start the preview server:

   ```bash
   mise run preview
   ```

3. Open `http://localhost:4173` in your browser.

## Troubleshooting

| Problem                                             | Cause                                         | Solution                                                   |
| --------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| `npm ci` stops with an engine error.                | The active Node.js or npm version is wrong.   | Run `mise install`. Then run `mise run install` again.     |
| The server uses port `5174` and not `5173`.         | A different program uses port `5173`.         | Open the address that the terminal shows.                  |
| `mise run build` stops with a type error.           | The TypeScript code has an error.             | Run `npm run typecheck`. Correct each error that it shows. |
| `mise` shows that the configuration is not trusted. | mise does not run files from unknown folders. | Run `mise trust` in the project folder.                    |

## Related documents

- [Commands](../reference/commands.md)
- [Make your first code change](../tutorials/make-your-first-code-change.md)
