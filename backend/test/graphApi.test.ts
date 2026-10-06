import { fetchLead } from '../src/services/graphApi';

describe('fetchLead', () => {
  const fetchMock = jest.spyOn(global, 'fetch');

  beforeEach(() => {
    process.env.META_PAGE_ACCESS_TOKEN = 'page-token';
    process.env.META_GRAPH_API_VERSION = 'v26.0';
    delete process.env.META_USER_ACCESS_TOKEN;
    delete process.env.META_GRAPH_API_MOCK;
    fetchMock.mockReset();
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  it('requests the lead with the configured Graph API version and token', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'lead-123', field_data: [] }),
    } as Response);

    await fetchLead('lead-123');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl as string);
    expect(url.origin).toBe('https://graph.facebook.com');
    expect(url.pathname).toBe('/v26.0/lead-123');
    expect(url.searchParams.get('access_token')).toBe('page-token');
  });

  it('prefers the Page Access Token over a configured user token', async () => {
    process.env.META_USER_ACCESS_TOKEN = 'long-lived-user-token';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'lead-123', field_data: [] }),
    } as Response);

    await fetchLead('lead-123');

    const [requestUrl] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl as string);
    expect(url.searchParams.get('access_token')).toBe('page-token');
  });

  it('falls back to the user token when no Page Access Token is set', async () => {
    delete process.env.META_PAGE_ACCESS_TOKEN;
    process.env.META_USER_ACCESS_TOKEN = 'long-lived-user-token';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'lead-123', field_data: [] }),
    } as Response);

    await fetchLead('lead-123');

    const [requestUrl] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl as string);
    expect(url.searchParams.get('access_token')).toBe('long-lived-user-token');
  });

  it('flattens Meta field_data into lead properties', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'lead-123',
        created_time: '2026-10-03T12:00:00+0000',
        field_data: [
          { name: 'full_name', values: ['Ada Lovelace'] },
          { name: 'email', values: ['ada@example.com'] },
          { name: 'phone_number', values: ['+15551234567'] },
        ],
      }),
    } as Response);

    await expect(fetchLead('lead-123')).resolves.toMatchObject({
      id: 'lead-123',
      created_time: '2026-10-03T12:00:00+0000',
      full_name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone_number: '+15551234567',
    });
  });

  it('rejects when Graph API returns a non-success response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: { message: 'Invalid lead ID', code: 100, error_subcode: 33 },
      }),
    } as Response);

    await expect(fetchLead('bad-id')).rejects.toThrow(
      'Graph API request failed with status 400: Invalid lead ID (code 100, subcode 33)',
    );
  });

  it('returns a local demo lead without a token or network call in mock mode', async () => {
    process.env.META_GRAPH_API_MOCK = 'true';
    delete process.env.META_PAGE_ACCESS_TOKEN;
    delete process.env.META_USER_ACCESS_TOKEN;

    await expect(fetchLead('demo-123')).resolves.toMatchObject({
      id: 'demo-123',
      full_name: 'Demo Lead',
      email: 'demo@example.com',
      phone_number: '+15551234567',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not activate the local mock in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.META_GRAPH_API_MOCK = 'true';
    delete process.env.META_PAGE_ACCESS_TOKEN;
    delete process.env.META_USER_ACCESS_TOKEN;

    try {
      await expect(fetchLead('demo-123')).rejects.toThrow(
        'META_PAGE_ACCESS_TOKEN or META_USER_ACCESS_TOKEN is not configured',
      );
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});