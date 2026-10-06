import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { io as createClient, type Socket } from 'socket.io-client';
import app from '../src/app';
import { initializeSocket } from '../src/socket';
import { setSocketServer } from '../src/services/socketEmitter';

describe('mock test-lead app flow', () => {
  const originalMock = process.env.META_GRAPH_API_MOCK;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFormId = process.env.META_LEADGEN_FORM_ID;
  const originalPageToken = process.env.META_PAGE_ACCESS_TOKEN;

  beforeAll(() => {
    process.env.META_GRAPH_API_MOCK = 'true';
    process.env.NODE_ENV = 'test';
    delete process.env.META_LEADGEN_FORM_ID;
    delete process.env.META_PAGE_ACCESS_TOKEN;
  });

  afterAll(() => {
    if (originalMock === undefined) {
      delete process.env.META_GRAPH_API_MOCK;
    } else {
      process.env.META_GRAPH_API_MOCK = originalMock;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
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
  });

  it('creates, lists, broadcasts, and deletes leads without calling Meta', async () => {
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

      const leadEvent = new Promise<Record<string, unknown>>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Timed out waiting for mock lead event')),
          2000,
        );
        client.once('new-lead', (lead: Record<string, unknown>) => {
          clearTimeout(timeout);
          resolve(lead);
        });
      });

      const fields = {
        full_name: 'Phone Mock Lead',
        email: 'phone-mock@example.com',
        phone_number: '+15555550123',
      };
      const created = await request(httpServer)
        .post('/api/test-leads')
        .send(fields);

      expect(created.status).toBe(201);
      expect(created.body.lead).toMatchObject({
        ...fields,
        is_mock_lead: true,
        is_test_lead: true,
      });
      await expect(leadEvent).resolves.toMatchObject(created.body.lead);

      const listed = await request(httpServer).get('/api/test-leads');
      expect(listed.status).toBe(200);
      expect(listed.body).toMatchObject({
        mode: 'mock',
        leads: [created.body.lead],
      });

      const deleted = await request(httpServer).delete(
        `/api/test-leads/${created.body.lead.id}`,
      );
      expect(deleted.status).toBe(204);

      const afterDelete = await request(httpServer).get('/api/test-leads');
      expect(afterDelete.body).toEqual({ mode: 'mock', leads: [] });
    } finally {
      client.disconnect();
      await new Promise<void>((resolve) => socketServer.close(() => resolve()));
      setSocketServer(null);
    }
  });
});
