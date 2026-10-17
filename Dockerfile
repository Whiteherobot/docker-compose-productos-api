FROM node:22-alpine

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Primero las dependencias, para que Docker reutilice esta capa si solo cambia el código.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

# node directo (no npm start) para que SIGTERM llegue al proceso.
CMD ["node", "src/servidor.js"]
