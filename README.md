# LocalBiz AI

**LovHack Season 3 — Phase 8**, by **NextStack Studio**.
A responsive React workspace for local businesses, with an Express API and MongoDB persistence.

Deployment preparation: [Vercel + Render setup](docs/DEPLOYMENT.md),
[release checks](docs/RELEASE_CHECKLIST.md), and [demo walkthrough](docs/DEMO.md).
The deployment configuration is prepared; the live release must be verified separately.

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
- Create free branded photo posters for saved campaign posts; preview, save, reopen, and download PNGs.
- Plan posting dates, view the calendar/agenda, reschedule/cancel, and manually mark posts as published.
- Dashboard shows the real planned-post count; landing and working login/register screens.
- Production builds use a same-origin `/api` proxy, with Vercel deep-link routing and a Render service blueprint.
- Production environment validation, bounded proxy trust, readiness health checks, and uncached API responses.

- Create AI promotion posters with deAPI using campaign text, an editable creative prompt and an optional reference photo.

Automatic publishing and social integrations are later phases.
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
# Paste your Atlas Drivers connection string only in the local server/.env file.
MONGODB_URI=
```

The template stays blank so no credential-shaped example is committed. Percent-encode special characters in
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
language quality before sharing. Photo posters use the separate free builder below. Posting
plans are dates to guide your manual sharing; the app never sends a post to a social platform.
Saved drafts keep product/business names even after their source records change or are removed.
Editing a saved draft changes its title/posts; its original product and brief stay unchanged.

References: [Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key),
[generation API](https://ai.google.dev/api/generate-content), and
[structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).

## Create free product-photo posters (Phase 5)

No additional API key, paid billing, or environment variables are needed. This feature uses a
browser canvas template and your real product photo; it does not generate AI artwork.

1. Open a saved draft under **Campaigns**, scroll to **Design your next promotion**, and choose **Free photo template**.
2. Expand a post and upload its product photo (JPG, PNG, or WebP; up to 5 MB and 20 million pixels).
3. Edit the poster headline and call to action, then choose a brand color.
4. Click **Create poster preview**. Review the center crop and wording. Creating a preview never saves it.
5. **Download PNG** exports a 1080 × 1080 image, even before saving.
6. **Save poster** attaches it to that campaign post. Each of the three posts holds one poster;
   **Replace saved poster** replaces that post's existing image. Errors keep the preview available.
7. Refresh or reopen the campaign to view/download its saved posters. Upload the original photo
   again if you want to rebuild it. Text edits never automatically rewrite a saved poster.

The original photo stays in the browser. Only a saved poster is uploaded to the backend, decoded
with Sharp, stripped of metadata, and stored privately in the `campaignposters` MongoDB collection.
Saved images must be valid 1080 × 1080 PNGs no larger than 6 MB. Image downloads require the owner's
session cookie and are not publicly hosted. Campaign lists contain no image bytes; deleting a
campaign also removes its posters. Product deletion does not remove a saved campaign's posters.

Saving allows 30 attempts per account per 15 minutes; this in-memory limit resets on server restart.
The poster endpoints alone accept larger JSON bodies, after checking login. No Google API calls
are made for posters. Storage is deliberately simple for the LovHack MVP; object storage and
account-wide storage quotas can be added before a wider public launch.

## Create AI promotion posters (Phase 8)

This mode asks deAPI to design the full product scene, background, lighting, composition and
typography. It uses the selected saved post's title/caption and your owned product description,
plus an editable creative prompt. It does not use the browser photo template or pretend that a
template is AI artwork. You can still choose **Free photo template** without an API key.

### deAPI setup

1. Create an account at [deAPI](https://app.deapi.ai). Its
   [quickstart](https://docs.deapi.ai/quickstart) currently advertises a $5 welcome bonus for
   Basic accounts without a card. Check your own dashboard balance and model access.
2. Open **Dashboard → Settings → API Keys → Create new secret key**.
3. Add these values to your existing local `server/.env`; keep your MongoDB/Gemini settings:

```dotenv
DEAPI_API_KEY=your_private_key_here
DEAPI_MAX_PRICE=0.05
DEAPI_DAILY_LIMIT=20
```

4. Restart your VS Code backend. From the project root use `npm run dev` if both servers are stopped.
   Never put this key in `client/.env`, a `VITE_` variable, Git, screenshots or chat.
5. For production, add the same three variables in **Render → Environment** and redeploy the
   backend code. Deploy the updated frontend code to Vercel too. Adding the key alone does not
   deploy this feature. Existing Gemini text generation uses its separate key.

### Generate, review and save

1. Open a saved campaign and choose **AI promotion poster** in **Design your next promotion**.
2. Upload a clear JPG/PNG/WebP photo of your actual product (up to 5 MB, 20 million pixels).
   The backend decodes it, strips metadata, and fits the whole photo into a 1024-square reference.
   It sends this reference to deAPI but does not store the original photo in MongoDB.
   Wait for **Reference photo ready** before generating. Each post needs its own upload,
   and refreshing/reopening clears the file selection; select the photo again for a new
   generation. Checking or saving an existing job does not need another upload.
   After a reference-based job, a new submission requires a fresh photo selection or
   an explicit **Generate an imagined concept without the previous photo** choice.
3. Choose **Premium studio**, **Warm lifestyle**, or **Bold promotion**. Refine the prompt to
   describe the setting, props, colors, light and layout. Keep the headline and call to action short.
   New default prompts ask AI to use an uploaded reference as the main subject. The server
   always starts reference-photo requests with product-preservation instructions, even for
   an edited or older prompt. Your creative brief controls the scene; generic caption ideas
   should not replace the reference product. These instructions improve guidance but cannot
   guarantee exact product details or correctly spelled text.
4. Click **Generate AI poster**. deAPI credits are used for each new generation. Progress is
   checked through a private saved job, so reopening the campaign resumes it without buying again.
5. Review product identity, packaging, spelling, claims and composition. AI redraws pixels and
   can change details or render English/Sinhala/Tamil text incorrectly. A reference improves
   guidance; it does not guarantee an exact copy. Without a photo, the product is imagined.
6. Download the 1080-square PNG preview, or **Save AI poster**. Saving uses the actual completed
   server-owned job bytes. It replaces this post's one saved image only after you choose to save.
   Unsaved previews expire after 48 hours; saved posters remain with the campaign.
7. Copy the caption and manually upload it with the PNG to Facebook or Instagram. This feature
   never publishes automatically. Changing caption/prompt fields does not rewrite an existing image.

Photo references use **QwenImageEdit_Plus_NF4** at 20 steps; prompts without a photo use
**Flux_2_Klein_4B_BF16** at 1024 × 1024, four steps. Output is resized to 1080 square without
cropping, not generated at native 1080 resolution. Only an exact native-model quote at or below
`DEAPI_MAX_PRICE` is accepted; the default is 0.05 deAPI credits. Partner models and unavailable
price estimates are not accepted. The server does not request paid prompt enhancement.

If a generation is blocked by the price limit, the error shows the exact quote and your
configured limit. No image is submitted or charged at that point. A read-only Qwen 20-step
quote on October 4, 2026 was 0.0322704 credits, above the original 0.03 starter limit.
The starter limit is now 0.05; prices can change. An existing `DEAPI_MAX_PRICE=0.03` in
your local backend environment or Render still takes priority. If you want to allow a
quote below 0.05, change that setting to `0.05`, then restart/redeploy the backend.
This is a maximum allowed price per image, not a subscription or a charge by itself.
Increasing it does not change the model, inference steps, quality settings, or typography.
The current code uses fixed native models/settings; a different model or higher step count
requires an implementation change as well as a sufficient price cap. Partner models with
estimated pricing are not supported by this exact-quote guard.

Persistent MongoDB counters allow five submissions per account per UTC hour and
`DEAPI_DAILY_LIMIT` submissions across the whole app per UTC day (default 20). These include
failed/ambiguous submissions after reservation, so deleting a campaign or restarting the API
cannot reset the credit guard. Provider balances, quotas and refunds are separate. Each account
can have one active image job; duplicate request keys return that job instead of resubmitting.
An interrupted submission displays **Check current job**. If submission status is unknown,
check the deAPI dashboard before deliberately starting another image; there is no automatic retry.

Original references and prompts may be processed/retained by deAPI under its own terms; use
public product information and images you have permission to share. Accounts, passwords,
session tokens and product image URLs are never sent. The backend only downloads provider job
results over HTTPS from the explicit `results.deapi.ai`, `assets.deapi.ai`, `api.deapi.ai`, or
`media.deapi.ai` host list,
without redirects or API credentials. An unexpected host fails safely and needs investigation.
Both temporary previews and saved PNGs require the owning session; lists expose no image bytes.
Deleting a campaign removes its previews and posters while preserving quota counters.

If a completed job stopped at 95% with **The image host was not recognized**, update and
restart the backend, then choose **Check current job**. Native deAPI results use
`results.deapi.ai`, which is now accepted. The existing job is checked/downloaded again;
this recovery does not submit another generation or use another generation credit.

References: [image editing](https://docs.deapi.ai/api/v2/images/edits),
[job polling](https://docs.deapi.ai/api/v2/utilities/jobs),
[exact price quotes](https://docs.deapi.ai/api/v2/images/edits-price), and
[product fidelity limits](https://deapi.ai/blog/ai-product-photos-via-api-clean-catalog-shots-vs-styled-scenes).

## Plan posting dates (Phase 6)

No additional key or environment variables are needed. Dates use **Sri Lanka time (Asia/Colombo,
UTC+05:30)** in both the calendar and date picker, regardless of your computer's timezone.
The API stores UTC instants in MongoDB's `postschedules` collection.

1. Open a saved campaign and scroll to **Plan your posting dates**, then choose **Plan post 1/2/3**.
   You can also use **Content calendar → Plan a post** and choose a saved campaign/post.
2. Choose a future date/time within the next two years and click **Save posting plan**.
3. Open **Content calendar** to browse months. Click a date to view its posts, or select
   **Show whole month**. Filter planned, manually published, or cancelled entries.
4. **Reschedule** changes a planned date. **Cancel plan** keeps the record; find it with the
   Cancelled filter and use **Plan again** to restore it with a future date.
5. Copy the latest saved post text and open its campaign to download the poster. Share it yourself,
   then click **Mark as published**. This records your confirmation time; it does not verify or
   publish on Facebook/Instagram. Published entries stay on their original planned calendar date.
6. Refresh/reopen to confirm persistence. The overview counts only entries still marked Planned,
   including past-due plans. A past-due plan never publishes automatically.

Each campaign's three posts can have one plan each. Duplicate requests are rejected. Published
plans cannot be cancelled or rescheduled; create another campaign for a new publishing round.
Planning reads the latest saved caption and poster rather than copying them into the plan.
Deleting a campaign also deletes its posters/plans; deleting the original product does not.
All plan access is private to the authenticated account. No notifications or background jobs
are included in this phase.

## Routes

| URL                        | Behavior                                                     |
| -------------------------- | ------------------------------------------------------------ |
| `/`                        | Landing page                                                 |
| `/login`, `/register`      | Working login and registration                               |
| `/dashboard`               | Overview with real product, draft, and planned-post counts   |
| `/dashboard/products`      | Saved catalog, add/edit dialogs, delete confirmation         |
| `/dashboard/profile`       | Saved business details                                       |
| `/dashboard/campaigns/new` | AI generation and editable draft builder                     |
| `/dashboard/campaigns`     | Private saved drafts, open/edit and delete                   |
| `/dashboard/campaigns/:id` | Edit/copy drafts, build photo posters, plan posting dates    |
| `/dashboard/calendar`      | Private posting calendar, agenda, and manual status controls |
| Unmatched routes           | Page-not-found screen                                        |

## API

All paths below start with `/api`. Auth and data endpoints require a connected database;
profile/product endpoints also require a valid session cookie.

| Method | Path                | Response                                          |
| ------ | ------------------- | ------------------------------------------------- |
| GET    | `/health`           | API liveness, timestamp, uptime, database state   |
| GET    | `/ready`            | HTTP 200 when MongoDB is connected; 503 otherwise |
| GET    | `/business-profile` | `{ profile }`, initially null                     |
| PUT    | `/business-profile` | Create/update your profile; `{ profile }`         |
| GET    | `/products`         | `{ products, total }`, newest first               |
| GET    | `/products/:id`     | `{ product }`                                     |
| POST   | `/products`         | Created product, HTTP 201                         |
| PUT    | `/products/:id`     | Updated product                                   |
| DELETE | `/products/:id`     | HTTP 204, no response body                        |

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

Poster endpoints (authenticated, database required):

| Method | Path                                       | Behavior                              |
| ------ | ------------------------------------------ | ------------------------------------- |
| GET    | `/campaign-posters/:campaignId`            | `{ posters }`, metadata only          |
| GET    | `/campaign-posters/:campaignId/:postIndex` | Private `image/png` bytes, no caching |
| PUT    | `/campaign-posters/:campaignId/:postIndex` | Save/replace one poster; `{ poster }` |

`postIndex` is 0, 1, or 2. Save fields: `headline` (1–90 characters), `callToAction` (1–80),
`brandColor` (six-digit hex, e.g. `#245b46`), and `image` (PNG base64 data URL, max 6 MB decoded).
Unknown fields, ownership, IDs, and timestamps are ignored. Foreign/missing campaigns return 404;
invalid IDs/indexes/images return 400. Oversized JSON returns 413; poster saves can return 429.

