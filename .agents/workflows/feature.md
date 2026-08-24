# Feature Development Workflow

Follow this 3-phase structured workflow for implementing new features with maximum token efficiency:

## Phase 1: Targeted Exploration
1. Identify the entry point and data flow:
   - UI trigger -> Server Action / API Route -> Service / DB Schema.
2. Read only the specific files participating in this flow.
3. Check `PROJECT_MAP.md` and existing helpers in `art.isticcore/lib/` to avoid reinventing existing logic.
4. Formulate the minimal implementation plan.

## Phase 2: Surgical Implementation
1. Apply changes adhering to the Ponytail Ladder:
   - Reuse existing utilities before creating new functions.
   - Use native browser/platform features where possible.
   - Create the minimum necessary code without speculative abstractions.
2. Maintain all validation (Zod schemas), security (RLS, auth), and error handling.

## Phase 3: Verification & Ponytail Review
1. Verify the functionality (run build/lint/typecheck or manual test steps).
2. Inspect the git diff and perform a cleanup:
   - Remove unused imports, dead comments, and redundant helpers.
3. Return a concise output:
   - List of changed files
   - 1-line summary per file
   - Verification status
