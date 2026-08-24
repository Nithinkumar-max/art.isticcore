# Refactor Workflow

Follow this workflow to simplify code and remove technical debt without behavior regressions:

## 1. Scope Definition
- Identify the duplicate logic, dead code, or over-engineered abstractions targeted for cleanup.
- Ensure test/type coverage is understood before making alterations.

## 2. Simplification
- Apply the Ponytail methodology: eliminate single-use wrappers, inline unnecessary layers, and reuse canonical utilities in `art.isticcore/lib/`.
- Ensure zero behavioral changes or external API contract breaks.

## 3. Verification
- Validate type checking and existing tests.
- Inspect diff to verify net reduction in lines of code and complexity.
