# Use the base image with Node.js
FROM node:latest

# Copy the current directory into the Docker image
COPY . /challenge-api

# Set working directory for future use
WORKDIR /challenge-api

# Install the dependencies from package.json
RUN npm install
RUN npm run lint
RUN npm run lint:fix
#RUN npm run build
#RUN npm run test

CMD npm start