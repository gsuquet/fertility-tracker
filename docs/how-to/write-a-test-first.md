# Write a test first

Use this procedure to change the behavior of the application with test-driven development (TDD).

## Before you start

- Install the tools and the dependencies. Read [Install and run locally](install-and-run-locally.md).
- Write the change in `SPEC.md` first. Read [Release a new version](release-a-new-version.md).

## Procedure

1. Find the layer of the change. Read [Test layers](../reference/test-rules.md#test-layers).
2. Open the test file of that layer. If no test file exists, make one in the `__tests__` folder next to the source file.
3. Write one test for the new behavior. Use the helpers in [Test rules and helpers](../reference/test-rules.md#test-helpers).
4. Start the tests in watch mode:

   ```bash
   npm run test:watch
   ```

5. Make sure that the new test fails. Make sure that it fails for the correct reason.
6. Write the minimum code that makes the test pass.
7. Make the code better. Keep all the tests green.
8. Do steps 3 to 7 again for each subsequent behavior.
9. Run the tests with coverage:

   ```bash
   mise run coverage
   ```

10. If the coverage is less than 100%, read the list of lines in the report. For each line, do one of these steps:
    - Write a test for the line.
    - Remove the line if no user action or data can make it run.
11. Run all the quality gates before you push:

    ```bash
    mise run validate
    ```

## Result

The new behavior has a test. The coverage stays at 100%. The CI workflow passes.

## Example

This example adds `getCycleEndDate` to `src/domain/cycleBoundaryDetector.ts`.

1. Add a test to `src/domain/__tests__/cycleBoundaryDetector.test.ts`:

   ```ts
   it('returns the start date of an empty cycle', () => {
     expect(getCycleEndDate({ id: 'c', startDate: '2026-09-01', observations: [] })).toBe(
       '2026-09-01'
     );
   });
   ```

2. Run the tests. The test fails because the function does not exist.
3. Add the function:

   ```ts
   export function getCycleEndDate(cycle: Cycle): string {
     return cycle.observations.at(-1)?.date ?? cycle.startDate;
   }
   ```

4. Run the tests. The test passes.
5. Add a second test for a cycle with observations. Now each branch has a test.

## Related documents

- [Testing strategy](../explanation/testing-strategy.md)
- [Commands](../reference/commands.md)
