---
description: Testing and Quality Assurance Standards
globs: ["**/*.test.{ts,tsx,js}", "**/*.spec.{ts,tsx,js}", "**/tests/**", "**/__tests__/**"]
alwaysApply: false
---

# Testing Standards

1. **Targeted Testing**:
   - Test critical business logic (e.g. cart totals, discount rules, payment signature verification, validation schemas).
   - Write deterministic tests without brittle or deep mocks.
2. **Minimal Maintenance**:
   - Focus tests on user behavior / observable contract rather than internal implementation details.
   - Clean up mock states after each test suite.
