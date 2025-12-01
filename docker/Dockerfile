## Stage 1: Build Next.js frontend
FROM node:20-bookworm AS frontend-builder

WORKDIR /app

# Install build tools needed for native modules like sqlite3
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install frontend dependencies
# - Skip root-level lifecycle scripts (to avoid running `postinstall` that expects a host Python env)
# - Then explicitly rebuild sqlite3 from source so its native binding matches the container architecture
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts && npm rebuild sqlite3 --build-from-source

# Copy full source (needed for Next.js build)
COPY . .

# Verify critical files exist (debugging)
RUN ls -la src/lib/trpc-provider.tsx src/lib/custom-nodes.ts src/lib/trpc.ts tsconfig.json next.config.js || true

# Build Next.js app
RUN npm run build

## Stage 2: Runtime - Python (FastAPI) + Next.js + Playwright + Tesseract
FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install Tesseract OCR (Playwright runtime deps are handled by the base image)
RUN apt-get update && \
    apt-get install -y tesseract-ocr && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY api/requirements.txt ./api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt && \
    python -m playwright install --with-deps chromium firefox webkit

# Copy application source
COPY . .

# Copy full Node.js toolchain from builder (Node 20)
COPY --from=frontend-builder /usr/local /usr/local

# Copy built Next.js artifacts and node_modules from builder
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/node_modules ./node_modules
COPY --from=frontend-builder /app/package.json ./package.json
COPY --from=frontend-builder /app/next.config.js ./next.config.js

# Ensure workflow directories exist and install sqlite-vec for linux/amd64
RUN mkdir -p /tmp/workflow_files /tmp/workflow_dbs
COPY docker/sqlite3/vec0-x86_64.so /tmp/workflow_files/vec0.so

# Copy start script and fix line endings (Windows CRLF -> Unix LF)
COPY docker/start.sh /start.sh
RUN sed -i 's/\r$//' /start.sh && chmod +x /start.sh

EXPOSE 3000
EXPOSE 8000

CMD ["/start.sh"]


