# Production Dockerfile for Hasnain Digital Marketer Full-Stack Portfolio
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY server.js ./
COPY index.html ./
COPY style.css ./
COPY script.js ./
COPY robots.txt ./
COPY sitemap.xml ./
COPY images/ ./images/
COPY lib/ ./lib/
COPY api/ ./api/

# Cloud Run defaults to 8080
EXPOSE 8080

# Start production server
CMD ["node", "server.js"]
