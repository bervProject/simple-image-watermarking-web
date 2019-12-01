FROM node:lts
# Create app directory
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN \
  apt-get update && \
  apt-get install -y build-essential git && \
  rm -rf /var/lib/apt/lists/* && \
  apt-get autoremove -y --purge
RUN yarn
COPY . .
CMD [ "yarn", "start" ]
