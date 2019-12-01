FROM node:12-alpine as build
# Create app directory
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN apk add --no-cache git cmake gcc g++ make bash clang ninja wget tiff-dev libpng-dev jasper-dev libwebp-dev linux-headers
RUN yarn
COPY . .

FROM node:12-alpine as runner
# Bundle app source
COPY --from=build /usr/src/app /usr/src/app
WORKDIR /usr/src/app
EXPOSE 14444
CMD [ "yarn", "start" ]
