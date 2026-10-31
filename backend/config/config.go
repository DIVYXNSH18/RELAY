// Package config loads application configuration from environment variables
// and exposes a single, immutable Config struct to the rest of the application.
package config

import (
	"os"
	"time"
)

// Config holds all application-level configuration.
// All fields are populated once at startup and treated as read-only thereafter.
type Config struct {
	// ServerAddr is the TCP address the HTTP server listens on (e.g. ":8080").
	ServerAddr string

	// MaxBodyBytes is the maximum size of an inbound HTTP request body.
	// Requests that exceed this limit are rejected with 413.
	MaxBodyBytes int64

	// DigestTTL is how long a digest is considered "fresh". Not enforced yet,
	// but available for future eviction logic.
	DigestTTL time.Duration

	// AllowedOrigins lists the CORS origins the server will accept.
	// Use ["*"] to allow all origins (prototype default).
	AllowedOrigins []string
}

// Load reads configuration from environment variables and fills in sensible
// defaults for any that are absent. It never returns nil.
func Load() *Config {
	addr := os.Getenv("SERVER_ADDR")
	if addr == "" {
		addr = ":8080"
	}

	return &Config{
		ServerAddr:     addr,
		MaxBodyBytes:   512 * 1024, // 512 KB — generous but bounded
		DigestTTL:      1 * time.Hour,
		AllowedOrigins: []string{"*"}, // Open for prototype; tighten in production
	}
}
