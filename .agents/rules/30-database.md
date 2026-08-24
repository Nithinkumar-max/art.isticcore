---
description: Database, PostgreSQL, Supabase RLS, and Schema Guidelines
globs: ["art.isticcore/supabase/**", "**/schema.sql", "**/migrations/**", "db/**"]
alwaysApply: false
---

# Database Guidelines

1. **Supabase Schema & Migrations**:
   - Keep schema definitions synchronized in `art.isticcore/supabase/schema.sql`.
   - Use snake_case for PostgreSQL tables and column names.
   - Use appropriate constraints (PRIMARY KEY, FOREIGN KEY ON DELETE CASCADE/SET NULL, UNIQUE, NOT NULL).
2. **Row Level Security (RLS)**:
   - Always enable RLS on newly created public tables: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`.
   - Write granular policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
   - Differentiate authenticated user access (`auth.uid() = user_id`) vs public read access vs service role.
3. **Indexing & Query Performance**:
   - Add indexes on foreign keys, filtered columns (e.g. `status`, `created_at`), and columns used in WHERE / ORDER BY.
