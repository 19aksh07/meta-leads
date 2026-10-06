# Architecture

```text
Meta Lead Ads Testing Tool
        | simulated form submission
        v
Meta Webhook -> POST /webhook/leadgen (Node/Express)
        | extract leadgen_id; acknowledge quickly
        v
Graph API GET /{leadgen_id} (Page access token)
        | normalize field_data
        v
Socket.io server -> new-lead event -> open Expo app
                                      | prepend in memory
                                      v
                                 Live leads list
```

1. Meta sends a Page `leadgen` change to the public HTTPS webhook URL. The
   webhook endpoint validates its GET verification handshake and acknowledges
   POST requests immediately.
2. The POST handler extracts IDs from `entry[].changes[]` and schedules a Graph
   API lookup for each ID. Structural errors are logged and acknowledged to
   prevent retry storms.
3. The Graph API service requests the full lead using the configured Page
   access token and flattens Meta's `field_data` entries into lead properties.
4. The backend emits each retrieved lead as a Socket.io `new-lead` event.
5. `useLeadSocket` keeps a connection while the feed screen is mounted,
   prepends incoming leads, tracks connection status, and disconnects on
   unmount. The list is intentionally in memory for this PoC.

The Express app is exported independently from `server.ts` so route tests can
use Supertest without binding a port. The integration test runs a real local
HTTP/Socket.io server and client while mocking only the external Graph API.