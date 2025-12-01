## Stage 1: Build Next.js frontend
FROM node:20-bookworm AS frontend-builder

WORKDIR /app

# Install frontend dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy full source (needed for Next.js build)
COPY . .

# Build Next.js app
RUN npm run build

## Stage 2: Runtime - Python (FastAPI) + Next.js + Playwright + Tesseract
FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install Node.js, npm, and Tesseract OCR
RUN apt-get update && \
    apt-get install -y nodejs npm tesseract-ocr && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY api/requirements.txt ./api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt && \
    python -m playwright install --with-deps chromium firefox webkit

# Copy application source
COPY . .

# Copy built Next.js artifacts and node_modules from builder
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/node_modules ./node_modules
COPY --from=frontend-builder /app/package.json ./package.json
COPY --from=frontend-builder /app/next.config.js ./next.config.js

# Ensure workflow directories exist
RUN mkdir -p /tmp/workflow_files /tmp/workflow_dbs

# Copy start script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 3000
EXPOSE 8000

CMD ["/start.sh"]


