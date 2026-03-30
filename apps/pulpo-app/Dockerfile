FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
ARG VERSION=dev
ARG COMMIT=none
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -ldflags "-s -w -X main.version=${VERSION} -X main.commit=${COMMIT}" -o pulpo-app .

FROM alpine:3.21
RUN apk add --no-cache ca-certificates && \
    adduser -D -h /home/pulpo pulpo && \
    mkdir -p /pb_data && chown pulpo:pulpo /pb_data
COPY --from=builder /app/pulpo-app /usr/local/bin/pulpo-app
USER pulpo
EXPOSE 8090
VOLUME /pb_data
CMD ["pulpo-app", "serve", "--http=0.0.0.0:8090"]
