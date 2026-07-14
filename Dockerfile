# Backend-only image for the Steam trusted server (auth, leaderboards,
# inventory, store). Does not build or serve the game client — that ships
# inside the Electron/Steam depot, not this container.
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
# steamworks.js is a client-side (Electron main process) native dependency
# the server never imports; --omit=dev keeps devDependencies (vite,
# electron, electron-builder, etc.) out of the deployed image.
RUN npm ci --omit=dev

COPY server ./server

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "server/index.js"]
