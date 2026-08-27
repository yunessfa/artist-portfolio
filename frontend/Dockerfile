# syntax=docker/dockerfile:1
# Builds the public site into static assets. Nginx serves the output.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_SITE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_SITE_URL=$VITE_SITE_URL

RUN npm run build

# The runtime stage only carries the built files; nginx mounts them.
FROM alpine:3.20 AS dist
WORKDIR /dist
COPY --from=build /app/dist /dist
CMD ["sh", "-c", "echo 'frontend build artifacts ready in /dist' && sleep infinity"]
