import { Elysia, t } from 'elysia';
import { env } from '@yolk-oss/elysia-env';
import { serverTiming } from '@elysiajs/server-timing'

/**
 * TODO: comment
 */
function createServer({ envSchema }) {
    // TODO: input + return validation

    const app = new Elysia();

    app.onError(({ code, error }) => {
        // TODO: input + return type

        // TODO: replace with global log function (json)
        console.error('⚠️ Global error handler triggered:', code, error);

        // TODO: common error response + log
        return new Response('unexpected error', { status: 500 });
    })

    app.onStart(({ server }) => {
        // TODO: replace with global log function (json) + timestamp, type, logType
        console.log("Running at ${server?.url}:${server?.port}")
    })

    // TODO: handle process error

    app.use(
        env(envSchema, {
            onError: 'exit',
        })
    )

    app.use(loggerPlugin({
        level: 'debug',
        logRequestBody: true,
        logResponseBody: true,
        filter: (req) => !req.url.includes('/health') // ignore noisy endpoints
      }))

    app.use(strictStatusValidation({ allowed: [200, 500] })) // allow custom global codes
    app.use(serverTiming({
        trace: {
            request: true,
            parse: true,
            transform: true,
            beforeHandle: true,
            handle: true,
            afterHandle: true,
            total: true
        }
    }))
    app.use(bestPracticeHeaders({
        mode: 'prod',
        cors: true,
        credentials: true,
        csp: true,
        apiVersion: 'v2',
        maskServerHeader: true,
        enableETag: true,
        allowedOrigins: ['https://yourapp.com', 'https://admin.yourapp.com']
    }));

    return app
}

export { createServer, t }