# Official Playwright image: Node.js + browsers + system dependencies
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src

ENV HEADLESS=true
CMD ["node", "src/index.js"]
