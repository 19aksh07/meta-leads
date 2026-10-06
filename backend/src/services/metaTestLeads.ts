type MetaFieldData = {
  name: string;
  values: unknown[];
};

type MetaLeadResponse = {
  id?: string;
  created_time?: string;
  field_data?: MetaFieldData[];
  [key: string]: unknown;
};

type MetaGraphErrorResponse = {
  error?: {
    message?: unknown;
    code?: unknown;
    error_subcode?: unknown;
  };
};

export type TestLeadFields = {
  full_name: string;
  email: string;
  phone_number: string;
};

function getMetaConfig(): { formId: string; accessToken: string; version: string } {
  const formId = process.env.META_LEADGEN_FORM_ID;
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;

  if (!formId) {
    throw new Error('META_LEADGEN_FORM_ID is not configured');
  }
  if (/^(replace-with|your-|<.*>)/i.test(formId.trim())) {
    throw new Error(
      'META_LEADGEN_FORM_ID is still a placeholder; set it to the numeric ID of your Page lead form',
    );
  }
  if (!accessToken) {
    throw new Error('META_PAGE_ACCESS_TOKEN is not configured');
  }

  return {
    formId,
    accessToken,
    version: process.env.META_GRAPH_API_VERSION || 'v26.0',
  };
}

function graphErrorMessage(payload: unknown): string {
  const graphError =
    payload && typeof payload === 'object' && 'error' in payload
      ? (payload as MetaGraphErrorResponse).error
      : undefined;
  if (!graphError) {
    return '';
  }

  const message =
    typeof graphError.message === 'string' ? `: ${graphError.message}` : '';
  const code =
    typeof graphError.code === 'number' ? ` (code ${graphError.code}` : '';
  const subcode =
    typeof graphError.error_subcode === 'number'
      ? `${code ? ', ' : ' ('}subcode ${graphError.error_subcode}`
      : '';

  return `${message}${code}${subcode}${code || subcode ? ')' : ''}`;
}

async function requestGraph(
  path: string,
  method: 'GET' | 'POST' | 'DELETE',
  fields?: TestLeadFields,
): Promise<unknown> {
  const { accessToken, version } = getMetaConfig();
  const url = new URL(`${version}/${path}`, 'https://graph.facebook.com/');
  const options: RequestInit = { method };

  if (method === 'GET') {
    url.searchParams.set('access_token', accessToken);
  } else {
    const body = new URLSearchParams({ access_token: accessToken });
    if (fields) {
      body.set(
        'field_data',
        JSON.stringify([
          { name: 'full_name', values: [fields.full_name] },
          { name: 'email', values: [fields.email] },
          { name: 'phone_number', values: [fields.phone_number] },
        ]),
      );
    }
    options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    options.body = body.toString();
  }

  const response = await fetch(url, options);
  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new Error(
      `Graph API request failed with status ${response.status}${graphErrorMessage(payload)}`,
    );
  }
  return payload;
}

function normalizeLead(lead: MetaLeadResponse): Record<string, unknown> {
  const flattenedFields = Object.fromEntries(
    (Array.isArray(lead.field_data) ? lead.field_data : []).map((field) => [
      field.name,
      field.values?.[0] ?? '',
    ]),
  );

  return {
    ...lead,
    ...flattenedFields,
    id: lead.id,
    is_test_lead: true,
  };
}

export async function listTestLeads(): Promise<Record<string, unknown>[]> {
  const { formId } = getMetaConfig();
  const payload = await requestGraph(
    `${encodeURIComponent(formId)}/test_leads`,
    'GET',
  );

  if (
    !payload ||
    typeof payload !== 'object' ||
    !('data' in payload) ||
    !Array.isArray((payload as { data?: unknown }).data)
  ) {
    throw new Error('Graph API returned an invalid test-leads list');
  }

  return (payload as { data: MetaLeadResponse[] }).data
    .filter((lead) => typeof lead.id === 'string')
    .map(normalizeLead);
}

export async function createTestLead(
  fields: TestLeadFields,
): Promise<Record<string, unknown>> {
  const { formId } = getMetaConfig();
  const payload = await requestGraph(
    `${encodeURIComponent(formId)}/test_leads`,
    'POST',
    fields,
  );

  const result =
    payload && typeof payload === 'object'
      ? (payload as MetaLeadResponse)
      : {};
  if (typeof result.id !== 'string') {
    const leads = await listTestLeads();
    const createdLead = leads.find(
      (lead) =>
        lead.email === fields.email && lead.full_name === fields.full_name,
    );
    if (createdLead) {
      return createdLead;
    }
    throw new Error(
      'Meta accepted the test lead, but it was not returned by the test-leads list. Refresh the app before retrying.',
    );
  }

  return normalizeLead({
    ...result,
    created_time: result.created_time ?? new Date().toISOString(),
    field_data: result.field_data ?? [
      { name: 'full_name', values: [fields.full_name] },
      { name: 'email', values: [fields.email] },
      { name: 'phone_number', values: [fields.phone_number] },
    ],
  });
}

export async function deleteTestLead(leadId: string): Promise<void> {
  await requestGraph(encodeURIComponent(leadId), 'DELETE');
}
