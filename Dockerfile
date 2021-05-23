FROM node:lts-alpine as build
# Create app directory
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile
COPY . .
RUN yarn build

FROM node:lts-alpine as runtime
COPY --from=build /app/dist /app/dist
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile && yarn cache clean
RUN adduser -D siwb && chown -R siwb /app
USER siwb
CMD [ "yarn", "start-linux" ]
