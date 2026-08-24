---
description: Ponytail Token Efficiency, Change Budget, and Diff-First Review
alwaysApply: true
---

# Token Efficiency & Ponytail Protocol

1. **Targeted Reading Protocol**:
   - Trace caller -> handler -> data layer before reading files.
   - Do NOT scan entire directory trees or open unrelated files.
   - Target line ranges when inspecting large files.

2. **Ponytail Ladder**:
   1. Does this logic need to exist?
   2. Does it already exist in the codebase?
   3. Is it in the language / stdlib?
   4. Is it a native platform/browser feature?
   5. Can an installed dependency solve it?
   6. Can it be written in minimal lines?
   7. Implement the minimal necessary logic.

3. **Change Budget**:
   - Target minimum files, minimum lines of code, and minimum tool calls.
   - Exception: Never sacrifice correctness, security, validation, accessibility, or error handling.

4. **Diff-First Cleanup**:
   - Review the diff before finishing.
   - Eliminate redundant abstractions, duplicate code, unused imports, dead comments, and speculative features.
   - Keep responses crisp: list changed files, 1-line summary per file, verification status.
