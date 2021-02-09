FROM node:lts-alpine as build
# Create app directory
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn
COPY . .
RUN yarn build

FROM node:lts-alpine as runtime
COPY --from=build /app /app
WORKDIR /app
RUN adduser -D siwb
USER siwb
CMD [ "yarn", "start" ]
