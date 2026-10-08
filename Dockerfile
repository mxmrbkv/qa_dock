FROM alpine:latest

WORKDIR /app

# Install base dependencies if needed
# RUN apk add --no-cache bash curl

COPY . /app

CMD ["sh", "-c", "echo 'Running qa_dock container...' && tail -f /dev/null"]
