# Use the base image with Node.js
FROM node:18.14.1-alpine3.17

# Copy the current directory into the Docker image
COPY . /challenge-api

# Set working directory for future use
WORKDIR /challenge-api

# Install the dependencies from package.json
RUN yarn install

CMD node /challenge-api/app.js
