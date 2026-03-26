import { Elysia } from 'elysia';
import { compression } from 'elysia-compress';

const app = new Elysia()
  .use(
    compression({
      threshold: 1024, // Minimum response size in bytes to compress
      disableByHeader: true, // Allow clients to disable compression via 'x-no-compression' header
      TTL: 3600, // Cache compressed responses for 1 hour
      compressStream: true, // Enable compression for Server-Sent Events (SSE)
      encodings: ['br', 'gzip', 'deflate'], // Preferred compression algorithms
      brotliOptions: {
        params: {
          [Bun.constants.BROTLI_PARAM_MODE]: Bun.constants.BROTLI_MODE_TEXT,
          [Bun.constants.BROTLI_PARAM_QUALITY]: 4,
        },
      },
      zlibOptions: {
        level: 6,
      },
    })
  )
  .get('/', () => ({ message: 'Hello, compressed world!' }))
  .listen(3000);
