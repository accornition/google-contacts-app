FROM node:14-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY server/package*.json ./
COPY server/webpack.config.js ./
COPY build_server.sh ./

COPY entrypoint.sh /

# RUN npm install
RUN /entrypoint.sh
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY ./server .

RUN ./build_server.sh

EXPOSE 3000
CMD [ "npm", "run", "serve" ]