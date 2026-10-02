# Deploy LocalBiz AI

Phase 7 prepares **Vercel for the frontend**, **Render for Express**, and your existing
**MongoDB Atlas** database. This guide is preparation, not a claim that a live deployment exists.
Use the repository root for both services; this project uses npm workspaces and one lockfile.

## How requests work

The visitor opens the Vercel website. Its frontend calls `/api` on that same website.
Vercel forwards those requests to the Render API using `vercel.mjs`. Session cookies stay
HttpOnly, Secure, SameSite=Lax, host-only, and scoped to `/api`. No cookie setting needs
weakening. Gemini keys and database credentials belong only in Render, never Vercel.

The production build command is `npm run build:production`. It overrides local development
API URLs, including an existing `client/.env`, so the deployed app never points to localhost.
Vercel's API routing runs before the SPA fallback, and API responses disable CDN caching.
Dashboard deep links and refreshes use the frontend's `index.html` fallback.

## Before creating services

1. Commit and push the Phase 7 files using VS Code Source Control.
2. Have your Atlas URI and Gemini key available privately in `server/.env`.
   Do not paste them into chat, GitHub, this guide, or a frontend variable.
3. Choose the **Free** Render instance for the MVP. Do not add a disk or another database;
   saved profiles, campaigns, poster PNGs, sessions, and posting plans already live in Atlas.
4. Sign in to your Render account and Vercel's **NextStack Studio** workspace.
   If you need to create an account or grant repository access, complete those prompts yourself.

## 1. Create the Render API

In Render, choose **New → Web Service**, then select the `localbiz-ai` GitHub repository.
You can instead use **New → Blueprint** with `render.yaml`; do not create both.

| Setting           | Value                                 |
| ----------------- | ------------------------------------- |
| Branch            | `main`                                |
| Root directory    | Leave blank (repository root)         |
| Runtime           | Node                                  |
| Region            | Singapore, if available               |
| Instance type     | Free                                  |
| Build command     | `npm ci --include=dev`                |
| Start command     | `npm start`                           |
| Health check path | `/api/ready`                          |
| Auto-deploy       | Off; deploy reviewed commits manually |

Add these environment variables in Render:

| Variable           | Value                                                                     |
| ------------------ | ------------------------------------------------------------------------- |
| `NODE_ENV`         | `production`                                                              |
| `NODE_VERSION`     | `24`                                                                      |
| `HOST`             | `0.0.0.0`                                                                 |
| `TRUST_PROXY_HOPS` | `1`                                                                       |
| `CLIENT_URL`       | Your exact HTTPS Vercel production origin, with no path or trailing slash |
| `MONGODB_URI`      | Your real Atlas Drivers URI, with database `localbiz_ai`                  |
| `GEMINI_API_KEY`   | Your existing Gemini key                                                  |
| `GEMINI_MODEL`     | `gemini-3.1-flash-lite`                                                   |

Render sets `PORT` for the service; do not copy your local port or local `CLIENT_URL` here.
If Vercel has not assigned the frontend origin yet, temporarily use `https://setup.invalid`
for `CLIENT_URL`, then replace it in step 3 before testing login. It allows startup while
blocking browser writes from the future website until its real origin is configured.

Copy the service's assigned public HTTPS URL. Do not assume that a particular service
name guarantees an available hostname.

## 2. Allow Render to connect to Atlas

Open the Render service's **Connect → Outbound** tab. Copy every listed outbound CIDR range
and add them to the Atlas project's IP access list with a clear comment. Keep your development
IP entry if you still run locally. Do not use an allow-all IP entry as a shortcut.

Atlas access changes widen network access; review the listed Render ranges before applying
them. Those ranges are shared by services in that region, so the database user's password
and its restricted `readWrite` role for `localbiz_ai` remain necessary.

Redeploy/restart the Render service after fixing connection settings. Check:

- `/api/health`: HTTP 200, `status: "ok"`, `database: "connected"`.
- `/api/ready`: HTTP 200, `status: "ready"`.
- `/api/products`: HTTP 401 when you are not logged in.

