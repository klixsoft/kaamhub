FROM node:22-alpine
RUN apk add --no-cache docker-cli docker-cli-compose
WORKDIR /updater
COPY server.mjs .
ENV NODE_ENV=production PORT=9000
EXPOSE 9000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:9000/health || exit 1
CMD ["node", "server.mjs"]
