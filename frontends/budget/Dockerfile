# Use Deno runtime image
FROM denoland/deno:latest AS base

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}
ENV DENO_NODE_MODULES_DIR=auto

# Set working directory
WORKDIR /app

# Copy deno.json and deno.lock
COPY deno.json deno.lock ./

# Copy entry points used by deno cache (must exist before caching)
COPY vite.config.ts main.tsx utils.ts ./

# Initialize dependency cache
RUN deno cache --lock=deno.lock --node-modules-dir=auto vite.config.ts

# Download and install all dependencies
RUN deno install --allow-scripts --node-modules-dir=auto

# Ensure all Fresh dependencies are cached
RUN deno cache --lock=deno.lock --node-modules-dir=auto @fresh/core @fresh/plugin-vite

# Copy source code
COPY . .

# Build the application
RUN deno task build

# Production stage
FROM denoland/deno:latest AS runtime

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}
ENV DENO_NODE_MODULES_DIR=auto

WORKDIR /app

# Copy built application
COPY --from=base /app/_fresh ./_fresh
COPY --from=base /app/deno.json ./deno.json
COPY --from=base /app/deno.lock ./deno.lock
COPY --from=base /app/main.tsx ./main.tsx
COPY --from=base /app/utils.ts ./utils.ts

# Copy runtime dependencies
COPY --from=base /app/node_modules ./node_modules

# Expose port
EXPOSE 8000

# Run the application
CMD ["deno", "serve", "-A", "_fresh/server.js"]
