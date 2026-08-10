FROM node:20-slim AS build
WORKDIR /app

# NEXT_PUBLIC_ vars are baked in at build time — must be declared as ARG
# Default = production backend URL (used when Render doesn't pass it as a build arg)
ARG NEXT_PUBLIC_API_BASE_URL=https://hr-intelligence-sys.onrender.com
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/next.config.js ./next.config.js

# Render injects $PORT at runtime — use shell form so it expands correctly
CMD sh -c "node_modules/.bin/next start -p ${PORT:-3000}"
