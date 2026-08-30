# Forsara Lead Extractor — Frontend

## Setup
```bash
npm install
npm run dev     # http://localhost:5173, proxies /api to http://localhost:5000
```

Requires the backend running (see `/backend/README.md`) — this app authenticates
via the session cookie the backend issues, so both must run on origins that
share cookies in dev (the Vite proxy handles this).

## Structure
- `pages/` — one file per route (Dashboard, Search, Projects, Lead Management,
  Analytics, Export, Settings, Login)
- `components/` — shared UI (AppLayout/sidebar, DataTable, StatCard, status states)
- `lib/apiClient.js` — single axios instance, handles 401 → redirect to login
- `store/authStore.jsx` — session status context, no Redux needed for one flag
- `routes/RequireAuth.jsx` — route guard

## Not yet built
- Framer Motion page transitions (dependency included, not wired into routes yet)
- React Hook Form + Zod validation on the search form (currently plain controlled inputs)
- Dark mode toggle wired to `<html class="dark">` (Settings page saves the
  preference to the backend but doesn't yet apply it live)
- XLSX export UI is present but backend returns 501 until that's wired up
