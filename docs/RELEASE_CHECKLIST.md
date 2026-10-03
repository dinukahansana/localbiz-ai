# LocalBiz AI release checks

Status: **Live deployment and core walkthrough verified; final demo and submission checks are pending.**
Record actual public URLs and checks after the services are created. Do not put credentials here.

| Release item                                | Actual result                                                          |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| Render Git commit deployed                  | 31d9ee25dccbe2f4603a88b0e22475423fbcbc4b (from deployment logs)        |
| Vercel production URL                       | https://localbiz-ai-jet.vercel.app                                     |
| Render API URL                              | https://localbiz-ai.onrender.com                                       |
| Live verification date                      | October 3, 2026 (frontend, backend, core walkthrough)                  |
| Local lint, tests, production build, format | Passed: 65 tests, lint, production build, formatting (October 2, 2026) |

## Live backend verification

Read-only HTTPS checks against the Render service passed on October 3, 2026:

- `/api/health`: HTTP 200, `status: "ok"`, `database: "connected"`.
- `/api/ready`: HTTP 200, `status: "ready"`, `database: "connected"`.
- Anonymous `/api/products`: HTTP 401; account data requires login.
- All three JSON responses include `Cache-Control: no-store`.

These initial read-only checks did not create accounts, write to Atlas, or call
Gemini. The later live walkthrough below used explicitly authorized synthetic data.

## Live frontend and account verification

The public Vercel site and same-origin API proxy passed on October 3, 2026:

- Homepage, login, registration, and direct protected-route refreshes load correctly.
- Vercel `/api/health` and `/api/ready` return HTTP 200 with Atlas connected;
  anonymous `/api/products` returns 401. All three responses are JSON and uncached.
- An empty login request from the actual Vercel origin returns the expected 400
  validation response. An unrelated origin returns 403. The deployed origin check
  already accepts `https://localbiz-ai-jet.vercel.app`.
- Registration, session refresh, logout, a wrong-password error, and successful
  login retry passed through the public website.
- Hosted cookies include Secure, HttpOnly, SameSite=Lax, and no Domain attribute.
- A second synthetic account has no profile, products, campaigns, or posting plans.
  Direct access to the first account's campaign, poster list, and PNG returns 404.
  Anonymous access to the saved PNG returns 401; responses remain uncached.

## Saved live demo data

The user authorized two dedicated synthetic demo accounts and sample Atlas data.
The populated account contains Neighborhood Bakery (Demo), one Chocolate Cookie
Box (Demo) product at LKR 1,250.00, one saved campaign with three reviewed posts,
one saved 1080 x 1080 PNG poster, and two posting plans. Post 1's manual published
state is a test simulation; post 2 is planned for October 5, 2026 at 09:00 Sri Lanka
time. No social post was sent. The other account remains empty for privacy checks.

One real Gemini generation succeeded. Campaign edits, profile/product edits,
poster persistence/download, and calendar changes survived page refreshes.
The poster uses an original synthetic cookie illustration as a file-upload fixture,
not a photograph of a real product. Replace it with an owned product photo for the
final demo. Existing user/legacy records were not changed or deleted.

At 390 x 844 viewport size, registration, mobile navigation, the poster builder,
date modal, and calendar controls fit without horizontal page overflow. A real
phone check is still pending. Demo passwords are kept in a private local file
outside the repository; do not include them in submissions or screenshots.

## Live walkthrough

- [x] Open Vercel `/api/ready`: ready and database connected; anonymous data routes return 401.
- [x] Register a dedicated demo account. Refresh, log out, and log back in successfully.
- [x] Save the business profile, add/edit a product, and refresh to confirm persistence.
- [x] Generate one campaign with public business facts. Review/save it, edit a caption, and reopen it.
- [x] Upload a synthetic image fixture, preview/save a poster, refresh, and download the PNG through Vercel.
- [ ] Replace the demo poster fixture with an owned product photograph for the final presentation.
- [x] Plan a post in Sri Lanka time; refresh, reschedule, cancel, restore, and manually mark it published.
- [x] The planned-post overview count agrees with active plans. No automatic social post is triggered.
- [x] Open `/dashboard/calendar` and a campaign detail URL directly; refreshing stays on the correct route.
- [ ] Check mobile navigation, the poster builder, the date modal, and calendar controls on a real phone.
- [x] Check a second account cannot see the first account's saved profile, products, drafts, posters, or plans.
- [x] A wrong-password login retry and a past posting date show readable validation errors.
- [ ] Exhausted/disabled Gemini configuration is handled on the hosted service if encountered. These cases passed locally with stubs; do not exhaust live quota or disable the shared service just to test them.
- [x] Log out; protected pages redirect to login and previous private downloads require authentication.
- [ ] Confirm GitHub has no real secret alert; actual `.env` files and hosting secrets are not committed.

Use recoverable cancellation for the walkthrough. Do not delete useful live records for testing.

## Submission

- [ ] Live URL and GitHub repository URL are correct and accessible to judges.
- [ ] README describes implemented features and known limits accurately.
- [ ] Screenshots contain public demo data and no passwords, keys, or hosting environment settings.
- [ ] Demo recording follows [DEMO.md](DEMO.md), including manual sharing/published status.
- [ ] Check the official LovHack brief for exact submission fields, timing, video length, and access rules.
- [ ] Open the live service shortly before the presentation to allow the free API to wake.
- [ ] Keep an already saved draft and poster available in case Gemini quota or internet access changes.

## Local browser verification

The built frontend was tested behind a local same-origin API proxy on October 2, 2026,
using disposable MongoDB and a stubbed Gemini response. The real Atlas database and key
were not used. Login/refresh/logout, campaign generation/save, poster save/reopen/PNG
download, calendar date persistence, mobile layout, protected redirects, and a second
account's isolation passed. A simulated HTML hosting startup response showed a readable
error, retained the selected date, and saved successfully after retry.

Production HTTP contracts verified Secure/HttpOnly session cookies, origin rejection,
nearest-proxy trust, CDN no-store responses, and database readiness. Real hosted TLS,
direct Render readiness, Atlas connectivity, Vercel routing, hosted browser cookies, poster uploads/downloads, and the core public walkthrough are now verified. A real phone, owned product photo, demo recording, submission requirements, and private GitHub alert review remain pending.
