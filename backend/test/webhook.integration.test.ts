import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { io as createClient, type Socket } from 'socket.io-client';
import app from '../src/app';
import { initializeSocket } from '../src/socket';
import { setSocketServer } from '../src/services/socketEmitter';

describe('leadgen webhook realtime integration', () => {
  const originalGraphApiMock = process.env.META_GRAPH_API_MOCK;
  const originalPageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;

  beforeEach(() => {
    process.env.META_GRAPH_API_MOCK = 'true';
    delete process.env.META_PAGE_ACCESS_TOKEN;
  });

  afterAll(() => {
    if (originalGraphApiMock === undefined) {
      delete process.env.META_GRAPH_API_MOCK;
    } else {
      process.env.META_GRAPH_API_MOCK = originalGraphApiMock;
    }
    if (originalPageAccessToken === undefined) {
      delete process.env.META_PAGE_ACCESS_TOKEN;
    } else {
      process.env.META_PAGE_ACCESS_TOKEN = originalPageAccessToken;
    }
  });

  it('broadcasts a webhook lead through the local Graph fixture to a connected client', async () => {
    const httpServer = createServer(app);
    const socketServer = initializeSocket(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;
    const client: Socket = createClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
    });

    try {
      await new Promise<void>((resolve, reject) => {
        client.once('connect', resolve);
        client.once('connect_error', reject);
      });

      const leadReceived = new Promise<unknown>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Timed out waiting for new-lead event')),
          1000,
        );
        client.once('new-lead', (lead: unknown) => {
          clearTimeout(timeout);
          resolve(lead);
        });
      });

      const response = await request(httpServer)
        .post('/webhook/leadgen')
        .send({
          object: 'page',
          entry: [
            {
              changes: [
                { field: 'leadgen', value: { leadgen_id: 'lead-123' } },
              ],
            },
          ],
        });

      expect(response.status).toBe(200);
      await expect(leadReceived).resolves.toMatchObject({
        id: 'lead-123',
        full_name: 'Demo Lead',
        email: 'demo@example.com',
        phone_number: '+15551234567',
      });
    } finally {
      client.disconnect();
      await new Promise<void>((resolve) => socketServer.close(() => resolve()));
      setSocketServer(null);
    }
  });
});