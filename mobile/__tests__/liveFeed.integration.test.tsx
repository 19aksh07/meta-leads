import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server as SocketServer } from 'socket.io';
import LeadsScreen from '../app/leads';

describe('mock lead end-to-end feed', () => {
  let httpServer: ReturnType<typeof createServer>;
  let socketServer: SocketServer;
  let socketUrl: string;
  let leads: Record<string, unknown>[];
  const fetchMock = jest.spyOn(global, 'fetch');

  beforeAll(async () => {
    leads = [];
    fetchMock.mockImplementation(async (input, init) => {
      const url = new URL(input as string);

      if (init?.method === 'POST') {
        const fields = JSON.parse(init.body as string) as Record<
          string,
          string
        >;
        const lead = {
          ...fields,
          id: `mock-${Date.now()}`,
          created_time: new Date().toISOString(),
          is_test_lead: true,
          is_mock_lead: true,
        };
        leads = [lead, ...leads];
        socketServer.emit('new-lead', lead);
        return {
          ok: true,
          status: 201,
          json: async () => ({ lead }),
        } as Response;
      }

      if (init?.method === 'DELETE') {
        const leadId = decodeURIComponent(url.pathname.split('/').pop() || '');
        leads = leads.filter((lead) => lead.id !== leadId);
        socketServer.emit('test-leads-changed');
        return { ok: true, status: 204, json: async () => undefined } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ mode: 'mock', leads }),
      } as Response;
    });
    httpServer = createServer();
    socketServer = new SocketServer(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;
    socketUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => socketServer.close(() => resolve()));
    fetchMock.mockRestore();
  });

  it('creates a lead from the app, displays it, and removes it through the backend API', async () => {
    render(<LeadsScreen socketUrl={socketUrl} />);

    await waitFor(() => expect(screen.getByText('LIVE')).toBeTruthy(), {
      timeout: 3000,
    });
    await waitFor(() =>
      expect(screen.getByText('Create mock lead')).toBeTruthy(),
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Create mock lead'));
    });

    await waitFor(() =>
      expect(screen.getByText('Android Test Lead')).toBeTruthy(),
    );
    expect(screen.getByText('android-test@example.com')).toBeTruthy();
    expect(screen.getByText('+15555550100')).toBeTruthy();
    expect(screen.getByText('MOCK')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-lead'));
    });

    await waitFor(() =>
      expect(screen.queryByText('Android Test Lead')).toBeNull(),
    );
  }, 15000);
});
