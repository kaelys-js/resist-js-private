import type { ExecResult, Env } from './types.js';

const DEFAULT_EXEC_SERVER_URL = 'http://127.0.0.1:9898';

/**
 * Create an exec function that calls the exec server via HTTP.
 * Returns undefined if the exec server is not available or not configured.
 *
 * Requires env.EXEC_SECRET to authenticate with the exec server.
 * Optionally uses env.EXEC_SERVER_URL to override the default localhost URL.
 */
export async function createExecClient(env: Env): Promise<((command: string) => Promise<ExecResult>) | undefined> {
  const serverUrl = (env.EXEC_SERVER_URL as string) || DEFAULT_EXEC_SERVER_URL;
  const secret = env.EXEC_SECRET as string | undefined;

  // No secret configured - can't authenticate
  if (!secret) {
    console.log('[exec] No EXEC_SECRET configured, exec disabled');
    return undefined;
  }

  // Check if exec server is available
  try {
    const healthCheck = await fetch(`${serverUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });

    if (!healthCheck.ok) {
      console.log(`[exec] Exec server not healthy: ${healthCheck.status}`);
      return undefined;
    }

    console.log(`[exec] Connected to exec server at ${serverUrl}`);
  } catch (err) {
    console.log(`[exec] Exec server not reachable at ${serverUrl}`);
    return undefined;
  }

  // Return exec function that calls the server with auth
  return async (command: string): Promise<ExecResult> => {
    try {
      const response = await fetch(`${serverUrl}/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`,
        },
        body: JSON.stringify({ command, timeout: 30000 }),
      });

      if (response.status === 401) {
        return {
          stdout: '',
          stderr: 'Exec server auth failed - check EXEC_SECRET',
          exitCode: 1,
        };
      }

      if (!response.ok) {
        const error = await response.text();
        return {
          stdout: '',
          stderr: `Exec server error: ${error}`,
          exitCode: 1,
        };
      }

      return (await response.json()) as ExecResult;
    } catch (error) {
      return {
        stdout: '',
        stderr: `Failed to reach exec server: ${error}`,
        exitCode: 1,
      };
    }
  };
}
