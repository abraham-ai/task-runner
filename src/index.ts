import { Worker } from 'worker_threads';
import server from './server.js';

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

const port = +server.config.API_PORT;
const host = server.config.API_HOST;
await server.listen({ host, port });

const worker = new Worker('./src/workers/index.ts');

// Send a message to the worker
worker.postMessage('start');

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () =>
    server.close().then((err) => {
      console.log(`close application on ${signal}`);
      worker.terminate();
      process.exit(err ? 1 : 0);
    }),
  );
}
