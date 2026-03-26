import { rateLimit, DefaultContext } from 'elysia-rate-limit';

// Custom error class for rate limit violations
class RateLimitError extends Error {
    constructor(
        public message: string = 'Too many requests',
        public detail: string = '',
        public status: number = 429
    ) {
        super(message);
    }
}

// Custom key generator function
const customKeyGenerator = (request: Request): string => {
    // Example: Use 'X-Client-ID' header or fallback to IP address
    return request.headers.get('X-Client-ID') || request.headers.get('CF-Connecting-IP') || 'anonymous';
};

const rateLimit = rateLimit({
    duration: 60_000, // 1 minute window
    max: 100, // Max 100 requests per window
    errorResponse: new RateLimitError(), // Custom error response
    context: new DefaultContext(10_000), // LRU cache with 10,000 entries
    headers: true, // Enable RateLimit headers
    skip: (request, key) => {
        // Skip rate limiting for health check endpoint
        return new URL(request.url).pathname === '/health';
    },
    injectServer: () => {
        // Optional: Inject server instance if needed
        return undefined;
    },
    scoping: 'global', // Apply globally
    generator: customKeyGenerator, // Custom key generator
})
)