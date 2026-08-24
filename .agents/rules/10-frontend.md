---
description: Frontend UI, React 19, Next.js App Router, Tailwind CSS Rules
globs: ["art.isticcore/app/**/*.{tsx,jsx,ts,js,css}", "art.isticcore/components/**/*.{tsx,jsx,ts,js,css}", "components/**", "app/**"]
alwaysApply: false
---

# Frontend Guidelines

1. **React 19 & Next.js 16 App Router**:
   - Keep components as Server Components by default. Add `'use client'` only when state, event handlers, or browser APIs are required.
   - Colocate component state close to where it is used; use Zustand (`art.isticcore/store/`) only for truly global state (e.g., cart, user session).
2. **Styling & Design System**:
   - Use Tailwind CSS v4 utility classes and existing CSS variables in `art.isticcore/app/globals.css`.
   - Prefer semantic HTML (`<main>`, `<section>`, `<nav>`, `<button>`) with proper ARIA attributes.
   - Use native HTML elements (e.g. `<input type="date">`, `<dialog>`) before pulling in heavyweight UI widgets.
3. **Icons & Animations**:
   - Use `lucide-react` for icons (already installed).
   - Use `framer-motion` for transitions only where micro-animations enhance UX; keep animations lightweight.
4. **Performance & Cleanliness**:
   - Prevent unnecessary re-renders with targeted React Query hooks or memoization where necessary.
   - Clean up event listeners and timers in `useEffect` cleanup return functions.
