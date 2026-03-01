# Stage 1: Build Stage
# CHANGE THIS LINE to use the exact version 18.16.0
FROM node:18.16.0-alpine AS build

# Set the working directory
WORKDIR /app/backend

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies using Yarn
RUN yarn install --production

# Copy the rest of the application code, including the 'config' folder
COPY . .

# Stage 2: Production Stage
# CHANGE THIS LINE to use the exact version 18.16.0
FROM node:18.16.0-alpine

# Set the working directory
WORKDIR /app/backend

# Copy installed dependencies and application code
COPY --from=build /app/backend .

# Create uploads directory (will be overridden by volume mount if present)
RUN mkdir -p /app/backend/uploads

# Expose the port your Express server runs on (8000)
EXPOSE 8000

# Start the Node.js server
CMD ["node", "server.js"]