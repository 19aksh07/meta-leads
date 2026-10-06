import { Router } from 'express';
import { fetchLead } from '../services/graphApi';
import { emitNewLead } from '../services/socketEmitter';

const router = Router();

function extractLeadgenIds(body: unknown): string[] {
  if (!body || typeof body !== 'object' || !('entry' in body)) {
    return [];
  }

  const entries = (body as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || !('changes' in entry)) {
      return [];
    }

    const changes = (entry as { changes?: unknown }).changes;
    if (!Array.isArray(changes)) {
      return [];
    }

    return changes.flatMap((change: unknown) => {
      if (!change || typeof change !== 'object' || !('value' in change)) {
        return [];
      }

      const value = (change as { value?: unknown }).value;
      if (
        (change as { field?: unknown }).field !== 'leadgen' ||
        !value ||
        typeof value !== 'object' ||
        !('leadgen_id' in value)
      ) {
        return [];
      }

      const leadgenId = (value as { leadgen_id?: unknown }).leadgen_id;
      if (typeof leadgenId === 'string' && leadgenId.length > 0) {
        return [leadgenId];
      }

      return typeof leadgenId === 'number' &&
        Number.isSafeInteger(leadgenId) &&
        leadgenId > 0
        ? [String(leadgenId)]
        : [];
    });
  });
}

router.get('/', (req, res) => {
  const verifyToken = process.env.META_VERIFY_TOKEN;
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (
    req.query['hub.mode'] === 'subscribe' &&
    verifyToken &&
    token === verifyToken &&
    typeof challenge === 'string'
  ) {
    return res.status(200).type('text/plain').send(challenge);
  }

  return res.sendStatus(403);
});

router.post('/', (req, res) => {
  const leadgenIds = extractLeadgenIds(req.body);
  res.sendStatus(200);

  if (leadgenIds.length === 0) {
    console.warn('Received malformed leadgen webhook payload');
    return;
  }

  for (const leadgenId of leadgenIds) {
    void fetchLead(leadgenId)
      .then(emitNewLead)
      .catch((error: unknown) => {
        console.warn(`Failed to fetch lead ${leadgenId}`, error);
      });
  }
});

export default router;