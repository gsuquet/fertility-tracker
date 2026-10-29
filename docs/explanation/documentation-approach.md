# Why the docs use STE and Diátaxis

This page tells why the documentation uses Simplified Technical English (STE) and the Diátaxis structure.

## The readers

The docs have two groups of readers. Users chart their fertility signs. Contributors change the code. Many readers do not have English as their first language. Some readers use machine translation.

## Why Simplified Technical English

ASD-STE100 is a controlled language. The aerospace industry made it for maintenance manuals. It has a limited set of words with one meaning each, and rules for short and clear sentences.

The application gives health information. A sentence with two meanings can cause a wrong decision. STE decreases this risk:

- Short sentences are easy to read and to translate.
- One word for one meaning removes doubt. For example, the docs always use "observation" and never "entry" or "log".
- The imperative in steps tells the reader exactly what to do.

STE also has costs. The text can sound repetitive, and some ideas need more sentences. The project accepts these costs for clarity.

The docs use a subset of STE. The full standard has a dictionary of about 900 approved words. The project does not check each word against that dictionary. It checks sentence length, paragraph length, contractions and a list of words that are frequently wrong. Read [Documentation rules](../reference/documentation-rules.md) for the list.

## Why Diátaxis

Diátaxis divides documentation into four types: tutorials, how-to guides, reference and explanation. Each type answers a different need of the reader.

A page that mixes types serves no reader well. For example, a reader who wants a fact must not read a lesson to find it. A user who follows steps must not stop for long reasons.

The project uses a strict form of Diátaxis. Each page has exactly one type and goes in the folder of that type. The docs check makes sure that each page is in a correct folder and that the index links to it.

## Why the records are not Diátaxis pages

A record tells the story of one proposal or one decision at one date. It does not change after the merge. Only an RFC can change, in an amendment that the maintainer decides in writing. But the product changes. Thus, a record is not a tutorial, a how-to guide, a reference page or an explanation.

The records are in `docs/records/`. An RFC proposes a large change before the work starts. An ADR gives one decision and its reasons. The reference pages give the current rules, and they link to the records for the reasons.

## Why a docs check in CI

Rules that nobody checks are soon forgotten. The docs check runs in the pre-commit hooks and in CI. It also finds broken links, which occur each time a page moves. The check is small and has its own tests in `scripts/docs/`.

## Related documents

- [Write documentation](../how-to/write-documentation.md)
- [Documentation rules](../reference/documentation-rules.md)
