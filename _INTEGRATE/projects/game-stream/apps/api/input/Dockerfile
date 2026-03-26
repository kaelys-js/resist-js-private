FROM oven/bun:slim

# Workdir
WORKDIR /app

# Copy only package files first for better layer caching
COPY bun.lockb package.json ./

# Install dependencies first (before copying code)
RUN bun install

# Copy source files
COPY . .

# Default command
CMD ["bun", "run", "start"]
