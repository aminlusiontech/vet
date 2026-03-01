FROM node:18-alpine

# Set the working directory
WORKDIR /app/socket

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --production

# Copy the rest of the application code
COPY . .

# Expose the port your socket server runs on (e.g., 4000)
EXPOSE 4000

# Start the Socket.io server
CMD ["node", "index.js"]