# LocalBiz AI

**LovHack Season 3 — Phase 3**, by **NextStack Studio**.
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
- Landing, working login/register screens, campaigns preview, and browsable calendar.

AI, campaign generation, scheduled posts, file uploads, and social integrations are later phases.
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

## Routes

| URL                        | Behavior                                                     |
| -------------------------- | ------------------------------------------------------------ |
| `/`                        | Landing page                                                 |
| `/login`, `/register`      | Working login and registration                               |
| `/dashboard`               | Overview with real product count; future metrics show a dash |
| `/dashboard/products`      | Saved catalog, add/edit dialogs, delete confirmation         |
| `/dashboard/profile`       | Saved business details                                       |
| `/dashboard/campaigns/new` | Disabled campaign builder preview                            |
| `/dashboard/campaigns`     | Campaign collection preview                                  |
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
  models/         User, Session, BusinessProfile, and Product schemas
  lib/            Password hashing and session helpers
  routes/         Health, auth, business profile, products
  validation/     Explicit form-field validation
  app.js          Express app
  index.js        Startup and graceful shutdown
server/test/      HTTP and disposable MongoDB integration tests
```

## Environment

| File        | Variable       | Default/purpose                               |
| ----------- | -------------- | --------------------------------------------- |
| client/.env | `VITE_API_URL` | `http://localhost:5000/api`                   |
| server/.env | `NODE_ENV`     | `development`                                 |
| server/.env | `HOST`         | `localhost`                                   |
| server/.env | `PORT`         | `5000`                                        |
| server/.env | `CLIENT_URL`   | `http://localhost:5173,http://localhost:4173` |
| server/.env | `MONGODB_URI`  | Blank template; required for saved data       |

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
expiry, logout, origin checks, rate limiting, and database-unavailable responses.
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
- **Disabled campaign control:** that feature belongs to a later phase.

Keep the next phase focused and authorize it before adding AI or integrations.
