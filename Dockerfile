# -- Build Stage --
FROM oven/bun:1.2-alpine AS build
WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock* ./

# Install ALL dependencies (including devDependencies for testing/build)
RUN bun install --frozen-lockfile

# Copy the rest of the source
COPY . .

# -- Final Stage --
FROM oven/bun:1.2-alpine AS release
WORKDIR /app

# Copy production dependencies only
COPY --from=build /app/package.json /app/bun.lock* ./
RUN bun install --production --frozen-lockfile

# Copy the source code
COPY --from=build /app/src ./src

# Create logs and config directories with correct permissions
RUN mkdir -p /logs /config && \
    chown -R bun:bun /logs /config /app

# Use the non-root user 'bun' provided by the base image
USER bun

EXPOSE 8481

# Persist logs and config
VOLUME ["/logs", "/config"]

# Start the application
CMD ["bun", "run", "src/main.ts", "/logs", "/config/config.yaml"]
