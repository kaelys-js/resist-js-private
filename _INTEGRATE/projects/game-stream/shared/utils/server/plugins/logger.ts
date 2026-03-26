import { Elysia } from 'elysia';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerPluginOptions {
  level?: LogLevel;
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  filter?: (request: Request) => boolean;
}

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export const loggerPlugin = ({
  level = 'info',
  logRequestBody = true,
  logResponseBody = true,
  filter
}: LoggerPluginOptions = {}) => (app: Elysia) =>
  app
    .onRequest(async ({ request, store }) => {
      const shouldLog = !filter || filter(request);
      if (!shouldLog) return;

      const { method, url } = request;
      const timestamp = new Date().toISOString();

      const logLevel = 'info';

      const log = (...args: any[]) => {
        if (levels[logLevel] >= levels[level]) {
          console.log(`[${timestamp}] [${logLevel.toUpperCase()}]`, ...args);
        }
      };

      store._log = log;

      const body = logRequestBody && method !== 'GET' ? await request.clone().text() : undefined;

      log(`${method} ${url}`);
      if (body) log(`→ Body:`, body);
    })
    .afterHandle(({ request, response, store }) => {
      const log = store._log;
      if (!log) return;

      const timestamp = new Date().toISOString();
      const contentType = response?.headers?.get('content-type') || '';
      const isJSON = contentType.includes('application/json');

      log(`← Status: ${response?.status ?? 200}`);

      if (logResponseBody && isJSON && typeof response?.body === 'object') {
        log('← Response:', JSON.stringify(response.body, null, 2));
      }

      return response;
    });
