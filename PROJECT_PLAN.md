# Meta Lead Ads → React Native Live Feed PoC

## 1. Goal

Build a PoC where submitting a test lead via Meta's **Lead Ads Testing Tool**
causes that lead to appear **live**, with zero manual action, in an
already-open React Native (Expo) app screen.

Architecture:

```
Meta Lead Ads Testing Tool
        │  (simulated form submission)
        ▼
Meta Webhook → POST /webhook/leadgen  (Node/Express backend)
        │
        ├─► Fetch full lead fields via Graph API GET /{leadgen_id}
        │
        ▼
Backend emits lead over Socket.io  ──────────►  React Native app
                                                 (leads list screen,
                                                  already open, live-updates)
```

Why Socket.io over push notifications: push has OS-level delay and
permission prompts that are bad for a live demo recording. A socket
emits in well under a second and is trivial to show working on camera.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Mobile app | React Native + **Expo** (managed workflow) | No native build setup needed for a PoC; fast iteration |
| Backend | Node.js + Express | Simplest way to receive Meta webhooks |
| Real-time transport | Socket.io | Reliable, demo-friendly, minimal latency |
| Lead source | Meta Graph API (v26.0) + Lead Ads Testing Tool | No real ad spend needed |
| Testing | Jest + Supertest (backend), Jest + React Native Testing Library (app) | TDD on both sides |
| Tunnel (for local webhook) | ngrok reserved domain | Meta needs a public HTTPS URL to call your local server |

---

## 3. Repo Structure

```
meta-lead-ads-poc/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── webhook.ts
│   │   ├── services/
│   │   │   ├── graphApi.ts        # fetch full lead by leadgen_id
│   │   │   └── socketEmitter.ts   # emits 'new-lead' event
│   │   ├── socket.ts              # socket.io server setup
│   │   ├── app.ts                 # express app (exported, no listen())
│   │   └── server.ts              # imports app, calls listen()
│   ├── test/
│   │   ├── webhook.test.ts
│   │   ├── graphApi.test.ts
│   │   └── socketEmitter.test.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/
│   ├── app/                       # Expo Router screens (or screens/ if not using router)
│   │   └── leads.tsx
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useLeadSocket.ts
│   │   ├── components/
│   │   │   └── LeadListItem.tsx
│   │   └── types/
│   │       └── lead.ts
│   ├── __tests__/
│   │   ├── useLeadSocket.test.ts
│   │   └── LeadListItem.test.tsx
│   ├── app.json
│   └── package.json
│
├── docs/
│   ├── ASSUMPTIONS.md
│   └── ARCHITECTURE.md
│
└── README.md
```

---

## 4. Environment Variables (`backend/.env`)

```
META_APP_ID=
META_APP_SECRET=             # needed only for the server-side token exchange
META_USER_ACCESS_TOKEN=      # long-lived User token; typically about 60 days
META_VERIFY_TOKEN=        # any string you choose, used in webhook handshake
META_PAGE_ACCESS_TOKEN=   # optional fallback; can be derived from a long-lived User token
META_GRAPH_API_VERSION=v26.0
PORT=4000
```

---

## 5. Prerequisites / One-Time Meta Setup (not code, do before Day 1)

- [ ] Create a Meta Developer account + App (type: Business)
- [ ] Create or use a test Facebook Page
- [ ] Under the App, add the **Webhooks** product, subscribe to the Page,
      field `leadgen`
- [ ] Generate a Page Access Token with `leads_retrieval`,
      `pages_show_list`, `pages_manage_metadata` permissions
- [ ] Locate the **Lead Ads Testing Tool**
      (developers.facebook.com → your app → Lead Ads Testing Tool) and
      create/select a test lead form
- [ ] Configure ngrok auth token and reserved domain, confirm it forwards to port 4000

---

## 6. TDD Task List

Work **test-first** on every ticket below: write the failing test, make
it pass minimally, refactor. Each checkbox is one Copilot session /
commit.

### Phase A — Backend: Webhook verification

- [x] **A1.** Test: `GET /webhook/leadgen` with correct
      `hub.verify_token` and `hub.challenge` query params returns
      `200` with the challenge echoed back as plain text.
- [x] **A2.** Test: `GET /webhook/leadgen` with an incorrect verify
      token returns `403`.
- [x] **A3.** Implement the route to pass A1 and A2 (Meta's webhook
      handshake requirement).

### Phase B — Backend: Receiving the webhook event

- [x] **B1.** Test: `POST /webhook/leadgen` with a valid Meta
      `leadgen` payload (use a fixture JSON matching Meta's documented
      shape) returns `200` immediately (Meta requires a fast ack).
- [x] **B2.** Test: on receiving that payload, `graphApi.fetchLead`
      is called once with the correct `leadgen_id` extracted from
      `entry[0].changes[0].value.leadgen_id`.
- [x] **B3.** Test: an invalid/malformed payload still returns `200`
      (never let a malformed webhook retry-storm you) but logs a
      warning and does not call `fetchLead`.
- [x] **B4.** Implement the route handler to satisfy B1–B3.

### Phase C — Backend: Graph API lead fetch

- [x] **C1.** Test: `fetchLead(leadgenId)` calls
      `GET https://graph.facebook.com/{version}/{leadgenId}` with the
      page access token as a query param, using a mocked HTTP client
      (nock or jest mock on `fetch`/`axios`).
