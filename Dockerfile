# Stage 1 — build Expo Web bundle
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ git

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

# Inject PWA meta tags + SW registration + dark background CSS into index.html
RUN node -e "const fs=require('fs');const p='dist/index.html';let h=fs.readFileSync(p,'utf8');\
const tags='\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\" />\n    <link rel=\"manifest\" href=\"/manifest.webmanifest\" />\n    <meta name=\"theme-color\" content=\"#0B0F1A\" />\n    <meta name=\"mobile-web-app-capable\" content=\"yes\" />\n    <meta name=\"apple-mobile-web-app-capable\" content=\"yes\" />\n    <meta name=\"apple-mobile-web-app-status-bar-style\" content=\"default\" />\n    <meta name=\"apple-mobile-web-app-title\" content=\"Training\" />\n    <link rel=\"icon\" type=\"image/png\" sizes=\"32x32\" href=\"/favicon-32.png\" />\n    <link rel=\"icon\" type=\"image/png\" sizes=\"16x16\" href=\"/favicon-16.png\" />\n    <link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png\" />\n    <style>html,body,#root{background-color:#0B0F1A !important;color-scheme:dark;}</style>\n  ';\
h=h.replace(/<meta name=\"viewport\"[^>]*\\/>/,'');\
h=h.replace('</head>',tags+'</head>');\
const sw='<script>if(\"serviceWorker\" in navigator){window.addEventListener(\"load\",function(){navigator.serviceWorker.register(\"/sw.js\").catch(function(){})});}</script>';\
h=h.replace('</body>',sw+'</body>');\
fs.writeFileSync(p,h);console.log('PWA meta tags injected');"

# Stage 2 — nginx serving the static SPA
FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
