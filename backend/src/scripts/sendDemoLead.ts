import 'dotenv/config';

const port = process.env.PORT || '4000';
const leadgenId = `demo-${Date.now()}`;

async function sendDemoLead(): Promise<void> {
  const response = await fetch(`http://127.0.0.1:${port}/webhook/leadgen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      object: 'page',
      entry: [
        {
          id: 'local-demo-page',
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: 'leadgen',
              value: {
                leadgen_id: leadgenId,
                form_id: 'local-demo-form',
                page_id: 'local-demo-page',
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Demo webhook returned HTTP ${response.status}`);
  }

  console.log(`Sent demo lead ${leadgenId}; webhook replied HTTP ${response.status}`);
}

void sendDemoLead().catch((error: unknown) => {
  console.error('Could not send demo lead. Is the backend running?', error);
  process.exitCode = 1;
});