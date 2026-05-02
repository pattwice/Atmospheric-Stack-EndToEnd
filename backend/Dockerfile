FROM oven/bun:1 as base
WORKDIR /usr/src/app

COPY package.json ./
RUN bun install
COPY . .

USER bun
EXPOSE 8000/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