Readiness returns 503 until Atlas is connected. A failed first health check can be caused
by missing Atlas network ranges; fix the access list and redeploy instead of weakening checks.

## 3. Create the Vercel frontend

In **NextStack Studio**, import the same GitHub repository.

| Setting              | Value                                           |
| -------------------- | ----------------------------------------------- |
| Root directory       | Leave blank (repository root)                   |
| Framework preset     | Vite                                            |
| Install command      | `npm ci --include=dev`                          |
| Build command        | `npm run build:production`                      |
| Output directory     | `client/dist`                                   |
| Node.js version      | 24.x                                            |
| Environment variable | `LOCALBIZ_API_ORIGIN` = the Render HTTPS origin |

`LOCALBIZ_API_ORIGIN` contains the backend origin only: no `/api`, query, password, or token.
Vercel evaluates `vercel.mjs` using that public value. Missing/invalid values stop configuration
instead of deploying a broken proxy. The production build fixes the browser API base to `/api`;
you do not need a `VITE_API_URL` setting for this setup. Remove obsolete Vercel API URL overrides.

Deploy, copy the assigned Vercel production origin, and update Render's `CLIENT_URL` to match
it exactly. Save the setting and redeploy the API. If you add a custom domain later, explicitly
add its exact HTTPS origin too. Preview deployment origins are blocked unless separately listed.

Check the API through the **Vercel** origin now: `/api/health`, `/api/ready`, and an anonymous
`/api/products` request. Never point the browser directly at an unrelated Render domain;
that would bypass the same-origin session setup.

## 4. Verify the live app

Follow [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) using a dedicated demo account and ordinary
public business information. Use your own product photo. Run one reviewed Gemini generation
to conserve quota; keep the saved draft and poster as a fallback for the presentation.

Check the PNG upload and download through Vercel as well as login. This design uses an external
API rewrite, not a Vercel Function for image uploads. Hosted transport/body limits still need
the live test; local validation does not certify the hosting provider's behavior.

## Free-hosting and MVP limits

Render Free sleeps after 15 minutes without traffic and may take about a minute to wake.
Open the live app before the demo, wait until readiness is green, and retry once if a startup
page appeared. The frontend shows a readable retry message for HTML proxy/startup responses.
There are no background requests to keep the service awake.

Only the nearest Render proxy is trusted. Do not set proxy trust to `true` or increase the hop
count to bypass a limit: callers can also reach Render directly. Vercel-proxied visitors may
share the same nearest-proxy authentication rate-limit bucket. Account-based Gemini limits
still apply per account. In-memory rate limits reset on restart and are not shared across
instances; this MVP is intended for one API instance and a small competition demo.

The public MVP still lacks password recovery/email verification and account-wide poster
storage quotas. Use a demo account you can keep access to. Production secrets go in hosting
environment settings; local `.env` files and credentials remain excluded from commits.

## Updates and rollback

For a frontend change, deploy the reviewed commit on Vercel. For an API change, use Render's
manual deploy for that commit. A breaking API/frontend change needs both deployments in a
planned order. Changing Vercel `LOCALBIZ_API_ORIGIN` requires a new frontend deployment;
changing Render environment variables requires an API redeploy/restart.

Keep the previous successful deployment available for rollback. Readiness and a test-account
login should pass after each deployment. A hosting rollback restores code, not deleted data.

## References

- [Render Express deployment](https://render.com/docs/deploy-node-express-app)
- [Render web services and port binding](https://render.com/docs/web-services)
- [Render Blueprint reference](https://render.com/docs/blueprint-spec)
- [Render outbound IP ranges](https://render.com/docs/outbound-ip-addresses)
- [Render Free behavior](https://render.com/docs/free)
- [Vercel programmatic configuration](https://vercel.com/docs/project-configuration/vercel-ts)
- [Vercel external rewrites and caching](https://vercel.com/docs/routing/rewrites)
