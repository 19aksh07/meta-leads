import { Router } from 'express';
import {
  createTestLead,
  deleteTestLead,
  isMockTestLeadMode,
  listTestLeads,
  type TestLeadFields,
} from '../services/metaTestLeads';
import { emitNewLead, emitTestLeadsChanged } from '../services/socketEmitter';

const router = Router();

function readFields(body: unknown): TestLeadFields | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const input = body as Record<string, unknown>;
  const fullName =
    typeof input.full_name === 'string' ? input.full_name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const phoneNumber =
    typeof input.phone_number === 'string' ? input.phone_number.trim() : '';

  return fullName && email && phoneNumber
    ? { full_name: fullName, email, phone_number: phoneNumber }
    : null;
}

router.get('/', async (_req, res) => {
  try {
    res.json({
      mode: isMockTestLeadMode() ? 'mock' : 'meta',
      leads: await listTestLeads(),
    });
  } catch (error) {
    console.error('Failed to list Meta test leads', error);
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Failed to list test leads',
    });
  }
});

router.post('/', async (req, res) => {
  const fields = readFields(req.body);
  if (!fields) {
    res.status(400).json({
      error: 'full_name, email, and phone_number are required strings',
    });
    return;
  }

  try {
    const lead = await createTestLead(fields);
    emitNewLead(lead);
    res.status(201).json({ lead });
  } catch (error) {
    console.error('Failed to create Meta test lead', error);
    res.status(502).json({
      error:
        error instanceof Error ? error.message : 'Failed to create test lead',
    });
  }
});

router.delete('/:leadId', async (req, res) => {
  const { leadId } = req.params;
  if (!leadId) {
    res.status(400).json({ error: 'A test lead ID is required' });
    return;
  }

  try {
    await deleteTestLead(leadId);
    emitTestLeadsChanged();
    res.sendStatus(204);
  } catch (error) {
    console.error(`Failed to delete Meta test lead ${leadId}`, error);
    res.status(502).json({
      error:
        error instanceof Error ? error.message : 'Failed to delete test lead',
    });
  }
});

export default router;
