# Meta Lead Ads Live Feed PoC

A Meta Lead Ads Testing Tool submission is retrieved by a Node/Express webhook
and pushed to an already-open Expo React Native leads screen over Socket.io.

## Requirements

- Node.js 22 or later
- A Meta Developer app and test Page configured for the `leadgen` webhook
- ngrok with the reserved domain configured in `backend/.env`
- Expo Go or an Android/iOS simulator

## Backend

### Test Without a Meta Account

You can test the live mobile feed without registering a Meta app or Page. In
`backend/.env`, set:

```dotenv
META_GRAPH_API_MOCK=true
```

Leave the Page access token empty. Start the backend with `npm run dev`, start
the Expo app with `EXPO_PUBLIC_SOCKET_URL` set to the computer's reachable
address, and leave the leads screen open. From another terminal in `backend/`,
run this command each time you want to send a sample:

```powershell
npm run demo:lead
```

The sender POSTs a Meta-shaped fixture to the existing webhook route. The
backend acknowledges it, uses a local `Demo Lead` in place of Graph API, and
broadcasts it over the real Socket.io connection to the app. Keep this mode
local: do not run a public tunnel or expose the mock-enabled server. This
validates the app and realtime plumbing, but it does **not** satisfy the
requirement to submit through Meta's Lead Ads Testing Tool or prove Meta
credentials/webhook configuration.

### Configure Meta

