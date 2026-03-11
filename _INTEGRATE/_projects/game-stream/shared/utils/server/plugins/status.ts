type StrictStatusValidationOptions = {
    allowed?: number[]; // Globally allowed status codes
};

function strictStatusValidation(options: StrictStatusValidationOptions = {}) {
    const globalAllowed = options.allowed ?? [];

    return (app: Elysia) =>
        app.afterHandle(({ response, schema, set }) => {
            const schemaStatuses = schema?.response
                ? Object.keys(schema.response).map(Number)
                : [];

            const allowedStatuses = new Set([...schemaStatuses, ...globalAllowed]);

            const actualStatus = set.status ?? 200;

            if (allowedStatuses.size > 0 && !allowedStatuses.has(actualStatus)) {
                console.warn(
                    `❌ Status ${actualStatus} not defined in schema.response or allowed list`
                );
                set.status = 500;
                return {
                    error: `Status ${actualStatus} not allowed.`,
                    allowed: Array.from(allowedStatuses)
                };
            }

            return response;
        });
}