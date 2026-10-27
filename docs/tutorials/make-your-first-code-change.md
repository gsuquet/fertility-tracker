# Make your first code change

In this tutorial, you install the project, start the application and add a small function with test-driven development. At the end, you remove the change.

You need about 20 minutes. You must know how to use a terminal and Git.

## Before you start

- Install [Git](https://git-scm.com/).
- Install [mise](https://mise.jdx.dev/getting-started.html). mise installs the correct versions of Node.js, npm and the other tools.

## Get the code and the tools

1. Clone the repository:

   ```bash
   git clone https://github.com/gsuquet/fertility-tracker.git
   cd fertility-tracker
   ```

2. Install the pinned tools:

   ```bash
   mise install
   ```

3. Install the dependencies:

   ```bash
   mise run install
   ```

4. Install the Git hooks:

   ```bash
   mise run hooks
   ```

## Start the application

1. Start the development server:

   ```bash
   mise run dev
   ```

2. Open `http://localhost:5173` in your browser. The welcome guide opens.
3. Click **Skip Tour**.
4. Keep the server on. Open a second terminal in the same folder for the next steps.

## Make a branch

1. Make a branch for the exercise:

   ```bash
   git switch -c tutorial/first-change
   ```

## Write a test that fails

You add the function `isPostPeakStamp`. It tells if a stamp is one of the three light green stamps.

1. Start the tests in watch mode:

   ```bash
   npm run test:watch -- src/domain
   ```

2. Open `src/domain/__tests__/stampCalculator.test.ts`.
3. Add `isPostPeakStamp` to the import from `'../stampCalculator'`.
4. Add this test at the end of the file:

   ```ts
   describe('isPostPeakStamp', () => {
     it('is true only for the three light green stamps', () => {
       expect(isPostPeakStamp('LIGHT_GREEN_BABY_2')).toBe(true);
       expect(isPostPeakStamp('WHITE_BABY')).toBe(false);
     });
   });
   ```

5. Save the file. The test run shows a failure, because the function does not exist.

## Make the test pass

1. Open `src/domain/stampCalculator.ts`.
2. Add this function at the end of the file:

   ```ts
   /** Tells if the stamp is one of the three post-peak stamps. */
   export function isPostPeakStamp(stamp: StampType): boolean {
     return stamp.startsWith('LIGHT_GREEN_BABY');
   }
   ```

3. Save the file. The test run shows that all tests pass.
4. Stop the watch mode with **Ctrl+C**.

## Run the quality gates

1. Run all the checks that CI runs:

   ```bash
   mise run validate
   ```

The command runs the linter, the type check, the docs check, the tests with coverage and the build. All the checks pass. The coverage stays at 100%, because the new test runs each line of the new function.

## Remove the exercise

1. Discard the changes:

   ```bash
   git restore src/domain
   ```

2. Go back to the main branch and delete the exercise branch:

   ```bash
   git switch main
   git branch -D tutorial/first-change
   ```

3. Stop the development server with **Ctrl+C**.

## What you did

You installed the project with mise. You wrote a test before the code, you saw the test fail and then you made it pass. You ran the same checks as CI.

## Next steps

- To change the application for real, follow [Write a test first](../how-to/write-a-test-first.md).
- To find a command, read [Commands](../reference/commands.md).
- To learn how the code is organized, read [Architecture](../explanation/architecture.md).
