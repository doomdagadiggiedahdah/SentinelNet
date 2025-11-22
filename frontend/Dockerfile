# Build stage for frontend
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ .

# Build the application
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install serve to run the production build
RUN npm install -g serve

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create a simple health check script
RUN echo '#!/bin/sh\ncurl -f http://localhost:3000 || exit 1' > /healthcheck.sh && \
    chmod +x /healthcheck.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /healthcheck.sh

# Expose port
EXPOSE 3000

# Environment variable for API base URL (can be overridden at runtime)
ENV VITE_API_BASE_URL=http://localhost:8000

# Run the application
CMD ["serve", "-s", "dist", "-l", "3000"]
