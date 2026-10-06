import {
  createTestLead,
  deleteTestLead,
  listTestLeads,
} from '../src/services/metaTestLeads';

describe('Meta test-lead Graph API', () => {
  const fetchMock = jest.spyOn(global, 'fetch');
  const originalFormId = process.env.META_LEADGEN_FORM_ID;
  const originalPageToken = process.env.META_PAGE_ACCESS_TOKEN;
  const originalVersion = process.env.META_GRAPH_API_VERSION;

  beforeEach(() => {
    process.env.META_LEADGEN_FORM_ID = 'form-123';
    process.env.META_PAGE_ACCESS_TOKEN = 'page-token';
    process.env.META_GRAPH_API_VERSION = 'v26.0';
    fetchMock.mockReset();
  });

  afterAll(() => {
    fetchMock.mockRestore();
    if (originalFormId === undefined) {
      delete process.env.META_LEADGEN_FORM_ID;
    } else {
      process.env.META_LEADGEN_FORM_ID = originalFormId;
    }
    if (originalPageToken === undefined) {
      delete process.env.META_PAGE_ACCESS_TOKEN;
    } else {
      process.env.META_PAGE_ACCESS_TOKEN = originalPageToken;
    }
    if (originalVersion === undefined) {
      delete process.env.META_GRAPH_API_VERSION;
    } else {
      process.env.META_GRAPH_API_VERSION = originalVersion;
    }
  });

  it('creates a test lead with Meta field_data and keeps the Page token in the request body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'test-lead-1' }),
    } as Response);

    await expect(
      createTestLead({
        full_name: 'Android Test',
        email: 'test@example.com',
        phone_number: '+15555550100',
      }),
    ).resolves.toMatchObject({
      id: 'test-lead-1',
      is_test_lead: true,
      full_name: 'Android Test',
      email: 'test@example.com',
      phone_number: '+15555550100',
    });

    const [requestUrl, options] = fetchMock.mock.calls[0];
    expect(new URL(requestUrl as string).pathname).toBe(
      '/v26.0/form-123/test_leads',
    );
    expect(options?.method).toBe('POST');
    const body = new URLSearchParams(options?.body as string);
    expect(body.get('access_token')).toBe('page-token');
    expect(JSON.parse(body.get('field_data') || '')).toEqual([
      { name: 'full_name', values: ['Android Test'] },
      { name: 'email', values: ['test@example.com'] },
      { name: 'phone_number', values: ['+15555550100'] },
    ]);
  });

  it('reads the created lead back when Meta omits an ID from the create response', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 'test-lead-from-list',
              field_data: [
                { name: 'full_name', values: ['Android Test'] },
                { name: 'email', values: ['test@example.com'] },
              ],
            },
          ],
        }),
      } as Response);

    await expect(
      createTestLead({
        full_name: 'Android Test',
        email: 'test@example.com',
        phone_number: '+15555550100',
      }),
    ).resolves.toMatchObject({
      id: 'test-lead-from-list',
      is_test_lead: true,
      full_name: 'Android Test',
      email: 'test@example.com',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('lists and flattens existing test leads', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            id: 'test-lead-2',
            field_data: [
              { name: 'full_name', values: ['Grace Hopper'] },
              { name: 'email', values: ['grace@example.com'] },
            ],
          },
        ],
      }),
    } as Response);

    await expect(listTestLeads()).resolves.toMatchObject([
      {
        id: 'test-lead-2',
        is_test_lead: true,
        full_name: 'Grace Hopper',
        email: 'grace@example.com',
      },
    ]);
    const [requestUrl] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl as string);
    expect(url.pathname).toBe('/v26.0/form-123/test_leads');
    expect(url.searchParams.get('access_token')).toBe('page-token');
  });

  it('deletes a specific lead ID using the documented Graph endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as Response);

    await expect(deleteTestLead('lead/with-special?chars')).resolves.toBeUndefined();

    const [requestUrl, options] = fetchMock.mock.calls[0];
    expect(new URL(requestUrl as string).pathname).toBe(
      '/v26.0/lead%2Fwith-special%3Fchars',
    );
    expect(options?.method).toBe('DELETE');
    expect(new URLSearchParams(options?.body as string).get('access_token')).toBe(
      'page-token',
    );
  });

  it('surfaces Meta Graph error details', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: { message: 'A test lead already exists', code: 100 },
      }),
    } as Response);

    await expect(
      createTestLead({
        full_name: 'Test',
        email: 'test@example.com',
        phone_number: '+15555550100',
      }),
    ).rejects.toThrow(
      'Graph API request failed with status 400: A test lead already exists (code 100)',
    );
  });

  it('requires a configured form ID before making an API request', async () => {
    delete process.env.META_LEADGEN_FORM_ID;

    await expect(listTestLeads()).rejects.toThrow(
      'META_LEADGEN_FORM_ID is not configured',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects the example form-ID placeholder before calling Graph API', async () => {
    process.env.META_LEADGEN_FORM_ID =
      'replace-with-the-page-lead-form-id';

    await expect(listTestLeads()).rejects.toThrow(
      'META_LEADGEN_FORM_ID is still a placeholder; set it to the numeric ID of your Page lead form',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
