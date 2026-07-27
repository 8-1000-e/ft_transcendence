# ---------- build the SPA ----------
FROM node:22-bookworm AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Same-origin API base; the reverse proxy forwards /api to the backend.
# Vite inlines these at build time.
ARG VITE_API_URL=/api
ARG VITE_PUSHER_KEY=
ARG VITE_PUSHER_CLUSTER=eu
ENV VITE_API_URL=$VITE_API_URL \
    VITE_PUSHER_KEY=$VITE_PUSHER_KEY \
    VITE_PUSHER_CLUSTER=$VITE_PUSHER_CLUSTER
RUN npm run build

# ---------- serve + reverse proxy ----------
FROM nginx:1.27-alpine AS serve
# Self-signed cert for local HTTPS. A subjectAltName is REQUIRED by modern
# browsers — a CN-only cert is rejected as invalid (ERR_CERT_COMMON_NAME_INVALID)
# instead of showing the normal, bypassable self-signed warning.
RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/certs \
    && openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
        -keyout /etc/nginx/certs/selfsigned.key \
        -out /etc/nginx/certs/selfsigned.crt \
        -subj "/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1" \
        -addext "basicConstraints=critical,CA:FALSE" \
        -addext "keyUsage=critical,digitalSignature,keyEncipherment" \
        -addext "extendedKeyUsage=serverAuth"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443
