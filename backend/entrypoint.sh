#!/bin/bash
set -e

echo "Initializing SentinelNet backend..."

# Initialize database
echo "Setting up database..."
python -c "from backend.db.session import init_db; init_db()"

# Seed database with demo data
echo "Seeding database with demo organizations..."
python -m backend.db.seed

echo "Backend is ready!"

# Start the application
exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
