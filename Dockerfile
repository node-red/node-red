FROM --platform=linux/amd64 node:23-alpine

WORKDIR /app

# Install git, Python, build dependencies, and Linux headers
RUN apk add --no-cache git python3 make g++ linux-headers

# Clone the repository
COPY . .

# Install dependencies
RUN npm install

# Build the application
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
