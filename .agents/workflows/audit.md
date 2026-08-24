# Audit Workflow

Conduct a rapid token-efficient audit of the codebase:

## 1. Security & Guards Audit
- Check RLS policies in `art.isticcore/supabase/schema.sql`.
- Check secret leak risks in client components.
- Check input validations on API endpoints (`art.isticcore/app/api/`).

## 2. Bloat & Dependency Audit
- Scan `package.json` for unused or duplicate dependencies.
- Identify duplicate utilities across `art.isticcore/lib/` and `art.isticcore/components/`.

## 3. Findings Summary
- Bulleted list of actionable findings prioritized by severity (High, Med, Low).
