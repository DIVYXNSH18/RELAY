// Package api contains all HTTP middleware for the Relay backend.
//
// Middleware is applied in the following order (outermost first):
//  1. recoveryMiddleware  — catches panics, logs stack traces, returns 500
//  2. loggingMiddleware   — logs every request with method, path, status, latency
//  3. corsMiddleware      — adds CORS headers, handles preflight OPTIONS
//  4. bodySizeMiddleware  — rejects oversized request bodies before handlers run
package api

import (
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"
)

// ─── Recovery ─────────────────────────────────────────────────────────────────

// recoveryMiddleware catches any panic that propagates up from a handler,
// logs the stack trace, and writes a plain-text 500 response.
// This ensures a single panicking handler never takes down the entire server.
func recoveryMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					logger.Error("panic recovered in HTTP handler",
						"panic_value", rec,
						"method", r.Method,
						"path", r.URL.Path,
						"stack", string(debug.Stack()),
					)
					http.Error(w,
						http.StatusText(http.StatusInternalServerError),
						http.StatusInternalServerError,
					)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

// ─── Logging ──────────────────────────────────────────────────────────────────

// loggingMiddleware emits a structured log line for every HTTP request,
// capturing method, path, status code, and wall-clock latency in milliseconds.
func loggingMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rw := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

			next.ServeHTTP(rw, r)

			logger.Info("http",
				"method", r.Method,
				"path", r.URL.Path,
				"status", rw.status,
				"latency_ms", time.Since(start).Milliseconds(),
				"remote_addr", r.RemoteAddr,
			)
		})
	}
}

// statusRecorder wraps http.ResponseWriter to capture the status code after
// WriteHeader is called, since it cannot be read back from the interface.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (sr *statusRecorder) WriteHeader(code int) {
	sr.status = code
	sr.ResponseWriter.WriteHeader(code)
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

// corsMiddleware adds CORS response headers and handles preflight OPTIONS
// requests. In prototype mode, allowedOrigins is ["*"] which opens access
// to any origin. Tighten this list before any public deployment.
func corsMiddleware(allowedOrigins []string) func(http.Handler) http.Handler {
	// Build a set for O(1) origin lookup.
	wildcard := false
	set := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		if o == "*" {
			wildcard = true
		}
		set[o] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			_, allowed := set[origin]

			if wildcard || allowed {
				// For wildcard we echo the actual origin so credentials work.
				if origin == "" {
					origin = "*"
				}
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")
				w.Header().Set("Access-Control-Max-Age", "86400")
			}

			// Respond immediately to preflight without calling downstream handlers.
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// ─── Body size limiter ────────────────────────────────────────────────────────

// bodySizeMiddleware wraps the request body with an io.LimitedReader so that
// handlers never have to deal with arbitrarily large payloads. Requests that
// exceed maxBytes are truncated; the JSON decoder in the handler will then
// return an error, which surfaces as a 400 Bad Request.
func bodySizeMiddleware(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			next.ServeHTTP(w, r)
		})
	}
}
