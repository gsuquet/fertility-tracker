# Testing strategy

This page tells why the project uses test-driven development and 100% coverage, and what the tests cannot find. For the rules and the helpers, read [Test rules and helpers](../reference/test-rules.md).

## Why test-driven development

In test-driven development (TDD), you write a test before the code. The test fails first. Then you write the code that makes it pass.

A test that you saw fail proves that it can find an error. A test that you write after the code can pass for the wrong reason. TDD also keeps the code small, because you write only the code that a test needs.

## Why 100% coverage

The application gives fertility information. An error in a stamp rule or a cycle rule gives incorrect information to the user. A test for each branch makes sure that each rule has a known result.

100% coverage does not prove that the code is correct. It proves that each line ran in a test. The tests must also make assertions about the result.

A coverage gap is often a sign of dead code. For example, a guard for a value that the types do not permit, or a fallback for a translation that always exists. Thus, the project removes such code and does not use ignore comments. Each line that stays can run.

## Why most rules are in the domain layer

Domain tests are fast and do not need a browser. A rule in a pure function is easy to test with many examples. A rule in a component needs a render and user actions for each example. Thus, the project puts each rule in `src/domain/` and keeps the components thin.

## Why tests find elements by role

A user finds a button by its name, not by its CSS class. A test that does the same thing also checks accessibility. It does not break when the styles change.

## What the tests cannot find

The tests run in jsdom, not in a real browser. jsdom does not apply CSS and does not draw the page. Thus, the tests cannot find a color or a layout problem.

For a visual change, also look at the page in a browser. Look at the light theme and the dark theme, on a wide screen and on a phone screen. After you find a problem, a style test in `src/styles/__tests__/` keeps the correction in place.

## Related documents

- [Write a test first](../how-to/write-a-test-first.md)
- [Architecture](architecture.md)
