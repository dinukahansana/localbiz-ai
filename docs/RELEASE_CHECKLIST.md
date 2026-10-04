# LocalBiz AI release checks

Status: **Phase 7 live core walkthrough verified. Phase 8 AI posters pass local checks with a simulated provider; real deAPI quality checks and deployment are pending. Final demo and submission checks are pending.**
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

## Phase 8 local AI-poster verification — October 4, 2026

- All 80 automated tests pass using disposable MongoDB instances and stubbed AI providers.
- Lint, development build, production build, and formatting checks pass.
- deAPI request contracts cover reference-photo multipart editing and text-only generation,
  exact price checks, safe failures, and bounded downloads from trusted result hosts.
- Private preview access, deliberate saving, PNG normalization, duplicate submission keys,
  recovery after a download failure, prompt/style persistence, and quota counters pass.
- Shared daily and account hourly counters survive restarts and campaign deletion. Expired,
  foreign, and wrong-post preview IDs cannot overwrite a saved poster.
- Desktop and 390 x 844 browser checks cover file upload, creative prompt/style editing,
  asynchronous progress, manual saving, PNG download, refresh, and the free-template switch.
  There is no horizontal page overflow. Temporary servers/database were isolated from Atlas.
- Browser output used a synthetic cookie illustration returned by a simulated provider.
  No deAPI key, paid image generation, real product-quality evaluation, commit, push, or
  deployment was performed during those initial checks. Production remains the earlier Phase 7 release.

Before claiming AI poster generation in the live demo:

1. Add a private DEAPI_API_KEY to the local backend and verify account credits/model access.
2. Generate one real promotion using an owned product photo. Check the complete composition,
   product fidelity, typography, PNG download, and actual deAPI credit charge.
3. Commit and deploy the reviewed frontend/backend changes with the key only in Render.
4. Repeat the save/reopen/download flow through the Vercel same-origin API proxy. Record
   the deployed commit and real provider result separately from the simulated local checks.

## Phase 8 price-limit diagnostic — October 4, 2026

A read-only deAPI price request for the configured Qwen reference-image model and
20-step setting returned an exact quote of 0.0322704 credits using a synthetic
prompt. This exceeds the original 0.03-credit starter cap. No product photo,
real campaign details, or paid image-generation request was sent for this check.

The starter cap is now 0.05 credits. Explicit local or hosted DEAPI_MAX_PRICE
settings remain authoritative; existing 0.03 values require a deliberate update
and backend restart/redeployment to allow this quote. Prices may change.
Over-budget errors now show the quoted price and configured cap. An unavailable
exact price has a separate error. Both failures prevent a paid submission.

All 81 automated tests pass, including the explicit 0.03 cap and unavailable-price
cases. Lint, development build, production build, and formatting checks pass.
A real image's quality, actual generation charge, and hosted Phase 8 flow remain
unverified. No commit, push, or deployment was performed during this fix.

## Phase 8 completed-image download diagnostic — October 4, 2026

The user's existing image job was complete at deAPI while its local record remained
processing at 95%. A read-only status check returned an HTTPS result on
`results.deapi.ai`. The backend's exact allowed-host list omitted this host; it now
accepts it while continuing to reject unknown hosts, credentials, custom ports,
HTTP links, and redirects. The provider key is never sent to the image host.

The existing result downloaded through the corrected provider code and normalized
successfully to a 1080 × 1080 PNG (2,762,614 bytes). This diagnostic used no new
generation request and made no database changes. It did not visually review product
fidelity, typography, or composition, and did not verify the billed amount.

All 82 automated tests pass with offline provider stubs and disposable MongoDB.
Tests cover the completed native result host, credential-free downloads, lookalike
host rejection, and recovery of the same private job without a second submission.
Lint, frontend build, and formatting checks pass. Restart the local backend and
choose **Check current job** to recover the preview, then review/save it deliberately.
No commit, push, or deployment was performed during this fix. Hosted Phase 8 checks
and a real visual-quality review remain pending.

## Phase 8 reference-photo guidance and upload checks — October 4, 2026

New creative prompts include a conditional instruction to use an uploaded product
photo as the main subject and preserve its shape, proportions, colors, and visible
details. Reference-image provider requests always start with a stronger preservation
clause, including requests with edited or previously saved prompts. The user's
creative brief controls the scene; generic caption ideas must not substitute another
main subject. Model fidelity and correct spelling are still not guaranteed.

The UI disables submission while decoding/reading a reference and after an invalid
file. It shows **Reference photo ready**, supports deliberate removal, and identifies
whether an existing job used reference editing. After a reference-based job, a new
submission requires reselecting the upload or explicitly choosing an imagined concept.
Original uploads are not stored and clear on refresh; completed jobs still resume and
save without resubmission or another upload. Edited prompt text survives refresh.

Desktop and 390 × 844 browser checks used a synthetic upload, disposable MongoDB,
and a simulated provider. Invalid files blocked generation, valid files enabled it,
reference submissions used the Qwen route, and refresh required reselection or an
explicit concept choice. There was no horizontal overflow. No real image generation
or actual-product visual-quality test was performed for this change.

All 82 automated tests, lint, frontend build, and formatting checks pass. Tests
continue to use offline providers and disposable databases. A separate free quote
with a synthetic prompt returned 0.0627264 credits for Qwen at 40 steps. The production
code still uses 20 steps and the configured cap remains unchanged. Raising the cap
alone cannot change quality, model, steps, or the strict exact-quote requirement.
No commit, push, deployment, private environment change, or premium model switch
was performed. Screenshots of the local reference-ready states are held outside Git.
