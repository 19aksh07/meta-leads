# Assumptions

- One backend instance and one Meta Page are used for this proof of concept.
- There is no database. Leads remain in the app's in-memory list and are lost
  when the app restarts; persistence could be added with Postgres or SQLite.
- Socket connections and the leads screen are unauthenticated. Authentication
  and tenant isolation are outside this demonstration's scope.
- Meta's `leadgen` webhook change contains lead identifiers, not form answers.
  The backend retrieves the submitted fields separately with the Graph API.
- The demonstration uses Meta's Lead Ads Testing Tool, not a live ad. No ad
  spend or real user data is required.
- `META_GRAPH_API_MOCK=true` is used because creating Instant Forms requires a
  connected, verified Business Portfolio, which is out of scope for this PoC.
  Only the downstream Graph API lead fetch is mocked; the webhook trigger,
  through Meta's Webhooks test-send feature or the local `sendDemoLead` script,
  remains a real, Meta-shaped `leadgen` event. The mock is disabled in
  production.
- The test Page, Meta app, access token, ngrok account/domain, webhook
  subscription, and Loom recordings are supplied/configured by the operator;
  they are not part of the source repository.
- The backend acknowledges malformed webhook content without retrying it and
  logs a warning. It does not verify Meta's `X-Hub-Signature-256` signature;
  production use must add signature verification and stronger access controls.
- The backend currently broadcasts every successfully retrieved lead to every
  connected client. Page-scoped rooms and multi-tenant routing are out of scope.
- Lead retrieval accepts a long-lived User token directly; it typically lasts
  about 60 days and must be refreshed when it expires. An optional Page token
  from the same long-lived User token can be used as fallback and generally has
  no expiration date unless Meta invalidates it due to access or permission
  changes.