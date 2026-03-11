export function errorHandler({ showStack = false } = {}) {
    return (app: Elysia) =>
        app
            .onError(({ code, error, set }) => {
                const statusMap: Record<string, number> = {
                    VALIDATION: 400,
                    NOT_FOUND: 404,
                    INTERNAL_SERVER_ERROR: 500,
                    UNAUTHORIZED: 401,
                    FORBIDDEN: 403
                };

                const defaultMessageMap: Record<number, string> = {
                    400: 'Bad Request',
                    401: 'Unauthorized',
                    403: 'Forbidden',
                    404: 'Not Found',
                    409: 'Conflict',
                    422: 'Unprocessable Entity',
                    429: 'Too Many Requests',
                    500: 'Internal Server Error'
                };

                const status = statusMap[code] ?? 500;
                set.status = status;

                return {
                    error: defaultMessageMap[status] ?? 'Error',
                    detail: showStack ? error?.message : undefined
                };
            })
            .trace(({ set }) => {
                set.status = 404;
                return {
                    error: 'Not Found',
                    detail: 'The requested route does not exist'
                };
            });
}