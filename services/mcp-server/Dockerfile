FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
COPY build-widgets.mjs ./
COPY widget-src/ ./widget-src/
COPY widgets/*.template.html ./widgets/
COPY widgets/debug.html ./widgets/
RUN node build-widgets.mjs
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/widgets ./widgets
EXPOSE 3001
ENV PORT=3001
CMD ["node", "dist/index.js"]
