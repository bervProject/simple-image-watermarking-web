FROM node:lts
# Create app directory
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN \
  apt-get update && \
  apt-get install -y build-essential git cmake && \
  rm -rf /var/lib/apt/lists/* && \
  apt-get autoremove -y --purge
RUN yarn
COPY . .
EXPOSE 8888
CMD [ "yarn", "start" ]
