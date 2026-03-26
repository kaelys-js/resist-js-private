import { createServer, t } from '@/shared/utils/server';
import { livekitTokenRouteHandler } from '@/shared/utils/livekit'
import { bindSchema, livekitApiKeySchema, livekitApiSecretSchema, portSchema } from '@/shared/schemas'

const schema = {
  query: t.Object({
    identity: t.String(),
    room: t.Optional(t.String())
  }, { additionalProperties: false }),
  response: {
    200: t.String(),
    /*
    201
    204
    400: bad input
    401: unauth
    403: forbid
    404: not found
    409: conflicting state
    429: rate limit
    500: uncaught
    */
  }
}

/**
 * Creates and configures the Elysia server instance.
 * 
 * This server includes:
 * - Environment variable validation
 * - Route grouping under `/token`
 * - Token generation endpoint
 * 
 * @type {!App} - Strongly typed reference to the app instance for downstream use
 */
const app = createServer({
  envSchema: {
    LIVEKIT_API_KEY: livekitApiKeySchema,
    LIVEKIT_API_SECRET: livekitApiSecretSchema,
    AUTH_API_PORT: portSchema,
    AUTH_API_BIND: bindSchema
  }
}).group('/token', (app) =>
  app
    /**
     * GET /token
     * 
     * Generates a LiveKit access token based on query parameters (identity, room).
     * Expected query: ?identity=...&room=...
     * If identity is not provided, a guest ID is generated.
     */
    .get('', livekitTokenRouteHandler, schema)

    /**
     * GET /token/refresh
     * 
     * Regenerates or refreshes a LiveKit token using the same handler.
     * Could later be split into a separate handler with different behavior.
     */
    .get('/refresh', livekitTokenRouteHandler, schema)
);

app.listen({
  port: app.store.env.AUTH_API_PORT,
  hostname: app.store.env.AUTH_API_BIND
})

/**
 * `App`.
 */
export type App = typeof app
