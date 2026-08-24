# Bugfix Workflow

Follow this targeted process to diagnose and fix bugs with minimal context overhead:

## 1. Trace & Isolate
- Locate the symptom entry point.
- Trace backwards: Error boundary / API response -> Handler -> Root cause.
- Read only the directly affected files. Do not scan unrelated directories.

## 2. Root Cause Analysis & Plan
- Determine the minimal logic correction needed.
- Ensure the fix addresses the root cause without introducing side effects or regressions.

## 3. Surgical Delta Injection
- Modify only the necessary lines.
- Preserve existing formatting, comments, and structure outside the delta boundary.

## 4. Verification & Diff Check
- Test the fix to confirm the bug is resolved.
- Verify no new regressions or lint issues.
- Return: Root cause explanation (1 sentence), changed files, verification status.
