---
description: Core Engineering Principles & Minimal State Delta Rules
alwaysApply: true
---

# Core Development Axioms

1. **Understand Before Editing**: Read only files directly participating in the requested task flow.
2. **Minimal Necessary Delta**: Calculate and apply the smallest complete code change. Never rewrite unaffected functions or files.
3. **Check Existence Before Creation**:
   - Check if an existing function/utility already solves the problem (`art.isticcore/lib/`).
   - Check if standard platform / language APIs provide it.
   - Check if an installed dependency provides it.
   - Only create new code when demonstrated necessary.
4. **Zero Speculative Abstraction**: Do not build wrapper classes, helper functions, or config layers for single-use operations.
5. **Preserve Critical Guards**: Never remove or weaken validation (Zod), security (RLS, CSRF, auth), accessibility (ARIA/semantic HTML), or error handling to save lines.
6. **No Unsolicited Dependencies**: Do not install packages for convenience or trivial logic.
7. **Verify & Clean Diff**: Validate changes and review git diff to purge unused imports, dead code, and verbose logging before completion.
