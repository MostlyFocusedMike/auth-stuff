# this is where docker gets the image from
FROM node:10.16.3

# code executes in the command line INSIDE the docker container
RUN mkdir -p /usr/app/

# set your working directory so that . is now /usr/src/app
WORKDIR /usr/app

# this copies everything you need into from local into your docker container to start
COPY ./src ./src/
RUN mkdir -p ./sessions/
COPY ./db.json ./
COPY ./package*.json ./
COPY ./nodemon.json ./

RUN npm install -g nodemon
RUN npm i

CMD ["node", "./src/backend/server.js"]