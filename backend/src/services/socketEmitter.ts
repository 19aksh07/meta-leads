import type { Server } from 'socket.io';

let socketServer: Pick<Server, 'emit'> | null = null;

export function setSocketServer(server: Pick<Server, 'emit'> | null): void {
  socketServer = server;
}

export function emitNewLead(lead: Record<string, unknown>): void {
  if (!socketServer) {
    console.warn('Socket.io server is not configured; lead event was not emitted');
    return;
  }

  socketServer.emit('new-lead', lead);
}

export function emitTestLeadsChanged(): void {
  if (!socketServer) {
    console.warn(
      'Socket.io server is not configured; test-lead change was not emitted',
    );
    return;
  }

  socketServer.emit('test-leads-changed');
}