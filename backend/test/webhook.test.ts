import request from 'supertest';
import app from '../src/app';
import { fetchLead } from '../src/services/graphApi';
import { emitNewLead } from '../src/services/socketEmitter';

jest.mock('../src/services/graphApi', () => ({
  fetchLead: jest.fn(),
}));

jest.mock('../src/services/socketEmitter', () => ({
  emitNewLead: jest.fn(),
}));

const validWebhookPayload = {
  object: 'page',
  entry: [
    {
      id: 'page-123',
      time: 1_700_000_000,
      changes: [
        {
          field: 'leadgen',
          value: {
            leadgen_id: 'lead-123',
            form_id: 'form-123',
            created_time: 1_700_000_001,
            page_id: 'page-123',
            ad_id: 'ad-123',
          },
        },
      ],
    },
  ],
};

describe('GET /webhook/leadgen', () => {
  it('echoes the challenge for a valid verification token', async () => {
    process.env.META_VERIFY_TOKEN = 'test-verify-token';

    const response = await request(app)
      .get('/webhook/leadgen')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-verify-token',
        'hub.challenge': 'challenge-123',
      });

    expect(response.status).toBe(200);
    expect(response.text).toBe('challenge-123');
    expect(response.headers['content-type']).toMatch(/text\/plain/);
  });

  it('rejects an incorrect verification token', async () => {
    process.env.META_VERIFY_TOKEN = 'test-verify-token';

    const response = await request(app)
      .get('/webhook/leadgen')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'challenge-123',
      });

    expect(response.status).toBe(403);
  });
});

describe('POST /webhook/leadgen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchLead as jest.Mock).mockResolvedValue({
      id: 'lead-123',
      email: 'ada@example.com',
    });
  });

  it('acknowledges a valid leadgen event and fetches its lead ID', async () => {
    const response = await request(app)
      .post('/webhook/leadgen')
      .send(validWebhookPayload);

    expect(response.status).toBe(200);
    expect(fetchLead).toHaveBeenCalledTimes(1);
    expect(fetchLead).toHaveBeenCalledWith('lead-123');
  });

  it('normalizes a numeric Meta lead ID before fetching it', async () => {
    const numericPayload = {
      ...validWebhookPayload,
      entry: [
        {
          ...validWebhookPayload.entry[0],
          changes: [
            {
              ...validWebhookPayload.entry[0].changes[0],
              value: { ...validWebhookPayload.entry[0].changes[0].value, leadgen_id: 123456789 },
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post('/webhook/leadgen')
      .send(numericPayload);

    expect(response.status).toBe(200);
    expect(fetchLead).toHaveBeenCalledWith('123456789');
  });

  it('emits the fetched lead to connected clients', async () => {
    const lead = { id: 'lead-123', email: 'ada@example.com' };

    await request(app).post('/webhook/leadgen').send(validWebhookPayload);
    await new Promise((resolve) => setImmediate(resolve));

    expect(emitNewLead).toHaveBeenCalledWith(lead);
  });

  it('acknowledges malformed payloads without fetching a lead', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const response = await request(app)
      .post('/webhook/leadgen')
      .send({ object: 'page', entry: [] });

    expect(response.status).toBe(200);
    expect(fetchLead).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });

  it('acknowledges syntactically malformed JSON without fetching a lead', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const response = await request(app)
      .post('/webhook/leadgen')
      .set('Content-Type', 'application/json')
      .send('{"entry":');

    expect(response.status).toBe(200);
    expect(fetchLead).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
  });
});