- [x] **C2.** Test: `fetchLead` parses Meta's `field_data` array
      (array of `{name, values}`) into a flat `{ name, email, phone,
      ... }` object.
- [x] **C3.** Test: `fetchLead` throws/rejects cleanly on a non-200
      Graph API response, and the caller (webhook route) catches it
      without crashing the process.
- [x] **C4.** Implement `graphApi.ts` to satisfy C1–C3.

### Phase D — Backend: Socket emission

- [x] **D1.** Test: `socketEmitter.emitNewLead(lead)` calls
      `io.emit('new-lead', lead)` on the shared socket.io instance.
- [x] **D2.** Test: the webhook route, after a successful
      `fetchLead`, calls `emitNewLead` with the parsed lead object.
- [x] **D3.** Implement `socket.ts` (server setup) and wire it into
      `app.ts`/`server.ts`.

### Phase E — Backend: Integration test (no mocks at the boundary)

- [x] **E1.** Test: spin up the Express+Socket.io server, connect a
      real `socket.io-client`, POST a fixture webhook to `/webhook/leadgen`,
      use the local Graph fixture in place of Meta, and assert the client
      receives the `new-lead` payload.

### Phase F — Mobile: Socket hook

- [x] **F1.** Test: `useLeadSocket()` connects to the backend socket
      URL on mount (mock `socket.io-client`).
- [x] **F2.** Test: when a `new-lead` event fires, the hook's
      returned `leads` array gets the new lead **prepended** (newest
      first).
- [x] **F3.** Test: the hook disconnects the socket on unmount (no
      leaked connections/listeners).
- [x] **F4.** Implement `useLeadSocket.ts` to satisfy F1–F3.

### Phase G — Mobile: Leads list UI

- [x] **G1.** Test: `LeadListItem` renders a lead's name, email, and
      phone (or "—" for missing fields).
- [x] **G2.** Test: the leads screen renders an empty state when
      `leads.length === 0`.
- [x] **G3.** Test: the leads screen renders one `LeadListItem` per
      item in `leads`, newest at the top.
- [x] **G4.** Implement `LeadListItem.tsx` and the leads screen
      (`app/leads.tsx`) to satisfy G1–G3, wired to `useLeadSocket()`.
- [x] **G5.** Integration test: connect the real mobile hook to a local
      Socket.io server and assert the pushed lead appears in the screen.

### Phase H — End-to-end manual verification (not automated, do once code is green)

- [ ] **H1.** Start backend locally, start ngrok on the reserved domain, update
      the webhook Callback URL in Meta App dashboard to the ngrok URL.
- [ ] **H2.** Launch the Expo app on simulator, open the leads screen.
- [ ] **H3.** Submit a test lead via the Lead Ads Testing Tool.
- [ ] **H4.** Confirm the lead appears in the app within ~1–2 seconds,
      untouched.
- [ ] **H5.** Record this as Loom #1 (≤ 5 min): app already open →
      submit test lead in another window → lead appears live.

### Phase I — Deliverables polish

- [x] **I1.** Write `docs/ASSUMPTIONS.md` (see seed content below).
- [x] **I2.** Write `docs/ARCHITECTURE.md` with the diagram from
      Section 1 and a short explanation of each hop.
- [ ] **I3.** Record Loom #2: walk through the code, explain the
      webhook → Graph API → socket → app flow, show the TDD test
      suite passing (`npm test` in both folders).
- [ ] **I4.** Clean README with setup steps, env vars, and both Loom
      links.

---

## 7. Seed content for `docs/ASSUMPTIONS.md`

- A single shared backend instance is used for the PoC; no
  multi-tenant / multi-page support.
- No persistent database — leads are only held in memory on the
  backend and in the app's socket-driven state; a refresh of the app
  clears the list (acceptable for a PoC; call out "would add
  Postgres/SQLite for persistence" as a next step).
- No authentication on the socket connection or the leads screen —
  out of scope for a PoC demonstrating the live-data pipeline.
- Meta's webhook payload for a `leadgen` change only contains IDs,
  not form field values — the actual field values are fetched
  separately via the Graph API `GET /{leadgen_id}` call, as documented
  by Meta.
- Tested using Meta's Lead Ads Testing Tool, not a live ad — no ad
  spend or real user data involved.

---

## 8. Suggested Copilot prompt to kick this off

> Read `PROJECT_PLAN.md` in full. Start with Phase A, task A1: write
> a failing Supertest test for the Meta webhook verification GET
> route in `backend/test/webhook.test.ts`, then implement just enough
> in `backend/src/routes/webhook.ts` to make it pass. Don't move to
> A2 until A1 is green. Follow the repo structure exactly as laid out
> in Section 3.

Feed it one phase (or even one task) at a time rather than the whole
file at once — keeps Copilot's diffs small and reviewable, and keeps
the TDD discipline (red → green → refactor) actually enforced instead
of Copilot writing implementation and tests together in one shot.

---

## 9. Reference links

- Meta leadgen webhooks: https://developers.facebook.com/docs/graph-api/webhooks/reference/page/#leadgen
- Lead Ads Testing Tool: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/testing
- Graph API lead retrieval: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
- Expo push vs sockets isn't needed here, but if swapping later:
  https://docs.expo.dev/push-notifications/overview/
- Socket.io docs: https://socket.io/docs/v4/
