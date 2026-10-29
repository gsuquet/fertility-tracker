# Write documentation

Use this procedure to add or change a page in `docs/`. The docs use Simplified Technical English (ASD-STE100) and the Diátaxis structure.

## Procedure

1. Find the type of the page. Read [Documentation rules](../reference/documentation-rules.md#page-types).
2. Put the page in the folder of its type: `tutorials`, `how-to`, `reference` or `explanation`.
3. Give the page a name that starts with a verb for a tutorial or a how-to guide. Give it a noun for the other types.
4. Write the page with the template of its type. Read [Documentation rules](../reference/documentation-rules.md#page-templates).
5. Write each sentence with the writing rules. Read [Documentation rules](../reference/documentation-rules.md#writing-rules).
6. Add a link to the page in `docs/README.md`.
7. Run the docs check:

   ```bash
   mise run docs
   ```

8. Correct each finding. Then run the docs check again.

## Write a record

1. Select the type of record:
   - Write an RFC for a large change that needs discussion before the work.
   - Write an ADR for one decision.
2. Copy `docs/records/rfcs/0000-template.md` or `docs/records/adrs/0000-template.md` to a new file. Use the next free number of that type.
3. Write each section of the template.
4. Add a link to the record in the **Records** section of `docs/README.md`.
5. Open a pull request. For an RFC, use the title `docs(rfc): ...` and set the status to **Proposed**.
6. For an RFC, wait for the written decision of the maintainer. Do not merge the pull request before this decision.
7. After the project accepts an RFC, write a short ADR for each decision in it. Link the ADR to the RFC in **More information**.

## Result

The docs check passes. The page has one type and the index links to it.

## Related documents

- [Why the docs use STE and Diátaxis](../explanation/documentation-approach.md)
