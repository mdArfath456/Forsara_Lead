# Forsara Lead Extractor — Backend

## Setup
```bash
cp .env.example .env      # fill in Mongo URI, session secret, API keys
npm install
npm run seed:admin -- <username> <password>   # creates the admin account in MongoDB
npm run dev                                    # nodemon-style watch via node --watch
```

> Note: In local development, use the frontend Vite dev server and its `/api` proxy (`frontend/npm run dev`). Direct cross-origin requests from `localhost:5173` to `localhost:5000` may not preserve session cookies reliably.

## Admin account
The single admin login is stored in MongoDB (`AdminUser` collection), not in
`.env` — matches the "seeded admin, no user management system" requirement.

Create or rotate it any time with:
```bash
npm run seed:admin -- myusername mypassword
```
This hashes the password with bcrypt before writing to the DB — the
plaintext is never stored.

## Architecture notes
- **Discovery order**: Google Places (New) is primary, Foursquare's free tier
  is the fallback if Google Places fails, hits a rate limit, or isn't
  configured — see `ProviderRegistry.js`. Both need an API key in `.env`.
- **Provider adapter layer**: `src/services/leadProviders/`. Add a new discovery
  or enrichment source by creating a new provider class implementing
  `LeadProvider`, registering it in `ProviderRegistry.js`, and adding a case
  in `normalizeLead.js`. Controllers never import providers directly.
- **OverpassProvider.js (OSM, free, no key) is still in the codebase** but not
  in the active chain — add it back to `ProviderRegistry.js`'s
  `discoveryProviders` array as a no-cost fallback if you want one later.
- **Soft delete everywhere**: use `.notDeleted()` query helper on `Lead`,
  never a raw `find({})`.
- **Redis is optional at runtime**: cache failures degrade to "always hit the
  provider" rather than crashing — see `config/redis.js`.
- **XLSX export is stubbed** in `export.controller.js` (returns 501) — wire up
  `exceljs` or `xlsx` (SheetJS) when you reach that phase; CSV/JSON work now.

## Not yet built (next phases)
- Input validators (zod schemas per route) — currently controllers trust
  request bodies; add validation middleware before production use.
- Fuzzy dedupe (currently exact-match on name+city+postal only).
- Frontend (Phase 2).
- Docker/CI (Phase 9).

    
## Company intelligence module
The lead detail flow now supports company enrichment, multiple POCs, and public website project/case-study discovery. Apollo Organization Enrichment and People Search/Enrichment are optional provider integrations and require `APOLLO_API_KEY`.

Enrichment is queued in MongoDB and processed by the existing scheduler once per minute, so the HTTP request returns quickly and the UI can poll job progress. CSV/JSON exports include company and POC fields when enrichment exists.

## Apollo API authentication

This backend uses Apollo **API-key authentication**, not OAuth. Create the key in Apollo Settings -> Integrations -> API Keys and set it as `APOLLO_API_KEY` in `backend/.env`.

For development, a master key can be used. For production, prefer a scoped key containing only the endpoints used by the application. Never put the Apollo key in the React frontend.

The application exposes an authenticated health check at `GET /api/integrations/apollo/status`. The endpoint verifies the server-side key against Apollo's `/auth/health` endpoint and returns a safe diagnostic message without exposing the secret.

If Apollo returns HTTP 401, replace/revoke the invalid key and restart the backend. HTTP 403 indicates that the key scope or Apollo plan does not allow the endpoint.

## Explorium company intelligence

The current enrichment pipeline uses Explorium as the primary B2B data provider. Keep the key on the backend only:

```env
EXPLORIUM_API_KEY=your_explorium_api_key
EXPLORIUM_MAX_POC_ENRICH=15
EXPLORIUM_ENABLE_HIERARCHY=true
```

Company selection follows this flow:

1. Company-first search / discovery
2. Explorium Business Match -> `business_id`
3. Firmographics enrichment
4. Technographics enrichment
5. Funding/acquisition enrichment
6. Optional company hierarchy enrichment
7. Explorium prospect fetch for decision makers
8. Prospect profile enrichment
9. Contact-information enrichment for email/phone
10. Public company website research for projects/case studies/news pages

Apollo remains an optional company-enrichment fallback when `APOLLO_API_KEY` is configured. Apollo is no longer used for POC discovery in the primary workflow.
