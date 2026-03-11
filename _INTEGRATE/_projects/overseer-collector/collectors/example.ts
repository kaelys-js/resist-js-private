import { register } from '../src/registry.js';
import type { CollectorDefinition } from '../src/types.js';
import { DEFAULT_RETRY_POLICY } from '../src/types.js';

interface ExampleData {
  timestamp: string;
  message: string;
  randomValue: number;
}

const exampleCollector: CollectorDefinition<ExampleData> = {
  id: 'example',
  schedule: {
    type: 'cron',
    expression: '*/5 * * * *', // Every 5 minutes
  },
  mode: 'both', // Runs in local and cloud
  retry: DEFAULT_RETRY_POLICY,

  async collect(ctx) {
    // Example collector that just returns some data
    // Replace this with actual collection logic

    const data: ExampleData = {
      timestamp: ctx.now.toISOString(),
      message: 'Hello from example collector',
      randomValue: Math.random(),
    };

    return data;
  },
};

register(exampleCollector);
