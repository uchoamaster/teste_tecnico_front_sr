FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY nest-cli.json tsconfig*.json ./
COPY src ./src

RUN npm run prisma:generate && npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && npm run seed && npm run start:prod"]