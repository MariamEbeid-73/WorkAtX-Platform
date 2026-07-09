# ─── Stage 1: install deps (cached unless package-lock changes) ──────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy lockfiles only — this layer is cached until dependencies change
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --prefer-offline; else npm install --prefer-offline; fi

# ─── Stage 2: build (cached unless source changes) ───────────────────────────
FROM deps AS build
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
COPY . .
RUN npm run build

# ─── Stage 3: serve with nginx (lean runtime) ────────────────────────────────
FROM nginx:1.25-alpine AS runtime

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Vite outputs to dist
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
