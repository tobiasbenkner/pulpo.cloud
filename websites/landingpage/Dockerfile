# Build Go binary with embedded frontend
FROM golang:1.25-alpine AS build
WORKDIR /app
COPY pb/go.mod pb/go.sum ./
RUN go mod download
COPY pb/*.go ./
COPY pb/migrations/ ./migrations/
COPY dist/ ./pb_public/
RUN CGO_ENABLED=0 go build -o pocketbase .

# Minimal runtime
FROM alpine:3.21
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /app/pocketbase .
EXPOSE 8090
CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]
