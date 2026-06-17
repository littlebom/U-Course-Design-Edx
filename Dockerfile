# Production image for the U-CourseBuilder web app (multi-user / PostgreSQL).
# Single stage on purpose: keeps the Prisma CLI + tsx available so the container
# can run `prisma migrate deploy` + seed on startup. NODE_ENV is set at runtime
# by docker-compose (not here) so `npm ci` still installs devDeps needed to build.
FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install all deps (postinstall runs `prisma generate`)
COPY package.json package-lock.json ./
RUN npm ci

# App source + build
COPY . .
RUN npx prisma generate && npm run build

EXPOSE 3000

# On start: apply DB migrations, seed the admin (idempotent), then serve.
CMD ["sh", "-c", "npx prisma migrate deploy && (npm run db:seed || true) && npm run start -- -H 0.0.0.0 -p 3000"]
