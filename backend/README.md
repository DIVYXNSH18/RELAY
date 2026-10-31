# relay-backend

The Go context engine for the **Relay** hackathon project.

## Quick Start

`ash
# 1. Download dependencies
go mod tidy

# 2. Run the server (default port :8080)
go run .

# 3. Run all unit tests
go test ./...

# 4. Build a binary
go build -o relay-backend .
`

## Configuration

| Env var       | Default | Description                              |
|---------------|---------|------------------------------------------|
| SERVER_ADDR | :8080 | TCP address the HTTP server listens on   |

Copy .env.example to .env and export variables before running.

## API Reference

### POST /api/v1/events
Push a diff event from the VS Code extension.

### GET /api/v1/digest?role=Debugger
Pull the latest relevant digest for a given role.

### POST /api/v1/sessions
Register or update a team member's role.

### GET /health
Liveness check + store statistics.
