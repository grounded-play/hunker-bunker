# Backend-only image for the Steam trusted server (auth, leaderboards,
# inventory, store). Does not build or serve the game client — that ships
# inside the Electron/Steam depot, not this container.
FROM node:26-slim

WORKDIR /app

COPY package.json package-lock.json ./
# steamworks.js is a client-side (Electron main process) native dependency
# the server never imports; --omit=dev keeps devDependencies (vite,
# electron, electron-builder, etc.) out of the deployed image.
RUN npm ci --omit=dev

COPY server ./server
# Client modules the server shares (the chat filter is applied on both
# sides). Keep this list in step with server/deployImageContents.test.js,
# which fails when the server imports a file the image does not contain.
COPY src/chatFilter.js ./src/chatFilter.js
COPY src/data/chatFilterTerms.js ./src/data/chatFilterTerms.js
COPY src/roomDressingPersistence.js ./src/roomDressingPersistence.js
# Season rules: the backend runs the same SeasonPassManager the client does
# (server/seasonLedger.js), and its reward labels pull the item catalog.
COPY src/seasonPass.js ./src/seasonPass.js
COPY src/data/seasonOneConfig.js ./src/data/seasonOneConfig.js
COPY src/data/seasonOneCatalog.js ./src/data/seasonOneCatalog.js
COPY src/data/steamItemCatalog.js ./src/data/steamItemCatalog.js
COPY src/data/armoryPreviews.js ./src/data/armoryPreviews.js
COPY src/i18nCatalog.js ./src/i18nCatalog.js
COPY src/i18n.js ./src/i18n.js
COPY src/locales ./src/locales

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/index.js"]
