# Build stage
FROM node:20-bullseye-slim AS builder

WORKDIR /app

ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# Run stage
FROM node:20-bullseye-slim

WORKDIR /app

COPY --from=builder /app ./

ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}

EXPOSE 3000

CMD ["npm", "start"]

RUN apt-get update && apt-get install -y libzbar0 && rm -rf /var/lib/apt/lists/*


