import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { setSocketServer } from './services/socketEmitter';

export function initializeSocket(server: HttpServer): Server {
  const socketServer = new Server(server, { cors: { origin: '*' } });
  setSocketServer(socketServer);
  return socketServer;
}