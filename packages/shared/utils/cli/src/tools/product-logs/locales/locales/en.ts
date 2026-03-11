/**
 * Product Logs English Strings
 *
 * @module
 */

import type { ProductLogsStrings } from '@/cli/tools/product-logs/locales/schema';

/** English strings for product-logs. */
export const en: ProductLogsStrings = {
  name: 'product-logs',
  description: 'Tail live logs from Cloudflare Workers',

  flags: {
    product: 'Specify which product to tail logs from',
    env: 'Target environment (development, staging, production, feature/<branch>)',
    service: 'Product service layer to tail (api, app, status, assets, marketing)',
    format: 'Output format (json, pretty)',
    statusFilter: 'Filter by invocation status (ok, error, canceled). Repeatable',
    headerFilter: 'Filter by request header (key:value format). Repeatable',
    methodFilter: 'Filter by HTTP method (GET, POST, etc.). Repeatable',
    samplingRate: 'Fraction of requests to sample (0 to 1)',
    search: 'Filter logs by text substring match',
    ipFilter: 'Filter by client IP address ("self" for current machine). Repeatable',
    versionId: 'Tail logs from a specific Worker version deployment',
    wranglerDebug: 'Enable wrangler debug logging output',
  },

  examples: [
    {
      command: '{pmTool} product-logs --product=myapp',
      description: 'Tail API logs (default service)',
    },
    {
      command: '{pmTool} product-logs --product=myapp --service=status',
      description: 'Tail status page Worker logs',
    },
    {
      command: '{pmTool} product-logs -p myapp --format=json',
      description: 'JSON output for piping to jq',
    },
    {
      command: '{pmTool} product-logs -p myapp --status=error',
      description: 'Show only error responses',
    },
    {
      command: '{pmTool} product-logs -p myapp --method=POST --method=PUT',
      description: 'Filter to mutation requests',
    },
    {
      command: '{pmTool} product-logs -p myapp --search="timeout"',
      description: 'Search for timeout messages',
    },
    {
      command: '{pmTool} product-logs -p myapp --sampling-rate=0.1',
      description: 'Sample 10% of requests',
    },
    {
      command: '{pmTool} product-logs -p myapp --ip=self',
      description: 'Show only requests from this machine',
    },
    {
      command: '{pmTool} product-logs -p myapp --env=production --header="Authorization:Bearer"',
      description: 'Filter by header in production',
    },
  ],

  exitCodes: [
    { code: 0, description: 'Logs stopped gracefully' },
    { code: 1, description: 'Failed to start log tail or Wrangler error' },
    { code: 2, description: 'Invalid command usage or arguments' },
    { code: 3, description: 'Unexpected fatal error' },
    { code: 130, description: 'Interrupted - received SIGINT (Ctrl+C)' },
  ],

  header: 'Log Tail',
  tailingLogs: 'Tailing logs for {product}/{service} ({env})',
  noProducts: 'No products found',
  multipleProducts: 'Multiple products found — specify one with --product=<name>',
  availableProducts: 'Available: {products}',
  projectNotFound: 'Product "{name}" not found',
  serviceNotFound: 'Service "{service}" not found in product "{product}"',
  availableServices: 'Available services: {services}',
  pressCtrlC: 'Press Ctrl+C to stop',
  errorWranglerFailed: 'Wrangler exited with code {code}',
};
