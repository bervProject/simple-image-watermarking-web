FROM node:lts-alpine as build
# Create app directory
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn
RUN yarn build

FROM node:lts-alpine as runtime
WORKDIR /usr/src/app
COPY --from=build /usr/src/app .
EXPOSE 8888
CMD [ "yarn", "start" ]
