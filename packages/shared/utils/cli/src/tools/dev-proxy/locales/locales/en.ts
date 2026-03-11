/**
 * Dev Proxy English Strings
 *
 * @module
 */

import type { DevProxyStrings } from '@/cli/tools/dev-proxy/locales/schema';

/** English strings for dev proxy. */
export const en: DevProxyStrings = {
  name: 'dev-proxy',
  description: 'Start the local HTTPS development proxy',

  flags: {
    expose: 'Expose services to the local network (bind to 0.0.0.0)',
    tunnel: 'Expose services to the internet via Cloudflare Tunnel',
  },

  examples: [
    { command: '{pmTool} dev-proxy', description: 'Start the local HTTPS proxy' },
    {
      command: '{pmTool} dev-proxy --dry-run',
      description: 'Preview configuration without starting',
    },
    { command: '{pmTool} dev-proxy --expose', description: 'Expose services to the local network' },
    { command: '{pmTool} dev-proxy --tunnel', description: 'Expose services to the internet' },
  ],

  exitCodes: [
    { code: 0, description: 'Proxy stopped gracefully' },
    { code: 1, description: 'Proxy failed to start or encountered an error' },
    { code: 2, description: 'Invalid command usage or arguments' },
    { code: 3, description: 'Unexpected fatal error' },
    { code: 130, description: 'Interrupted - received SIGINT (Ctrl+C)' },
  ],

  header: 'Development Proxy',
  productsDiscovered: '{count, plural, one {# product} other {# products}} discovered:',
  noProductsFound: 'No products found in {productsDir}/',
  noProductsHint: 'Without products, only admin, docs, and QA proxies will be available',
  createProductHint: 'Create one with: {pmTool} product-create',
  globalServices: 'Global Services',
  startingProxy: 'Starting Caddy reverse proxy',
  generatingCerts: 'Generating local HTTPS certificates',
  certsCreated: 'Certificates created for {count} domains',
  errorCaddyStart: 'Failed to start Caddy',
  errorCaddyHintInstall: 'Ensure Caddy is installed and in your PATH',
  errorCaddyHintPort: 'Check if another process is using port 80 or 443 (e.g., lsof -i :80)',
  errorCaddyExit: 'Caddy exited unexpectedly',
  errorCaddyExitCode: 'Exit code: {code}',
  errorCaddyHintLogs: 'Check Caddy logs above for details',
  errorCaddyHintCommon: 'Common causes: port conflicts or invalid Caddyfile syntax',
  // Dry-run mode
  dryRunPrefix: '[DRY RUN]',
  dryRunSkipCaddy: 'Would start Caddy proxy (skipped)',
  dryRunWouldGenerate: 'Would generate certificates for {count} domains',
  // Config watching
  watchingConfig: 'Watching {configFilename} for changes...',
  configChanged: '{configFilename} changed, restarting...',
  restarting: 'Restarting proxy with new configuration...',
  // Expose mode
  exposeWarning:
    'Network exposure enabled — services are accessible from other devices on your network',
  exposeIps: 'LAN addresses: {ips}',
  exposeHostname: 'mDNS hostname: {hostname}',
  exposeNoIps: 'No LAN IP addresses found — network exposure may not work',
  // Auto-install
  installingPrerequisites: 'Installing missing prerequisites: {tools}',
  prerequisiteInstalled: '{tool} installed successfully',
  // Tunnel mode
  tunnelStarting: 'Starting Cloudflare tunnels...',
  tunnelFailed: 'Failed to start tunnel for {service}',
  tunnelDryRun:
    'Would start {count, plural, one {# Cloudflare tunnel} other {# Cloudflare tunnels}} (skipped)',
  tunnelNamed: 'Named tunnel {name} → {url}',

  // Health checks
  serviceHealthy: '✓ healthy',
  serviceUnhealthy: '✗ unreachable',
  healthCheckRunning: 'Checking service health...',
};
