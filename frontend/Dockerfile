# Deno Fresh Frontend Dockerfile
FROM denoland/deno:2.2.0

WORKDIR /app

# Cache dependencies (best-effort warmup)
COPY deno.json ./

# Copy source code
COPY . .

# Build the application
RUN deno task build

EXPOSE 8000

# Run the production server
CMD ["deno", "task", "start"]
