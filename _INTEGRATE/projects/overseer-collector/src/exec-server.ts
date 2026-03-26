#!/usr/bin/env npx tsx
/**
 * Exec Server - HTTP bridge for shell command execution
 *
 * Runs locally and accepts POST /exec requests from the worker.
 * This allows the unified worker codebase to execute shell commands.
 *
 * Environment variables:
 *   EXEC_PORT   - Port to listen on (default: 9898)
 *   EXEC_SECRET - Required shared secret for authentication
 *
 * Usage: EXEC_SECRET=your-secret npm run exec
 */

import { createServer } from 'node:http';
import { exec as nodeExec } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';

const execAsync = promisify(nodeExec);

const PORT = parseInt(process.env.EXEC_PORT ?? '9898', 10);
const SECRET = process.env.EXEC_SECRET;

// Generate a random secret if not provided (for local dev convenience)
const EFFECTIVE_SECRET = SECRET || randomBytes(32).toString('hex');

if (!SECRET) {
  console.log('[exec-server] ⚠️  No EXEC_SECRET provided, generated random secret:');
  console.log(`[exec-server]    ${EFFECTIVE_SECRET}`);
  console.log('[exec-server]    Set this in your wrangler.toml or .dev.vars for the worker to connect.');
  console.log('');
}

interface ExecRequest {
  command: string;
  timeout?: number;
}

interface ExecResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// Constant-time string comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Validate bearer token
function validateAuth(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') {
    return false;
  }

  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) {
    return false;
  }

  return secureCompare(token, EFFECTIVE_SECRET);
}

async function executeCommand(command: string, timeout = 30000): Promise<ExecResponse> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout,
    });
    return {
      stdout: stdout ?? '',
      stderr: stderr ?? '',
      exitCode: 0,
    };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; code?: number; message?: string };
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? err.message ?? String(error),
      exitCode: err.code ?? 1,
    };
  }
}

const server = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check (no auth required - just confirms server is running)
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, port: PORT, auth: 'required' }));
    return;
  }

  // All other endpoints require auth
  if (!validateAuth(req as { headers: Record<string, string | string[] | undefined> })) {
    console.log('[exec-server] Unauthorized request');
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  // Execute command
  if (req.method === 'POST' && req.url === '/exec') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { command, timeout } = JSON.parse(body) as ExecRequest;

        if (!command || typeof command !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing or invalid command' }));
          return;
        }

        console.log(`[exec-server] Executing: ${command.slice(0, 100)}${command.length > 100 ? '...' : ''}`);

        const result = await executeCommand(command, timeout);

        console.log(`[exec-server] Exit code: ${result.exitCode}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error('[exec-server] Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });

    return;
  }

  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Listen on all interfaces if a secret is provided (for remote access via tunnel)
// Otherwise only localhost (for local dev)
const HOST = SECRET ? '0.0.0.0' : '127.0.0.1';

server.listen(PORT, HOST, () => {
  console.log(`[exec-server] Listening on http://${HOST}:${PORT}`);
  console.log('[exec-server] Endpoints:');
  console.log('  GET  /health - Health check (no auth)');
  console.log('  POST /exec   - Execute command (auth required)');
  if (SECRET) {
    console.log('[exec-server] Auth: Bearer token required (from EXEC_SECRET)');
    console.log('[exec-server] Binding to 0.0.0.0 for remote access');
  } else {
    console.log('[exec-server] Binding to 127.0.0.1 (localhost only)');
  }
});
