type MetaFieldData = {
  name: string;
  values?: unknown[];
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

export async function fetchLead(
  leadgenId: string,
): Promise<Record<string, unknown>> {
  if (
    process.env.META_GRAPH_API_MOCK === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    return {
      id: leadgenId,
      created_time: new Date().toISOString(),
      full_name: "Demo Lead",
      email: "demo@example.com",
      phone_number: "+15551234567",
      is_mock_lead: true,
    };
  }

  const accessToken =
    process.env.META_PAGE_ACCESS_TOKEN || process.env.META_USER_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      "META_PAGE_ACCESS_TOKEN or META_USER_ACCESS_TOKEN is not configured",
    );
  }

  const version = process.env.META_GRAPH_API_VERSION || "v26.0";
  const url = new URL(
    `${version}/${encodeURIComponent(leadgenId)}`,
    "https://graph.facebook.com/",
  );
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url);
  const payload: unknown = await response.json();

  if (!response.ok) {
    const graphError =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as MetaGraphErrorResponse).error
        : undefined;
    const message =
      graphError && typeof graphError.message === "string"
        ? `: ${graphError.message}`
        : "";
    const code =
      graphError && typeof graphError.code === "number"
        ? ` (code ${graphError.code}`
        : "";
    const subcode =
      graphError && typeof graphError.error_subcode === "number"
        ? `${code ? ", " : " ("}subcode ${graphError.error_subcode}`
        : "";
    const closingParen = code || subcode ? ")" : "";

    throw new Error(
      `Graph API request failed with status ${response.status}${message}${code}${subcode}${closingParen}`,
    );
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Graph API returned an invalid lead response");
  }

  const lead = payload as MetaLeadResponse;
  const flattenedFields = Object.fromEntries(
    (Array.isArray(lead.field_data) ? lead.field_data : []).map((field) => [
      field.name,
      field.values?.[0] ?? "",
    ]),
  );

  return {
    ...lead,
    ...flattenedFields,
    id: lead.id ?? leadgenId,
  };
}
