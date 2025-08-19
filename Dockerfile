
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY mobile/package*.json ./mobile/

# Install dependencies
RUN npm install
RUN cd client && npm install
RUN cd mobile && npm install

# Copy source code
COPY . .

# Build client
RUN cd client && npm run build

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start application
CMD ["npm", "start"]
