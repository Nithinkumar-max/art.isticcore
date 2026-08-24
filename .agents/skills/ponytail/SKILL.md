---
name: ponytail
description: Ponytail token-saving and minimal-necessary implementation skill. Provides modes (lite, full, ultra, off) and commands (/ponytail, /ponytail-review, /ponytail-audit, /ponytail-debt, /ponytail-gain) to maximize engineering output per token while strictly preserving security, validation, error handling, and accessibility.
---

# Ponytail Skill & Methodology

Ponytail optimizes LLM token efficiency by enforcing the principle of **minimal necessary implementation**.

## The Ponytail Decision Ladder
Before writing any code or introducing dependencies, evaluate in this order:
1. **Does this need to exist?**
2. **Does it already exist in the codebase?** (Search existing utilities in `art.isticcore/lib/`)
3. **Is it in the standard library / platform?** (Use native browser/Node APIs)
4. **Is it a native HTML/CSS feature?** (e.g. `<input type="date">`, `<dialog>`)
5. **Can an existing dependency do it?** (Check installed packages)
6. **Can it be written in minimal lines?**
7. **Implement the smallest complete solution.**

## Modes
- **`lite`**: Relaxed checks for small tweaks and single-file fixes.
- **`full` (Default)**: Balanced mode for standard feature development and bug fixes.
- **`ultra`**: Aggressive minimalism for refactoring and dead code elimination.
- **`off`**: Ponytail heuristics bypassed for complex architectural redesigns or greenfield scaffolding where maximal reasoning is required.

## Commands & Workflows
- **`/ponytail`**: Run the Ponytail ladder assessment on the current task.
- **`/ponytail-review`**: Inspect uncommitted diff, detect over-engineering, and generate a deletion list.
- **`/ponytail-audit`**: Scan the workspace for unused dependencies, duplicate utilities, and code bloat.
- **`/ponytail-debt`**: Calculate technical debt and locate high-complexity modules.
- **`/ponytail-gain`**: Report lines of code removed and token savings achieved.

## Core Mandate: Inviolable Guards
Never sacrifice or golf away:
- **Validation**: Zod schema validation on untrusted inputs.
- **Security**: Supabase Row Level Security (RLS), authentication checks, CSRF, and secret separation.
- **Error Handling**: Graceful failure modes, structured API responses, and user-facing error boundaries.
- **Accessibility**: Semantic HTML and proper ARIA states.
