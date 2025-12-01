#!/usr/bin/env bash
set -e

echo "Starting FastAPI backend on 0.0.0.0:8000..."
python3 -m uvicorn api.simple_main:app --host 0.0.0.0 --port 8000 &

# Give the API a moment to start
sleep 2

echo "Starting Next.js frontend on port ${PORT:-3000}..."
export PORT="${PORT:-3000}"
npm run start


