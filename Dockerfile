FROM node:14.5.0

WORKDIR /usr/src/
RUN mkdir data_handlers
RUN mkdir docs

COPY package*.json ../
RUN npm install
COPY src/data_handlers/NOAA.js ./data_handlers
COPY src/docs ./docs
COPY src/app.js .
EXPOSE 8080
CMD [ "node", "app.js" ]
