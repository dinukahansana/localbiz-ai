# LocalBiz AI contributor guide

## Current scope

This project is the Phase 8 AI-poster, campaign, and content-calendar workspace for LovHack Season 3, by NextStack Studio.
Keep the MVP focused and the JavaScript beginner-readable.

- Keep the React + Vite + Tailwind frontend in `client/`.
- Keep the Node.js + Express backend in `server/`.
- Use npm workspaces and the root package-lock.json. Run npm install at the project root.
- Keep the public pages and dashboard routes working on desktop and mobile.
- Registration, login, logout, protected routes, and per-account MongoDB data are authorized.
- Scope all profile/product queries to the authenticated user; ignore form-supplied owners.
- One uploaded photo per product, private MongoDB storage, preview/replacement/removal, and reuse as a poster reference are authorized.
- Validate decoded photos, limit uploads to 5 MB/20 million pixels, strip metadata and keep photo bytes out of product JSON.
- Keep legacy shared Phase 2 records untouched until a migration is explicitly authorized.
- Gemini campaign generation, editable saved drafts, and per-account campaign CRUD are authorized.
- Keep generation separate from saving. Validate AI output and protect quota with limits.
- Send only the authenticated business profile, selected product facts, and campaign brief to Gemini.
- Free branded posters from user-uploaded product photos, private poster storage, and PNG downloads are authorized.
- deAPI AI promotion posters from editable campaign prompts and optional reference photos are authorized.
- Keep AI generation asynchronous, separate from saving, and resumable without resubmitting paid calls.
- Use exact price quotes, persistent app/account credit limits, and server-owned image provenance.
- Send only owned public product/campaign details and the chosen uploaded or saved product reference to deAPI.
- Keep poster previews separate from saving. Never fetch arbitrary image URLs on the server.
- Decode and validate saved PNGs; keep image bytes out of campaign lists and scope access to owners.
- Private posting plans, date changes, recoverable cancellation, and manual published status are authorized.
- Store posting dates as UTC instants and label calendar/date-picker times as Sri Lanka (Asia/Colombo).
- Keep one plan per campaign post, scope all plan queries to owners, and remove plans with deleted campaigns.
- A planned date never triggers a social API call; published means the user manually confirmed sharing.
- Production configuration, Vercel frontend/Render backend setup, and demo/submission documentation are authorized.
- Build production with npm run build:production so browser requests use the same-origin /api proxy.
- Keep host URLs exact, production cookies Secure, API replies uncached, and nearest-proxy trust bounded.
- Live release checks must be recorded separately from local verification. Never claim a prepared deployment is live.
- Do not add background publishing, social integrations, or further paid providers without later authorization.
- Placeholder controls must be disabled and visibly described as coming soon.
- Do not present invented analytics, campaigns, products, or user accounts as real data.

## Code conventions

- Use JavaScript ES modules, functional React components, and plain descriptive names.
- Prefer small page and component files over clever abstractions.
- Keep common colors and shared styles in client/src/index.css.
- Use Tailwind utilities for layouts and responsive styling.
- Use React Router Link/NavLink for internal navigation.
- Include accessible labels, keyboard focus styles, semantic headings, and empty states.
- Comment decisions and non-obvious behavior; avoid comments that just restate the code.
- Use Prettier to keep JSX readable. Do not commit generated build files or node_modules.

## Environment and backend

- Keep secrets in server/.env; never put secrets in VITE_ variables.
- Update .env.example files and README when configuration changes.
- The API must start with a blank MONGODB_URI, but data routes must return 503 without a database.
- Pick explicit request fields, validate them, and keep IDs/timestamps server-controlled.
- Store product prices as integer minor units and return a two-decimal price string.
- GET /api/health reports API liveness and a separate MongoDB state.
- Never log connection strings, credentials, or raw database connection errors.
- Hash passwords with scrypt and store only hashes of random session tokens in MongoDB.
- Use HttpOnly cookies, production Secure cookies, checked expiry, and server-side logout revocation.
- Protect writes with the request marker and allowed-origin check; rate-limit authentication.
- Never log passwords or tokens, or store session credentials in localStorage.
- Before deployment, configure HTTPS, same-site frontend/API routing, and trusted proxy behavior.
- Tests must use a disposable MongoDB instance and never the developer's Atlas database.
- Automated tests must stub Gemini/deAPI and never use the developer's keys. Live checks use synthetic data.

## Verification

Run from the project root after meaningful changes:

```sh
npm run lint
npm test
npm run build
npm run format:check
```

For UI changes, run npm run dev and check affected routes at desktop and mobile widths.
Check direct navigation and refresh, active navigation, disabled placeholders, and the
backend status indicator. Add tests when they protect meaningful behavior; avoid tests
that only repeat static markup.

## Handoff

Update README with new commands, actual behavior, and any limits. Report checks run and
any failures. Do not commit, push, deploy, or change Git remotes unless asked.
