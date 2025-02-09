# Use a base image with Deno installed
FROM denoland/deno:alpine-2.1.9

# Set the working directory
WORKDIR /app

# Copy the project files into the working directory
COPY . .

# Install projects dependencies
RUN deno install

# Run the Deno app using the start task
CMD ["task", "start"]