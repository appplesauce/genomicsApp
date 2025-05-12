# frontend
FROM node:20 AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build


# backend and include frontend output
FROM node:20

WORKDIR /app

# Install backend deps
COPY backend/package*.json ./
RUN npm ci

# Copy backend source code
COPY backend/ .

# Copy built frontend into /app/public
COPY --from=frontend-builder /app/frontend/dist ./public

# Expose backend port
EXPOSE 5000

# Start the backend server
CMD ["node", "server.js"]