AI previews (authenticated, database required):

| Method | Path                                                      | Behavior                                                           |
| ------ | --------------------------------------------------------- | ------------------------------------------------------------------ |
| GET    | `/poster-generations/config`                              | Key configured flag and credit limits; never the key               |
| GET    | `/poster-generations/:campaignId/:postIndex`              | Resume latest temporary job metadata                               |
| POST   | `/poster-generations/:campaignId/:postIndex`              | Quote, reserve budget, submit once; returns `{ generation }`       |
| GET    | `/poster-generations/:campaignId/:postIndex/:jobId`       | Check existing provider job and retrieve completed bytes privately |
| GET    | `/poster-generations/:campaignId/:postIndex/:jobId/image` | Completed private PNG preview                                      |

Submission fields: `requestKey` (browser-generated UUID), `headline`, `callToAction`,
`brandColor`, `style` (`studio`, `lifestyle`, `bold`), `prompt` (1–2000 characters), and
optional `image` (JPG/PNG/WebP base64 data URL, max 5 MB decoded). Client-supplied product
facts/owner/provider/model/URLs are ignored. Only the owned campaign/product is read.
To save an AI result, PUT `{ generationId }` to the existing campaign-poster endpoint;
the server selects the completed owned job's bytes/metadata and records `source: deapi`.
Sending a photo PNG or an invented source cannot forge AI provenance. Expired, foreign
or wrong-post job IDs cannot be saved. Configuration/provider errors are readable 503/502/504,
quota errors 429, price/active-job conflicts 409, and invalid prompts/photos 400.

