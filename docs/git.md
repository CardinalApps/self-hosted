# Git Practices

This repository uses a trunk-based git workflow.

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

## Branches & Merging

Use short lived feature branches for development, and rebase against `main`
frequently. Your feature branch should adhere to the following rules when
submitting a PR:

1. The PR should not change any unnecessary lines of code.
1. The PR should not contain merge commits.
1. Your commits should be signed.
