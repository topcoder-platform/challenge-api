# Use the base image with Node.js
FROM node:14.21.2-bullseye

# Copy the current directory into the Docker image
COPY . /challenge-api

# Set working directory for future use
WORKDIR /challenge-api

# Install the dependencies from package.json
RUN yarn install

CMD yarn start