Posting-plan endpoints (authenticated, database required):

| Method | Path                    | Behavior                                       |
| ------ | ----------------------- | ---------------------------------------------- |
| GET    | `/schedules`            | `{ schedules, total, scheduledTotal }`         |
| POST   | `/schedules`            | Create a plan, HTTP 201, `{ schedule }`        |
| PUT    | `/schedules/:id`        | Reschedule or restore a cancelled plan         |
| PATCH  | `/schedules/:id/status` | Set `published` or `cancelled`; `{ schedule }` |

Create fields: `campaignId` (owned saved campaign), `postIndex` (number 0, 1, or 2), and
`scheduledFor` (canonical UTC ISO date, e.g. `2026-10-05T03:30:00.000Z`, which is 09:00 Sri Lanka time).
Reschedule accepts only `scheduledFor`; status updates accept only `status`. The server controls
IDs, owners, campaign references, status on create, and manual `publishedAt` timestamps.
Invalid dates/IDs/indexes/status values return 400; foreign/missing records return 404;
duplicate plans and conflicting status changes return 409. GET returns cancelled entries too;
the frontend's default calendar filter hides them. No poster bytes or account information are included.

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
  models/         Private account, profile, product, campaign, poster, and plan schemas
  lib/            Password/session helpers and Gemini integration
  routes/         Health, auth, profile, products, campaigns, posters, schedules
  validation/     Explicit form-field validation
  app.js          Express app
  index.js        Startup and graceful shutdown
