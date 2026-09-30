# LocalBiz AI contributor guide

## Current scope

This project is the Phase 1 foundation for LovHack Season 3, by NextStack Studio.
Keep the MVP focused and the JavaScript beginner-readable.

- Keep the React + Vite + Tailwind frontend in `client/`.
- Keep the Node.js + Express backend in `server/`.
- Use npm workspaces and the root package-lock.json. Run npm install at the project root.
- Keep the public pages and dashboard routes working on desktop and mobile.
- Do not add authentication, database models, AI calls, campaign generation, product CRUD,
  persistence, or social integrations unless the user explicitly asks for a later phase.
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
- MongoDB remains optional for Phase 1. The API must start with a blank MONGODB_URI.
- GET /api/health reports API liveness and a separate MongoDB state.
- Never log connection strings, credentials, or raw database connection errors.
- No authentication exists. Dashboard pages are deliberately public previews.

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
