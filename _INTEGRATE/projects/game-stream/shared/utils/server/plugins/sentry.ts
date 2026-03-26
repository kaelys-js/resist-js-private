export const sentryPlugin = () => (app: Elysia) =>
    app.onRequest(({ store }) => {
        store.captureException = (err: unknown) => {
            Sentry.captureException(err, {
                tags: {
                    request_id: store.requestId
                }
            });
        };
    });