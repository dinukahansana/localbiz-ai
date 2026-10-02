# LocalBiz AI release checks

Status: **Prepared locally; live deployment is not yet verified.**
Record actual public URLs and checks after the services are created. Do not put credentials here.

| Release item                                | Actual result                                                          |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| Git commit deployed                         | Pending                                                                |
| Vercel production URL                       | Pending                                                                |
| Render API URL                              | Pending                                                                |
| Live verification date                      | Pending                                                                |
| Local lint, tests, production build, format | Passed: 65 tests, lint, production build, formatting (October 2, 2026) |

## Live walkthrough

- [ ] Open Vercel `/api/ready`: ready and database connected; anonymous data routes return 401.
- [ ] Register a dedicated demo account. Refresh, log out, and log back in successfully.
- [ ] Save the business profile, add/edit a product, and refresh to confirm persistence.
- [ ] Generate one campaign with public business facts. Review/save it, edit a caption, and reopen it.
- [ ] Upload an owned product photo, preview/save a poster, refresh, and download the PNG through Vercel.
- [ ] Plan a post in Sri Lanka time; refresh, reschedule, cancel, restore, and manually mark it published.
- [ ] The planned-post overview count agrees with active plans. No automatic social post is triggered.
- [ ] Open `/dashboard/calendar` and a campaign detail URL directly; refreshing stays on the correct route.
- [ ] Check mobile navigation, the poster builder, the date modal, and calendar controls on a real phone.
- [ ] Check a second account cannot see the first account's saved profile, products, drafts, posters, or plans.
- [ ] A login retry, invalid date, and exhausted/disabled Gemini configuration show readable errors.
- [ ] Log out; protected pages redirect to login and previous private downloads require authentication.
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
provider rewrites, Atlas outbound access, and public demo URLs remain live-release checks.
