FROM node:14.5-slim

RUN apt update && apt upgrade
RUN apt install -y curl
WORKDIR /usr/src
RUN mkdir /usr/src/data
RUN mkdir /usr/src/src
COPY src /usr/src/src
COPY data /usr/src/data
COPY package.json /usr/src
RUN npm install
WORKDIR /usr/src/

EXPOSE 8080:8080
#CMD tail -f /dev/null
CMD [ "node", "./src/app.js" ]
