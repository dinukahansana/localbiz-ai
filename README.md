# LocalBiz AI

**LovHack Season 3 — Phase 4**, by **NextStack Studio**.
A responsive React workspace for local businesses, with an Express API and MongoDB persistence.

## What works

- Registration, login, logout, and sessions that survive browser refresh.
- Protected dashboard routes and separate business profiles/products for each account.

- Save and edit a business name, category, location, and story.
- Add, list, edit, and delete products with name, category, description, price, currency,
  and an optional public image URL. Deletion asks for confirmation.
- Saved business name appears in the sidebar; the overview shows the real product count.
- Loading, empty, validation, success, and retry states on the data screens.
- Responsive dashboard navigation and a live API/database connection indicator.
- Generate three editable social post ideas from your profile and a selected product with Gemini.
- Choose Facebook/Instagram, tone, audience, and English/Sinhala/Tamil.
- Review and edit captions, hashtags, calls to action, and practical photo ideas; copy post text.
- Save, reopen, edit, and delete account-private campaign drafts in MongoDB.
- Overview shows the real draft count and recent saved campaigns.
- Landing, working login/register screens, and browsable calendar.

Scheduled posts, generated images, file uploads, and social integrations are later phases.
Email verification, password reset, OAuth, MFA, and account deletion are not included yet.

Existing shared Phase 2 records remain unchanged in Atlas, but are hidden from new accounts
because they have no verified owner. Registration never claims them. After creating your
real account, authorize a deliberate migration if you want those records assigned to it.

## Authentication

Use `/register` to create an account with your name, email, and a **15–128 character password**.
Emails are normalized to lowercase. Registration signs you in. Logout in the dashboard
revokes the current session on the server.

- Passwords are salted and hashed with Node scrypt (N=32768, r=8, p=3).
- A random opaque session token is kept in an HttpOnly, SameSite=Lax cookie at `/api`.
  MongoDB stores only its hash. Tokens/passwords are never put in localStorage.
- Sessions expire after seven days. Requests check expiry independently of MongoDB TTL cleanup.
- Cookies are Secure when `NODE_ENV=production`; no JWT signing secret is required.
- Authentication POST requests allow 20 attempts per IP in 15 minutes. This MVP limiter is
  in-process; shared rate limits and trusted proxy settings belong to deployment setup.
- Writes require `X-LocalBiz-Request: 1` and reject unexpected browser origins. Private
  responses are not cached. Frontend requests include credentials.
- Every profile/product query uses the authenticated owner. Foreign IDs return 404 and
  form-supplied owners are ignored.

Deploy with HTTPS and same-site frontend/API routing, such as a frontend `/api` proxy or
subdomains under one domain. Unrelated hosting domains need a reviewed cookie/CSRF setup;
do not weaken the cookie or origin checks to work around that.