server/test/      HTTP and disposable MongoDB integration tests
```

## Environment

| File        | Variable           | Default/purpose                               |
| ----------- | ------------------ | --------------------------------------------- |
| client/.env | `VITE_API_URL`     | `http://localhost:5000/api`                   |
| server/.env | `NODE_ENV`         | `development`                                 |
| server/.env | `HOST`             | `localhost`                                   |
| server/.env | `TRUST_PROXY_HOPS` | `0` locally; `1` for Render's nearest proxy   |
| server/.env | `PORT`             | `5000`                                        |
| server/.env | `CLIENT_URL`       | `http://localhost:5173,http://localhost:4173` |
| server/.env | `MONGODB_URI`      | Blank template; required for saved data       |
| server/.env | `GEMINI_API_KEY`   | Blank template; required only for generation  |
| server/.env | `GEMINI_MODEL`     | `gemini-3.1-flash-lite`                       |

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
generation prerequisites, output validation, quotas/timeouts, poster privacy/validation, posting-plan
ownership, date/UTC conversion, uniqueness, status transitions, cleanup, and database-unavailable responses.
Gemini calls are stubbed in automated tests, so they consume no real API quota.
They do not use Atlas or the credentials in `server/.env`. Internet access is needed for
the first binary download. Keep the disposable test helper as a development dependency.

Other commands: `npm run format`, `npm run preview` (frontend build on port 4173),
and `npm start` (backend without watch mode). Run the backend separately for frontend preview.
Express serves the API; static frontend hosting uses Vercel.
For Vercel deployment, use `npm run build:production` and the root `vercel.mjs` configuration.
The Render API remains separate from static frontend hosting. See [DEPLOYMENT.md](docs/DEPLOYMENT.md).

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
- **Poster preview button disabled:** upload a supported product photo first.
- **Poster shows old wording:** edit its headline/call to action, create a fresh preview, then replace it.
- **Poster save fails:** keep the preview, restore the connection, and retry; download still works locally.
- **Posting date rejected:** use a future Sri Lanka time within two years. Refresh after a timeout
  to check whether the plan was saved before trying again.
- **Cancelled plan missing:** choose the Cancelled filter; use Plan again to restore it.
- **Date passed but no post appeared online:** plans guide manual sharing. Share the post yourself,
  then use Mark as published to record it.

Keep the next phase focused and authorize it before adding automatic publishing or integrations.
