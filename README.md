# LocalBiz AI

A focused **LovHack Season 3 — Phase 1** starter by **NextStack Studio**.
LocalBiz AI is the foundation for a future workspace where local businesses can organize
products, plan campaigns, and manage a content calendar.

This phase contains a responsive UI shell and an Express health API. It does not implement
authentication, MongoDB models, product storage, AI, campaign generation, scheduling, or
social integrations.

## Requirements

- Node.js **24 or newer** and npm (tested with Node 24).
- MongoDB is **optional**. No database or paid API keys are needed to explore Phase 1.

## Start locally

Open a terminal at the project root. On Windows PowerShell:

```powershell
Set-Location 'D:\D I N U K A\Competitions\LovHack\Season 03\localbiz-ai'
npm install
Copy-Item client/.env.example client/.env
Copy-Item server/.env.example server/.env
npm run dev
```

Copy the environment templates only on first setup; do not overwrite your customized files.
If PowerShell blocks npm.ps1, use `npm.cmd` in place of `npm`.

On macOS/Linux, change into your copy of the project, run `npm install`, then use:

```sh
cp client/.env.example client/.env
cp server/.env.example server/.env
npm run dev
```

One command starts both apps:

- Frontend: **http://localhost:5173**
- Dashboard: **http://localhost:5173/dashboard**
- Backend health: **http://localhost:5000/api/health**

Press **Ctrl+C** to stop both. Vite reloads frontend edits; Node watch mode restarts the backend.
Both listen on localhost by default. No database connection is attempted when MONGODB_URI is blank.

Prefer separate terminals? From the root:

```sh
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev:client
```

You can also run `npm run dev` from inside either client/ or server/ after installing at the root.

## What is included

| Area            | Phase 1 behavior                                                              |
| --------------- | ----------------------------------------------------------------------------- |
| Frontend        | React, Vite, Tailwind CSS, React Router, Lucide icons                         |
| Dashboard       | Shared sidebar, mobile menu, active navigation, responsive page layouts       |
| Status          | Live API health indicator with retry and offline state                        |
| Calendar        | Current month, previous/next month, and Today navigation; no stored events    |
| Backend         | Express, CORS for configured frontend origins, JSON parsing, JSON 404/errors  |
| MongoDB         | Optional Mongoose connection helper, status reporting, graceful disconnection |
| Developer tools | npm workspaces, shared lockfile, ESLint, Prettier, Node HTTP tests            |

All visible counts are zero for this empty workspace. Forms and future actions are disabled.
The New campaign link opens a layout preview; it does not create a campaign. No user data is
saved in browser storage or sent to an auth, AI, or campaign service.

## Routes

| URL                        | Page                                   |
| -------------------------- | -------------------------------------- |
| `/`                        | Landing page                           |
| `/login`                   | Login preview (disabled fields)        |
| `/register`                | Registration preview (disabled fields) |
| `/dashboard`               | Overview and workspace tour            |
| `/dashboard/products`      | Empty product catalog                  |
| `/dashboard/campaigns/new` | Disabled campaign builder preview      |
| `/dashboard/campaigns`     | Empty campaign collection              |
| `/dashboard/calendar`      | Browsable empty calendar               |
| `/dashboard/profile`       | Disabled business profile preview      |
| Unmatched routes           | Helpful page-not-found screen          |

Dashboard routes are public in Phase 1. There are no route guards, sessions, tokens, or accounts.

## Project structure

```text
localbiz-ai/
├── client/
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── components/      # Brand, page headers, empty states, status, illustration
│   │   ├── layouts/         # Shared dashboard navigation and frame
│   │   ├── pages/           # One component per screen (auth previews share a component)
│   │   ├── App.jsx          # Route definitions
│   │   ├── index.css        # Tailwind theme, shared classes, storefront illustration
│   │   └── main.jsx         # React entry point
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── config/env.js    # Environment loading and port validation
│   │   ├── config/database.js
│   │   ├── routes/health.js
│   │   ├── app.js           # Express app; can be tested without starting MongoDB
│   │   └── index.js         # Startup and shutdown
│   ├── test/health.test.js
│   ├── .env.example
│   └── package.json
├── .gitignore
├── .nvmrc
├── AGENTS.md
├── eslint.config.js
├── package.json
├── package-lock.json
└── README.md
```

