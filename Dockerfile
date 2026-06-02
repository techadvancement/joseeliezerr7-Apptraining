# Stage 1 — build Expo Web bundle
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ git brotli gzip

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG EXPO_PUBLIC_SUPABASE_URL=""
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY=""
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY

RUN npx expo export --platform web --output-dir dist

# Copy PWA assets (manifest, icons, sw) into dist
RUN cp -r public/. dist/

# Inject PWA meta tags + preconnect + splash + SW registration + dark bg CSS into index.html
COPY scripts/inject-html.js /tmp/inject-html.js
RUN node /tmp/inject-html.js dist/index.html

# Pre-compress static assets at max quality — served by gzip_static / brotli_static at runtime.
RUN find dist -type f \( \
      -name "*.js" -o -name "*.css" -o -name "*.svg" -o \
      -name "*.json" -o -name "*.html" -o -name "*.txt" -o \
      -name "*.webmanifest" -o -name "*.xml" -o -name "*.map" \
    \) -size +1k -print0 | xargs -0 -P4 -I{} sh -c 'gzip -9 -k -f "{}"; brotli -q 11 -k -f "{}"'

# Stage 2 — nginx with brotli + gzip_static built in
FROM fholzer/nginx-brotli:v1.28.3

RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
