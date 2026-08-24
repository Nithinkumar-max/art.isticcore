# Review & Ponytail Diff Audit Workflow

Follow this workflow to inspect uncommitted changes, identify over-engineering, and produce a delete/cleanup list:

## 1. Inspect Diff
- Run git diff on modified/staged files.

## 2. Evaluate Against Ponytail Criteria
- **Over-engineering**: Are there unused helpers, unnecessary abstractions, or redundant wrappers?
- **Dead Code**: Are there leftover `console.log` statements, unused imports, or dead variables?
- **Preservation Check**: Did any edits inadvertently weaken security, input validation, error handling, or accessibility?

## 3. Action Output
- Provide a concise Delete / Simplification list.
- Apply surgical removals to leave a clean, minimal diff.
