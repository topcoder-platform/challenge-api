# Use the base image with Node.js
FROM node:12.22.12-buster

# Copy the current directory into the Docker image
COPY . /challenge-api

# Set working directory for future use
WORKDIR /challenge-api

# Install the dependencies from package.json
RUN npm install

CMD npm start