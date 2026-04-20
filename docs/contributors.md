# Contributors

## Commit Messages

All commits should be in the format of:

```
<prefix>: <message>
```

Where `prefix` is one of:

- `feat` - new code
- `tweak` - micro edits, no changes to logic
- `refactor` - reshaping existing code, changing logic
- `fix` - bug fixes
- `test` - code that tests other code
- `opt` - code performance optimization
- `docs` - docs, anywhere
- `chore` - codebase maintenance
- `ci` - CI & IAC configs
- `migrate` - code ported from another codebase, as is
- `revert` - retracting code
- `debug` - code added to find problems

## Working With AI

Follow these guidelines for working with AI in this repository.

1. Code can be co-authored by AI as long as the primary author of the commit
   (the person) has a complete understanding of the code, no matter how much or
   how little of it comes from AI. This concept predates AI but it bears
   repeating.
2. PR descriptions must be written by people, not AI.
3. Your commits should be transparent about which lines were written by AI and
   which were not (by using the co-author part of the commit). Claude does this
   automatically, and Codex can be instructed to do it.
4. AI code should generally be held to a higher standard than human code, and
   should include ample testing, and clean code comments that explain intent.

## Branches & Merging

This repository uses a trunk-based git workflow. Use short lived feature
branches for development, and rebase against `main` frequently. Your feature
branch should adhere to the following rules when submitting a PR:

1. The PR should not change any unnecessary lines of code.
1. The PR should not contain merge commits.
