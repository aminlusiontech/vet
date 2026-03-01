# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app/frontend

# Copy package files and install dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy the rest of the application code
COPY . .

# Create the production build
RUN yarn build 

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built React files to the Nginx public directory
COPY --from=build /app/frontend/build /usr/share/nginx/html

# Copy the custom Nginx configuration for client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Start the Nginx server
CMD ["nginx", "-g", "daemon off;"]