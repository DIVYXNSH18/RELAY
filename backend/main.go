// relay-backend: Context Engine for the Relay hackathon project.
//
// This binary starts the HTTP server, wires all dependencies together, and
// handles graceful shutdown. It is intentionally the only file that imports
// from all internal packages so dependency direction stays clear.
//
// Startup sequence:
//  1. Load configuration (env vars → Config struct)
//  2. Initialise structured JSON logger
//  3. Construct Store, Filter, and the HTTP router
//  4. Start the HTTP server in a background goroutine
//  5. Block until SIGINT or SIGTERM is received
//  6. Attempt a 10-second graceful drain; hard-exit on timeout
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"relay-backend/config"
	"relay-backend/internal/api"
	"relay-backend/internal/filter"
	"relay-backend/internal/store"
)

func main() {
	// ── Structured logger ─────────────────────────────────────────────────────
	// JSON format is machine-parseable and works well with log aggregators.
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))
	slog.SetDefault(logger) // Make it the process-wide default for stray slog calls.

	// ── Configuration ────────────────────────────────────────────────────────
	cfg := config.Load()

	// ── Dependencies ──────────────────────────────────────────────────────────
	st := store.New()
	f := filter.New()
	router := api.NewRouter(st, f, logger, cfg)

	// ── HTTP Server ───────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:    cfg.ServerAddr,
		Handler: router,

		// These timeouts prevent slow-loris and resource-exhaustion attacks:
		ReadHeaderTimeout: 5 * time.Second,  // time to read request headers
		ReadTimeout:       15 * time.Second, // total time to read request body
		WriteTimeout:      15 * time.Second, // time to write the response
		IdleTimeout:       60 * time.Second, // keep-alive idle connection TTL

		MaxHeaderBytes: 1 << 20, // 1 MB header limit
	}

	// Run the server in a separate goroutine so main can block on signals.
	serverErr := make(chan error, 1)
	go func() {
		logger.Info("relay backend listening", "addr", cfg.ServerAddr)
		if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
	}()

	// ── Graceful shutdown ────────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErr:
		// The server failed before we received a shutdown signal.
		logger.Error("server terminated unexpectedly", "error", err)
		os.Exit(1)

	case sig := <-quit:
		logger.Info("shutdown signal received", "signal", sig.String())
	}

	// Give in-flight requests up to 10 seconds to finish.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
		os.Exit(1)
	}

	logger.Info("server shutdown complete — goodbye 👋")
}