1. In [Meta for Developers](https://developers.facebook.com/apps/), create a
   Business app and add the Webhooks product. Keep the app in Development mode
   for this test; add your Facebook account as an app admin/developer/tester
   and make sure it has sufficient access to the test Page.
2. Create or choose a test Facebook Page and a Lead Ads form for that Page.
   If the business uses Leads Access Manager, grant the app/user access to the
   Page's leads there too.
3. In the app's Webhooks product, choose the **Page** object. Start the local
   backend and ngrok as described below, then enter
   `https://dreamily-speech-unaudited.ngrok-free.dev/webhook/leadgen` as the
   callback URL and the exact
   `META_VERIFY_TOKEN` value from `.env` as the verify token. Complete the
   verification and subscribe to the `leadgen` field. The Page must grant the
   app `pages_manage_metadata` for Page webhook subscriptions.
4. In Graph API Explorer, select your app and grant the user `leads_retrieval`,
   `pages_show_list`, `pages_read_engagement`, and `pages_manage_ads`. Exchange
   the short-lived User token for a long-lived User token using Meta's
   `fb_exchange_token` flow. That User token generally lasts about 60 days and
   can be used directly by this backend for lead retrieval; store it as
   `META_USER_ACCESS_TOKEN`. Keep App Secret/token operations server-side and
   never put them in the mobile app or a repository.
5. Optionally, use the long-lived User token with
   `GET /me/accounts?fields=id,name,access_token` to obtain a Page token and
   store it as `META_PAGE_ACCESS_TOKEN`. Page tokens derived from a long-lived
   User token generally have no expiration date, though Meta can invalidate
   them if access or permissions change. The backend prefers
   `META_USER_ACCESS_TOKEN` when both are configured and falls back to the Page
   token. Use an account with lead access to the test Page.

Meta's dashboard wording changes periodically. See the official
[Page Webhooks reference](https://developers.facebook.com/docs/graph-api/webhooks/reference/page/#leadgen)
and [Lead Ads lead retrieval guide](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving)
if a menu has moved.

### Start Backend

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Set these values in `backend/.env`:

| Variable | Purpose |
|---|---|
| `PORT` | Backend HTTP port; defaults to `4000` |
| `META_VERIFY_TOKEN` | Shared string for Meta's webhook verification handshake |
| `META_USER_ACCESS_TOKEN` | Long-lived User token with lead retrieval access (about 60 days) |
| `META_PAGE_ACCESS_TOKEN` | Page token used to create, list, and delete Meta test leads; keep it only on the backend |
| `META_LEADGEN_FORM_ID` | ID of the Page lead form used by the Android test-lead controls |
| `META_GRAPH_API_VERSION` | Graph API version; set to `v26.0` to match the webhook subscription |
| `META_APP_ID`, `META_APP_SECRET` | Needed only for secure server-side token exchange; not used by the running backend |
| `NGROK_DOMAIN` | Reserved ngrok domain used for the webhook callback |
| `NGROK_AUTH_TOKEN` | Secret ngrok credential; keep it only in the ignored local `.env` |

Start the backend:

```powershell
npm run dev
```

In a second PowerShell window, start the reserved ngrok tunnel from `backend/`:

```powershell
cd backend
npm run tunnel
```

The reserved public URL is stable across tunnel restarts. Keep ngrok running;
the Meta callback is
`https://dreamily-speech-unaudited.ngrok-free.dev/webhook/leadgen`. The
dashboard should show it verified and the Page's `leadgen` field subscribed.
Keep `NGROK_AUTH_TOKEN` private and only in the ignored local `.env` or ngrok's
local configuration; never commit it.

## Mobile App

Copy `mobile/.env.example` to `mobile/.env` and set
`EXPO_PUBLIC_SOCKET_URL` to the backend address reachable by the device. For a
physical phone on the same Wi-Fi, use the computer's LAN IP; Android Emulator
commonly uses `http://10.0.2.2:4000`. If testing from another network, use the
ngrok base URL (`https://dreamily-speech-unaudited.ngrok-free.dev`, without
the webhook path) for Socket.io. Allow inbound Node traffic through Windows Firewall on ports
4000 and 8081 if prompted. Restart Expo after changing `.env` because Expo
embeds public environment values when bundling.

```powershell
cd mobile
npm ci
npm start
```

Scan Expo's QR code with Expo Go, or press `a` to open a configured Android
emulator. Leave the app on the leads screen. Confirm the connection indicator
shows **LIVE**. The screen can create, list, and delete a Meta test lead without
leaving the Android app. Configure `META_PAGE_ACCESS_TOKEN` and
`META_LEADGEN_FORM_ID` in `backend/.env` first; the token remains on the
backend.

Meta allows only one test lead per form. Delete the existing test lead from the
app before creating another. These are fake testing leads, not real ad
submissions. Real leads can only be generated when a person submits a Lead Ad
form; Meta does not document an API for injecting real production leads.

The app uses Meta's documented Graph API operations:

- `POST /{FORM_ID}/test_leads` to create a test lead
- `GET /{FORM_ID}/test_leads` to load current test leads
- `DELETE /{LEAD_ID}` to remove the current test lead

Meta requires a Page access token and an Advertiser-or-higher Page role for the
create operation. Use a test Page and never put the Page token in the mobile
environment. See Meta's official
[Testing and Troubleshooting guide](https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/testing-troubleshooting)
and [Lead Ads retrieval guide](https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving).

The app-facing test-lead routes are intended only for this local PoC. Do not
expose them on an untrusted/public production server without adding proper
authentication and request protections.

Alternatively, in Meta's **Lead Ads Testing Tool**, choose the same app, Page,
and form, then create/submit a test lead. Do not use a real ad. The lead should
appear at the top of the already-open mobile feed without touching the device.
Watch the backend terminal if it does not:

- A Graph API permission/token error means the Page token or lead access is
  wrong; regenerate it with the required access and update `.env`.
- No backend POST means the Page's `leadgen` subscription, callback URL, or
   ngrok tunnel is wrong or no longer running.
- A successful backend fetch with no app update usually means the phone cannot
  reach the configured `EXPO_PUBLIC_SOCKET_URL` or Windows Firewall blocks
  port 4000.

Do not paste App Secrets or access tokens into chat, Loom recordings,
screenshots, or a published repository. This PoC does not verify
`X-Hub-Signature-256`; use it
only with a test app/Page and do not expose it as a production endpoint.

## Tests

```powershell
cd backend
npm test
npm run build

cd ..\mobile
npm test
npm run typecheck
```

The backend integration test posts through a real Express/Socket.io server
and uses the explicit local Graph fixture instead of network credentials. The
mobile integration test connects the real hook to a Socket.io server and
asserts the incoming lead renders in the feed. End-to-end verification with
Meta credentials and ngrok is still manual.

## Deliverables

- Loom #1 (live demo, maximum five minutes): not recorded yet.
- Loom #2 (architecture/code walkthrough): not recorded yet.
- Git repository URL: not published yet.

See [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for scope and flow.