FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables necesarias en tiempo de build para Next.js
ARG NEXT_PUBLIC_AUTH_URL=http://localhost:3001
ARG NEXT_PUBLIC_PERFILES_URL=http://localhost:3002
ARG NEXT_PUBLIC_VACANTES_URL=http://localhost:3003

ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_PERFILES_URL=$NEXT_PUBLIC_PERFILES_URL
ENV NEXT_PUBLIC_VACANTES_URL=$NEXT_PUBLIC_VACANTES_URL

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]