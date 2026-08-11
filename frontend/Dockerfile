FROM node:20-slim AS build
WORKDIR /app

# Backend URL — baked in so rewrites work even without a Render env var at runtime
ARG BACKEND_URL=https://talentbase-ai-platform.onrender.com
ARG NEXT_PUBLIC_API_BASE_URL=https://talentbase-ai-platform.onrender.com
ENV BACKEND_URL=$BACKEND_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
# Pass BACKEND_URL through to runtime so next.config.js rewrites resolve correctly
ENV BACKEND_URL=https://talentbase-ai-platform.onrender.com
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/next.config.js ./next.config.js

# Render injects $PORT at runtime — use shell form so it expands correctly
CMD sh -c "node_modules/.bin/next start -p ${PORT:-3000}"
