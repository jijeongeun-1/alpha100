FROM node:20-slim

# poppler-utils: pdftoppm(PDF→PNG) + pdftotext(텍스트 추출 fallback) 제공
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends poppler-utils && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start"]
