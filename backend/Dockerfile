FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install  #changed from npm ci --only=production to npm install --omit=dev #changed to install all dependencies for development
#COPY . .
COPY ./src ./src
EXPOSE ${BACKEND_PORT}
CMD ["node", "src/server.js"]
