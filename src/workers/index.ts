// worker.js
import { parentPort } from 'worker_threads';

parentPort?.on('message', async (params: any) => {
  while (true) {
    console.log("you got it")
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
});
