# Image du serveur de jeu : construit le client puis sert le jeu et la partie en réseau sur un seul port.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY src ./src
COPY tsconfig.json ./
# les comptes et sauvegardes vivent dans /data : à monter sur un volume pour ne rien perdre
VOLUME /data
EXPOSE 8080
CMD ["npx", "tsx", "src/server/main.ts"]
