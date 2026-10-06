import { act, render, screen, waitFor } from '@testing-library/react-native';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server as SocketServer } from 'socket.io';
import LeadsScreen from '../app/leads';

describe('live leads feed integration', () => {
  let httpServer: ReturnType<typeof createServer>;
  let socketServer: SocketServer;
  let socketUrl: string;

  beforeAll(async () => {
    httpServer = createServer((_request, response) => {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ leads: [] }));
    });
    socketServer = new SocketServer(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;
    socketUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => socketServer.close(() => resolve()));
  });

  it('renders a lead pushed through a real Socket.io connection', async () => {
    render(<LeadsScreen socketUrl={socketUrl} />);

    await waitFor(() => expect(screen.getByText('LIVE')).toBeTruthy(), {
      timeout: 3000,
    });

    await act(async () => {
      socketServer.emit('new-lead', {
        id: 'integration-lead-1',
        full_name: 'Live Integration Lead',
        email: 'live@example.com',
        phone_number: '+15551234567',
      });
    });

    await waitFor(() =>
      expect(screen.getByText('Live Integration Lead')).toBeTruthy(),
    );
    expect(screen.getByText('live@example.com')).toBeTruthy();
    expect(screen.getByText('+15551234567')).toBeTruthy();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
  });
});