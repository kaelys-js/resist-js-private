# Stage 1: Build with Bun
FROM oven/bun:1.1.0 as builder

WORKDIR /app

# Optimize dependency layer caching
COPY bun.lockb package.json ./
RUN bun install

# Copy remaining source code
COPY . .

# Build application
RUN bun build server.ts --outfile=dist/server.js --release

# Stage 2: Minimal runtime image
FROM debian:bullseye-slim

# Create a minimal non-root user
RUN adduser --disabled-password --gecos '' --no-create-home --home /nonexistent bunuser

# Set safe environment variables
ENV HOME=/nonexistent
ENV PATH="/usr/bin:$PATH"
WORKDIR /app

# Copy built app and Bun binary with ownership
COPY --from=builder --chown=bunuser:bunuser /app/dist /app
COPY --from=builder /usr/local/bin/bun /usr/bin/bun

# Use non-root user for security
USER bunuser

# Set shell for inline CMD execution
SHELL ["/bin/sh", "-c"]

# Inject precise container start time in milliseconds and launch the app
ENTRYPOINT export CONTAINER_START_TIME=$(date +%s%3N) && exec "$@"
CMD ["bun", "server.js"]