References: [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
and [Node crypto](https://nodejs.org/api/crypto.html).

## Start in VS Code

Open the project folder and use its integrated PowerShell terminal:

```powershell
Set-Location 'D:\D I N U K A\Competitions\LovHack\Season 03\localbiz-ai'
npm install
```

On first setup only, copy `client/.env.example` to `client/.env` and `server/.env.example`
to `server/.env`. Keep existing environment files if they already exist.
Configure Atlas below, then run:

```powershell
npm run dev
```

- Frontend: http://localhost:5173
- Dashboard: http://localhost:5173/dashboard
- API health: http://localhost:5000/api/health

Press **Ctrl+C** to stop both servers. Restart after changing `.env` files.
Use Node.js **24 or newer**. If PowerShell blocks npm.ps1, use `npm.cmd`.
The API starts without MongoDB, but profile/product requests return 503 until connected.

For separate terminals, use `npm run dev:server` and `npm run dev:client` at the root.
Avoid starting a second copy when these ports are already occupied.

## MongoDB Atlas setup

1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
2. Create a project named **LocalBiz AI**, then create a **Free** cluster. Pick an available
   region close to you. Sample data is unnecessary.
3. Under **Database Access**, create a database user with password authentication.
   Give it the `readWrite` role for the `localbiz_ai` database. This user is separate from
   your Atlas website login. Save its password privately.
4. Under **Network Access**, choose **Add IP Address → Add Current IP Address**.
   If your internet connection changes, update this entry.
5. On the cluster, choose **Connect → Drivers**, select **Node.js**, and copy the URI.
6. Open `server/.env` in VS Code. Replace the username/password placeholders and put
   `localbiz_ai` between the hostname slash and `?`:

```dotenv
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/localbiz_ai?retryWrites=true&w=majority
```

The example contains placeholders, not real credentials. Percent-encode special characters in
the password (for example `@` becomes `%40`). Keep this value only in `server/.env`;
never put it in a `VITE_` variable or commit it. `.env` files are ignored by Git.

7. Restart `npm run dev`. The backend should print **MongoDB connected.**
8. Check `/api/health`: `database` should be `connected`.
9. Save your profile, add a product, and refresh the browser. In Atlas's data browser,
   the `localbiz_ai` database will contain `businessprofiles` and `products` once used.

References: [Atlas connection guide](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/)
and [database/network access](https://www.mongodb.com/docs/atlas/security/quick-start/).

## Generate a campaign (Phase 4)

1. In [Google AI Studio](https://aistudio.google.com/api-keys), create a Gemini key.
   Keep it on a Free Tier project for MVP testing; account quotas still apply.
2. Add `GEMINI_API_KEY=your_key_here` to `server/.env`. The default model is
   `gemini-3.1-flash-lite`; optionally set `GEMINI_MODEL` to another compatible Gemini 3 Flash model.
   Keys stay on the backend and never belong in `VITE_` variables or Git.
3. Restart the backend from its VS Code terminal. Run only one copy of `npm run dev`.
4. Log in, save your business profile, and add at least one product to your account.
5. Open **New campaign**. Choose the product, goal, audience, platform, tone and language.
6. Click **Generate campaign**, then review/edit the three post ideas and click
   **Save campaign draft**. Generation alone does not save or publish anything.
7. Reopen drafts under **Campaigns**, edit/save changes, copy post text, or delete with confirmation.

Only your business name/category/location/story, the selected product's name/category/
description/price/currency, and the brief are sent to Google. Product images, account emails,
passwords, session tokens, and other accounts' data are not sent. Google may use Free Tier
inputs/outputs to improve its products; use public business information for the demo.
See [Gemini pricing/data use](https://ai.google.dev/gemini-api/docs/pricing).

The backend uses Node's built-in fetch and Gemini's JSON response schema, then validates all
output again. It never displays raw provider errors or fabricates fallback AI results.
Generation times out after 45 seconds; the browser allows 60 seconds for that request.
Each account can make five generation attempts per ten minutes, with one call at a time.
These in-memory safeguards reset on restart; shared limits are needed for multiple API instances.
Free Tier provider quotas are separate and can change; check AI Studio for your actual limits.

Captions, hashtags, calls to action, and photo suggestions are draft text. Review claims and
language quality before sharing. No images are generated and no posts are scheduled/published.
Saved drafts keep product/business names even after their source records change or are removed.
Editing a saved draft changes its title/posts; its original product and brief stay unchanged.

References: [Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key),
[generation API](https://ai.google.dev/api/generate-content), and
[structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).

## Routes

| URL                        | Behavior                                                     |
| -------------------------- | ------------------------------------------------------------ |
| `/`                        | Landing page                                                 |
| `/login`, `/register`      | Working login and registration                               |
| `/dashboard`               | Overview with real product count; future metrics show a dash |
| `/dashboard/products`      | Saved catalog, add/edit dialogs, delete confirmation         |
| `/dashboard/profile`       | Saved business details                                       |
| `/dashboard/campaigns/new` | AI generation and editable draft builder                     |
| `/dashboard/campaigns`     | Private saved drafts, open/edit and delete                   |
| `/dashboard/campaigns/:id` | View, edit, save, and copy a campaign draft                  |
| `/dashboard/calendar`      | Browsable calendar without saved events                      |
| Unmatched routes           | Page-not-found screen                                        |

## API

All paths below start with `/api`. Auth and data endpoints require a connected database;
profile/product endpoints also require a valid session cookie.

| Method | Path                | Response                                        |
| ------ | ------------------- | ----------------------------------------------- |
| GET    | `/health`           | API liveness, timestamp, uptime, database state |
| GET    | `/business-profile` | `{ profile }`, initially null                   |
| PUT    | `/business-profile` | Create/update your profile; `{ profile }`       |
| GET    | `/products`         | `{ products, total }`, newest first             |
| GET    | `/products/:id`     | `{ product }`                                   |
| POST   | `/products`         | Created product, HTTP 201                       |
| PUT    | `/products/:id`     | Updated product                                 |
| DELETE | `/products/:id`     | HTTP 204, no response body                      |

Auth endpoints: `POST /auth/register` (name/email/password, HTTP 201), `POST /auth/login`
(email/password), `GET /auth/me`, and `POST /auth/logout` (HTTP 204). Registration/login/me
return `{ user: { id, name, email } }`. All POST requests need the request marker above.
Invalid credentials return 401, duplicate registration 409, rate limits 429, and missing
or expired sessions 401 with `code: "UNAUTHENTICATED"`.

Campaign endpoints (authenticated, database required):

| Method | Path                  | Behavior                                              |
| ------ | --------------------- | ----------------------------------------------------- |
| GET    | `/campaigns/config`   | `{ configured }` without exposing the key             |
| POST   | `/campaigns/generate` | Returns `{ draft, brief }`; never saves automatically |
| GET    | `/campaigns`          | `{ campaigns, total }`, newest first                  |
| POST   | `/campaigns`          | Saves a reviewed draft, HTTP 201, `{ campaign }`      |
| GET    | `/campaigns/:id`      | `{ campaign }`, private to its owner                  |
| PUT    | `/campaigns/:id`      | Replaces title/posts; `{ campaign }`                  |
| DELETE | `/campaigns/:id`      | HTTP 204                                              |

Generate/save brief: `productId` (owned saved product), `goal` (1–600 characters),
`audience` (1–300), `platform` (facebook/instagram), `tone` (friendly/professional/playful),
`language` (English/Sinhala/Tamil). Save also needs `title` (1–100) and exactly three `posts`.
Each post has `angle` (1–80), `caption` (1–2200), `callToAction` (1–200), `imageIdea` (1–600),
and 1–12 `hashtags` (each starts with #, at most 60 characters, no spaces).
All ownership, record IDs, snapshots, timestamps, and the fixed `draft` status are server-controlled.
Foreign campaign/product IDs return 404; a missing profile returns 409 before generation/save.
Generation errors use readable messages and codes: `AI_NOT_CONFIGURED`/`AI_CONFIGURATION_ERROR`
(503), `AI_QUOTA_EXCEEDED`/`GENERATION_RATE_LIMITED` (429), `GENERATION_IN_PROGRESS` (409),
`AI_BLOCKED` (422), `AI_INVALID_RESPONSE` (502), `AI_UNAVAILABLE` (503), `AI_TIMEOUT` (504).

Profile fields: `name` (required, 100 characters), `category` (required, 60),
`location` (optional, 160), `story` (optional, 2000).

Product fields: `name` (required, 100), `category` (optional, 60),
`description` (optional, 2000), `price` (required, 0–9,999,999.99, at most two decimals),
`currency` (LKR/USD/EUR/GBP/INR), `imageUrl` (optional HTTP/HTTPS URL, 2048).
The API stores integer minor units and returns `price` as a two-decimal string.
IDs and timestamps are server-controlled. PUT replaces editable fields, so send the whole form.

Validation errors return 400 with `{ error, fields }`. Invalid IDs return 400;
missing products return 404. Database unavailability returns 503 with
`code: "DATABASE_UNAVAILABLE"`. The health endpoint still returns 200 because it reports
API liveness separately from database readiness. Credentials never appear in responses.
The small MVP catalog loads all products; pagination is a future improvement.

## Structure

```text
client/src/
  components/     Shared UI, forms, dialogs, loading states
  hooks/          Resource loading and retry
  lib/api.js      API requests and readable errors
  layouts/        Dashboard navigation and shared profile/catalog state
  pages/          Routed screens
server/src/
  config/         Environment and MongoDB connection
  middleware/     Database availability guard
  models/         User, Session, BusinessProfile, Product, Campaign schemas
  lib/            Password/session helpers and Gemini integration
  routes/         Health, auth, business profile, products, campaigns
  validation/     Explicit form-field validation
  app.js          Express app
  index.js        Startup and graceful shutdown
server/test/      HTTP and disposable MongoDB integration tests
```

## Environment

| File        | Variable         | Default/purpose                               |
| ----------- | ---------------- | --------------------------------------------- |
| client/.env | `VITE_API_URL`   | `http://localhost:5000/api`                   |
| server/.env | `NODE_ENV`       | `development`                                 |
| server/.env | `HOST`           | `localhost`                                   |
| server/.env | `PORT`           | `5000`                                        |
| server/.env | `CLIENT_URL`     | `http://localhost:5173,http://localhost:4173` |
| server/.env | `MONGODB_URI`    | Blank template; required for saved data       |
| server/.env | `GEMINI_API_KEY` | Blank template; required only for generation  |
| server/.env | `GEMINI_MODEL`   | `gemini-3.1-flash-lite`                       |

For your own local MongoDB instance, use `mongodb://127.0.0.1:27017/localbiz_ai`.
Never put secrets in the frontend. Restart both apps after environment changes.

## Checks

```sh
npm run lint
npm test
npm run build
npm run format:check
```

The integration tests download a MongoDB binary on first run and start a disposable local
database. They verify persistence, CRUD, validation, authentication, account isolation,
expiry, logout, origin checks, rate limiting, draft persistence, campaign ownership,
generation prerequisites, output validation, quotas/timeouts, and database-unavailable responses.
Gemini calls are stubbed in automated tests, so they consume no real API quota.
They do not use Atlas or the credentials in `server/.env`. Internet access is needed for
the first binary download. Keep the disposable test helper as a development dependency.

Other commands: `npm run format`, `npm run preview` (frontend build on port 4173),
and `npm start` (backend without watch mode). Run the backend separately for frontend preview.
Express does not serve `client/dist`; deployment is a later task.

## Troubleshooting

- **Port already in use:** stop the old server in its terminal with Ctrl+C, then start one copy.
  Vite uses strictPort. If changing the backend port, update `VITE_API_URL` too.
- **Database unavailable:** check the Atlas cluster, database user's password/role, current IP
  entry, and URI. Restart the backend after fixing `server/.env`, then retry on the page.
- **Server unavailable:** check the backend, frontend API URL, and configured browser origins.
- **Save fails:** the form keeps your entries. Correct highlighted fields or retry after
  restoring the connection. If a request times out, refresh to check whether it saved before
  adding the same product again.
- **Image fails to load:** the card shows a product icon. Use a publicly accessible image URL.
- **Login redirect or 401:** log in again; your session may have expired or been logged out.
- **Too many attempts:** wait 15 minutes. Restarting the local server also clears this MVP limiter.
- **Old Phase 2 data seems missing:** it is preserved in Atlas without an account owner;
  authorize migration to your real account if needed.
- **Generate button disabled:** save a business profile, add an owned product, and configure
  `GEMINI_API_KEY` in the backend; restart the backend after environment changes.
- **Gemini quota error:** wait and check the project's model quota in AI Studio. Retrying
  repeatedly does not restore quota. Provider limits are separate from the app's request limit.
- **Gemini configuration error:** verify the key's Gemini API access and configured model.
- **Draft not in Campaigns:** generation is a preview; click Save campaign draft first.

Keep the next phase focused and authorize it before adding AI or integrations.