## Environment variables

### client/.env

| Name           | Default                     | Purpose                        |
| -------------- | --------------------------- | ------------------------------ |
| `VITE_API_URL` | `http://localhost:5000/api` | API base URL, including `/api` |

Vite exposes VITE_ variables to the browser and embeds them at build time. Never put passwords,
MongoDB URIs, or secret keys in client/.env. Restart Vite after changing this file.

### server/.env

| Name          | Default                                       | Purpose                                             |
| ------------- | --------------------------------------------- | --------------------------------------------------- |
| `NODE_ENV`    | `development` in template                     | Standard runtime mode                               |
| `HOST`        | `localhost`                                   | Bind address; configure explicitly if hosting later |
| `PORT`        | `5000`                                        | API port                                            |
| `CLIENT_URL`  | `http://localhost:5173,http://localhost:4173` | Comma-separated allowed browser origins             |
| `MONGODB_URI` | blank                                         | Optional MongoDB connection string                  |

For local MongoDB, start your own MongoDB instance and set:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/localbiz_ai
```

For MongoDB Atlas, put your own connection string in server/.env and configure the database
user and network access in Atlas. No collections or models are created by this starter.
Restart the backend after editing server/.env. Node watch mode tracks source imports, not .env changes.

When a configured connection fails, the API remains available and reports the database as
disconnected. The health endpoint is **API liveness**, not a database readiness check.

## Health endpoint

`GET /api/health` returns HTTP 200 while the API is running:

```json
{
  "status": "ok",
  "service": "localbiz-ai-api",
  "timestamp": "2026-09-30T00:00:00.000Z",
  "uptimeSeconds": 12,
  "database": "not_configured"
}
```

The timestamp and uptime are live values. Database status can be not_configured, disconnected,
connected, connecting, or disconnecting. No credentials appear in the response.

To check it in PowerShell:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

## Checks and useful commands

```sh
npm run lint          # ESLint across client and server
npm test              # Real HTTP tests: health, CORS, 404, malformed JSON
npm run build         # Production frontend build -> client/dist
npm run preview       # Preview the frontend build on http://localhost:4173
npm start             # Run only the backend without watch mode
npm run format        # Format source and docs
npm run format:check  # Check formatting without changing files
```

The tests use a temporary local HTTP port and never connect to MongoDB.
Run the backend separately when using the production frontend preview.
The backend does not serve client/dist; deploying these apps is a later task.
Any future frontend host must route client URLs back to index.html for React Router deep links.

## Troubleshooting

- **Port already in use:** stop the previous process with Ctrl+C. Vite uses strictPort so it
  does not silently switch addresses. To change the backend port, update server/.env and
  VITE_API_URL in client/.env together, then restart both apps.
- **Server unavailable in the sidebar:** start the backend, open /api/health, verify
  VITE_API_URL and CLIENT_URL match the addresses you use, then click the refresh icon.
- **MongoDB connection failed:** leave MONGODB_URI blank for Phase 1, or verify your
  database is running and its credentials/network settings are correct.
- **A button is disabled:** that feature is intentionally reserved for a later phase.

## Scope for the next phase

Discuss and authorize the next phase before adding functionality. Authentication, database
models, product CRUD, AI providers, campaign generation, and social integrations are all out
of scope for this foundation.

Setup references: [Vite](https://vite.dev/guide/),
[Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite),
[React Router](https://reactrouter.com/start/declarative/installation),
and [Express](https://expressjs.com/en/starter/installing/).
