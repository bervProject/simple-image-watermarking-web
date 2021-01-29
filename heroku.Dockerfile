FROM node:lts-alpine as build
# Create app directory
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn
COPY . .
RUN yarn build

FROM node:lts-alpine as runtime
COPY --from=build /usr/src/app /usr/src/app
WORKDIR /usr/src/app
CMD [ "yarn", "start" ]
