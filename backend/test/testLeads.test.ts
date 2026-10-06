import request from 'supertest';
import app from '../src/app';
import {
  createTestLead,
  deleteTestLead,
  listTestLeads,
} from '../src/services/metaTestLeads';
import {
  emitNewLead,
  emitTestLeadsChanged,
} from '../src/services/socketEmitter';

jest.mock('../src/services/metaTestLeads', () => ({
  createTestLead: jest.fn(),
  deleteTestLead: jest.fn(),
  isMockTestLeadMode: jest.fn(() => false),
  listTestLeads: jest.fn(),
}));

jest.mock('../src/services/socketEmitter', () => ({
  emitNewLead: jest.fn(),
  emitTestLeadsChanged: jest.fn(),
}));

describe('/api/test-leads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listTestLeads as jest.Mock).mockResolvedValue([]);
    (createTestLead as jest.Mock).mockResolvedValue({
      id: 'test-lead-1',
      is_test_lead: true,
    });
    (deleteTestLead as jest.Mock).mockResolvedValue(undefined);
  });

  it('lists test leads', async () => {
    (listTestLeads as jest.Mock).mockResolvedValue([
      { id: 'test-lead-1', full_name: 'Test Lead' },
    ]);

    const response = await request(app).get('/api/test-leads');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      mode: 'meta',
      leads: [{ id: 'test-lead-1', full_name: 'Test Lead' }],
    });
  });

  it('validates required fields without calling Graph API', async () => {
    const response = await request(app)
      .post('/api/test-leads')
      .send({ full_name: 'Test Lead' });

    expect(response.status).toBe(400);
    expect(createTestLead).not.toHaveBeenCalled();
  });

  it('creates a Meta test lead and broadcasts it', async () => {
    const fields = {
      full_name: 'Test Lead',
      email: 'test@example.com',
      phone_number: '+15555550100',
    };

    const response = await request(app).post('/api/test-leads').send(fields);

    expect(response.status).toBe(201);
    expect(response.body.lead.id).toBe('test-lead-1');
    expect(createTestLead).toHaveBeenCalledWith(fields);
    expect(emitNewLead).toHaveBeenCalledWith({
      id: 'test-lead-1',
      is_test_lead: true,
    });
  });

  it('deletes a test lead and tells connected clients to refresh', async () => {
    const response = await request(app).delete(
      '/api/test-leads/test-lead-1',
    );

    expect(response.status).toBe(204);
    expect(deleteTestLead).toHaveBeenCalledWith('test-lead-1');
    expect(emitTestLeadsChanged).toHaveBeenCalledTimes(1);
  });
});
