// Package api wires all routes and middleware together into a single http.Handler.
package api

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"relay-backend/config"
	"relay-backend/internal/filter"
	"relay-backend/internal/store"
)

// NewRouter constructs the fully wired HTTP handler for the Relay API.
// It is the single point that knows about routing and middleware ordering.
func NewRouter(s *store.Store, f *filter.Filter, logger *slog.Logger, cfg *config.Config) http.Handler {
	h := newHandlers(s, f, logger)

	r := chi.NewRouter()

	// ── Global middleware stack (evaluated outermost-first) ──────────────────
	//
	// 1. recoveryMiddleware — must be first so it catches panics from all others.
	// 2. loggingMiddleware  — wraps the handler to capture the final status code.
	// 3. corsMiddleware     — handles preflight and injects CORS headers.
	// 4. bodySizeMiddleware — truncates oversized bodies before parsing begins.
	// 5. chi RequestID      — injects X-Request-Id header for request tracing.
	// 6. chi RealIP         — populates RemoteAddr from X-Forwarded-For / X-Real-IP.
	r.Use(recoveryMiddleware(logger))
	r.Use(loggingMiddleware(logger))
	r.Use(corsMiddleware(cfg.AllowedOrigins))
	r.Use(bodySizeMiddleware(cfg.MaxBodyBytes))
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)

	// ── Root & Health ────────────────────────────────────────────────────────
	r.Get("/", h.root)
	r.Get("/health", h.health)

	// ── API v1 ───────────────────────────────────────────────────────────────
	r.Route("/api/v1", func(r chi.Router) {
		// IDE extension → backend: push a diff event after each file save.
		r.Post("/events", h.createEvent)

		// Expo app → backend: pull the latest relevant digest for a given role (one-shot).
		r.Get("/digest", h.getDigest)

		// Expo app → backend: SSE stream — holds connection open, pushes digests in real-time.
		r.Get("/stream", h.streamDigests)

		// Team sessions: register/update role or list active team members.
		r.Get("/sessions", h.listSessions)
		r.Post("/sessions", h.upsertSession)

		// Expo app → backend: get full workspace history (events & digests)
		r.Get("/events", h.listEvents)
		r.Get("/digests", h.listDigests)

		// Expo app → backend: terminal logs and system status
		r.Get("/terminal/logs", h.terminalLogs)

		// Expo app → backend: submit a voice command (phone → IDE relay).
		r.Post("/cmd", h.receiveCommand)

		// IDE extension → backend: poll for a pending voice command (consume-once).
		r.Get("/pending-cmd", h.pendingCommand)
	})

	// ── 404 catch-all ────────────────────────────────────────────────────────
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		h.writeError(w, http.StatusNotFound, "NOT_FOUND",
			"the requested route does not exist")
	})

	r.MethodNotAllowed(func(w http.ResponseWriter, r *http.Request) {
		h.writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED",
			"method "+r.Method+" is not allowed on this route")
	})

	return r
}
