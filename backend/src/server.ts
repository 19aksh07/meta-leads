import 'dotenv/config';
import { createServer } from 'node:http';
import app from './app';
import { initializeSocket } from './socket';

const port = Number(process.env.PORT || 4000);
const server = createServer(app);

initializeSocket(server);
server.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});