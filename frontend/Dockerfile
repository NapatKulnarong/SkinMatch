# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG BACKEND_URL
ENV BACKEND_URL=${BACKEND_URL}

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# Run stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app ./

ENV BACKEND_URL=${BACKEND_URL}

EXPOSE 3000

CMD ["npm", "start"]
