// Package store provides a thread-safe, in-memory state store for the Relay
// context engine. All exported methods are safe for concurrent use.
//
// Design decisions:
//   - sync.RWMutex is used so reads (LatestDigestForRole, GetSession) can
//     proceed concurrently, with writes holding an exclusive lock.
//   - eventIDs is a separate ordered slice so we can traverse events newest-first
//     without sorting the map on every read.
//   - Subscribers form a lightweight pub/sub bus: each SSE connection registers
//     a Subscriber, which holds a buffered channel. SaveDigest notifies all
//     matching subscribers with a non-blocking send (drops if full).
//   - No external database is required for the prototype; the entire state
//     lives in process memory.
package store

import (
	"fmt"
	"sync"
	"time"

	"relay-backend/internal/models"
)

// PendingCommand is a voice command sent from the Expo app that the VS Code
// extension will consume on its next poll.
type PendingCommand struct {
	ID            string         `json:"id"`
	TargetUser    string         `json:"target_user"`
	Command       string         `json:"command"`
	Intent        map[string]any `json:"intent"`
	DigestEventID string         `json:"digest_event_id"`
	CreatedAt     time.Time      `json:"created_at"`
}

// Subscriber is a real-time listener registered by an active SSE connection.
// It receives non-blocking pushes whenever a matching digest is stored.
type Subscriber struct {
	Role models.Role
	// Ch receives digests pushed for this role. Buffer prevents blocking SaveDigest.
	Ch chan *models.RelevanceDigest
	// id is an opaque identifier used for O(n) removal from the subscribers slice.
	id uint64
}

// Store is the central, thread-safe state repository for Relay.
type Store struct {
	mu sync.RWMutex

	// events stores every raw WorkspaceEvent received, keyed by its ID.
	events map[string]*models.WorkspaceEvent

	// eventIDs records event IDs in insertion order (oldest → newest).
	// This lets LatestDigestForRole scan in reverse cheaply.
	eventIDs []string

	// digests stores the RelevanceDigest produced for each event, keyed by event ID.
	// Every event has exactly one digest entry (even suppressed ones).
	digests map[string]*models.RelevanceDigest

	// sessions stores the active RoleSession for each user, keyed by username.
	sessions map[string]*models.RoleSession

	// subscribers is the list of active SSE listeners.
	subscribers []*Subscriber
	// nextSubID is a monotonically-increasing counter for subscriber IDs.
	nextSubID uint64

	// pendingCmds stores at most one pending command per user (consume-once).
	// Key: target username.
	pendingCmds map[string]*PendingCommand
}

// New allocates and returns an empty, ready-to-use Store.
func New() *Store {
	s := &Store{
		events:      make(map[string]*models.WorkspaceEvent),
		eventIDs:    make([]string, 0, 64),
		digests:     make(map[string]*models.RelevanceDigest),
		sessions:    make(map[string]*models.RoleSession),
		subscribers: make([]*Subscriber, 0, 8),
		pendingCmds: make(map[string]*PendingCommand),
	}
	s.seedDefaultData()
	return s
}

func (s *Store) seedDefaultData() {
	now := time.Now().UTC()
	s.sessions["Divyansh"] = &models.RoleSession{
		User:      "Divyansh",
		Role:      models.RoleCoder,
		CreatedAt: now.Add(-30 * time.Minute),
		UpdatedAt: now.Add(-2 * time.Minute),
	}
	s.sessions["Sarah"] = &models.RoleSession{
		User:      "Sarah",
		Role:      models.RoleDebugger,
		CreatedAt: now.Add(-25 * time.Minute),
		UpdatedAt: now.Add(-5 * time.Minute),
	}
	s.sessions["Alex"] = &models.RoleSession{
		User:      "Alex",
		Role:      models.RoleDeployer,
		CreatedAt: now.Add(-20 * time.Minute),
		UpdatedAt: now.Add(-10 * time.Minute),
	}

	ev1 := &models.WorkspaceEvent{
		ID:          "ev-init-1",
		SourceUser:  "Divyansh",
		FilePath:    "internal/auth/jwt.go",
		RawDiff:     "@@ -14,3 +14,5 @@\n-func ValidateToken(token string) bool {\n+func ValidateToken(token string) (*UserClaims, error) {\n+    claims, err := parseJWT(token)\n+    if err != nil { return nil, err }\n+    return claims, nil\n+}",
		Timestamp:   now.Add(-4 * time.Minute),
		ProcessedAt: now.Add(-4 * time.Minute),
	}
	d1 := &models.RelevanceDigest{
		EventID:      ev1.ID,
		Summary:      "Function signature changed: ValidateToken now returns (*UserClaims, error) instead of bool",
		Significance: models.SignificanceHigh,
		TargetRoles:  []models.Role{models.RoleCoder, models.RoleDebugger},
		DiffSnippet:  "-func ValidateToken(token string) bool\n+func ValidateToken(token string) (*UserClaims, error)",
		FilePath:     ev1.FilePath,
		SourceUser:   ev1.SourceUser,
		CreatedAt:    now.Add(-4 * time.Minute),
	}

	ev2 := &models.WorkspaceEvent{
		ID:          "ev-init-2",
		SourceUser:  "Sarah",
		FilePath:    "internal/filter/relevance.go",
		RawDiff:     "@@ -45,2 +45,4 @@\n+func ExtractStructChanges(diff string) []string {\n+    return structRegex.FindAllString(diff, -1)\n+}",
		Timestamp:   now.Add(-12 * time.Minute),
		ProcessedAt: now.Add(-12 * time.Minute),
	}
	d2 := &models.RelevanceDigest{
		EventID:      ev2.ID,
		Summary:      "Added ExtractStructChanges regex extractor for Go AST diff analysis",
		Significance: models.SignificanceHigh,
		TargetRoles:  []models.Role{models.RoleCoder, models.RoleDebugger},
		DiffSnippet:  "+func ExtractStructChanges(diff string) []string",
		FilePath:     ev2.FilePath,
		SourceUser:   ev2.SourceUser,
		CreatedAt:    now.Add(-12 * time.Minute),
	}

	s.events[ev2.ID] = ev2
	s.eventIDs = append(s.eventIDs, ev2.ID)
	s.digests[ev2.ID] = d2

	s.events[ev1.ID] = ev1
	s.eventIDs = append(s.eventIDs, ev1.ID)
	s.digests[ev1.ID] = d1
}

// ─── Events ──────────────────────────────────────────────────────────────────

// SaveEvent persists a workspace event. Returns an error if event is nil,
// its ID is empty, or an event with the same ID already exists.
func (s *Store) SaveEvent(event *models.WorkspaceEvent) error {
	if event == nil {
		return fmt.Errorf("store.SaveEvent: event must not be nil")
	}
	if event.ID == "" {
		return fmt.Errorf("store.SaveEvent: event ID must not be empty")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.events[event.ID]; exists {
		return fmt.Errorf("store.SaveEvent: duplicate event ID %q", event.ID)
	}
	s.events[event.ID] = event
	s.eventIDs = append(s.eventIDs, event.ID)
	return nil
}

// ─── Digests ─────────────────────────────────────────────────────────────────

// SaveDigest stores the RelevanceDigest associated with an event and notifies
// any active SSE subscribers whose role matches the digest's target roles.
func (s *Store) SaveDigest(digest *models.RelevanceDigest) error {
	if digest == nil {
		return fmt.Errorf("store.SaveDigest: digest must not be nil")
	}
	if digest.EventID == "" {
		return fmt.Errorf("store.SaveDigest: digest EventID must not be empty")
	}

	s.mu.Lock()
	s.digests[digest.EventID] = digest
	// Notify subscribers while still holding the write lock to avoid TOCTOU.
	// Sends are non-blocking: a slow subscriber simply misses the event rather
	// than blocking every other writer.
	if digest.Significance != models.SignificanceSuppress {
		s.notifySubscribersLocked(digest)
	}
	s.mu.Unlock()
	return nil
}

// notifySubscribersLocked sends digest to every subscriber whose role appears
// in digest.TargetRoles. MUST be called with s.mu write-locked.
func (s *Store) notifySubscribersLocked(digest *models.RelevanceDigest) {
	for _, sub := range s.subscribers {
		for _, role := range digest.TargetRoles {
			if role == sub.Role {
				select {
				case sub.Ch <- digest:
				default: // buffer full — drop rather than block
				}
				break
			}
		}
	}
}

// LatestDigestForRole returns the most recent, non-suppressed RelevanceDigest
// that targets the given role. It returns (nil, nil) when no matching digest
// exists; errors are only returned for invalid input.
func (s *Store) LatestDigestForRole(role models.Role) (*models.RelevanceDigest, error) {
	if !role.IsValid() {
		return nil, fmt.Errorf("store.LatestDigestForRole: invalid role %q", role)
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	// Walk eventIDs newest-first to find the most recent applicable digest.
	for i := len(s.eventIDs) - 1; i >= 0; i-- {
		id := s.eventIDs[i]
		digest, ok := s.digests[id]
		if !ok {
			continue
		}
		if digest.Significance == models.SignificanceSuppress {
			continue
		}
		for _, r := range digest.TargetRoles {
			if r == role {
				return digest, nil
			}
		}
	}
	return nil, nil
}

// ListDigests returns all stored digests in newest-first order.
func (s *Store) ListDigests() []*models.RelevanceDigest {
	s.mu.RLock()
	defer s.mu.RUnlock()

	list := make([]*models.RelevanceDigest, 0, len(s.eventIDs))
	for i := len(s.eventIDs) - 1; i >= 0; i-- {
		id := s.eventIDs[i]
		if d, ok := s.digests[id]; ok {
			list = append(list, d)
		}
	}
	return list
}

// ListEvents returns all raw workspace events in newest-first order.
func (s *Store) ListEvents() []*models.WorkspaceEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	list := make([]*models.WorkspaceEvent, 0, len(s.eventIDs))
	for i := len(s.eventIDs) - 1; i >= 0; i-- {
		id := s.eventIDs[i]
		if e, ok := s.events[id]; ok {
			list = append(list, e)
		}
	}
	return list
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

// UpsertSession creates a new RoleSession or updates the role of an existing one.
// It always returns the current session state (never nil).
func (s *Store) UpsertSession(req *models.CreateSessionRequest) *models.RoleSession {
	now := time.Now().UTC()

	s.mu.Lock()
	defer s.mu.Unlock()

	if existing, ok := s.sessions[req.User]; ok {
		existing.Role = req.Role
		existing.UpdatedAt = now
		return existing
	}

	session := &models.RoleSession{
		User:      req.User,
		Role:      req.Role,
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.sessions[req.User] = session
	return session
}

// GetSession returns the active session for the given user, or nil if none exists.
func (s *Store) GetSession(user string) *models.RoleSession {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.sessions[user]
}

// ListSessions returns a snapshot list of all active sessions.
func (s *Store) ListSessions() []*models.RoleSession {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]*models.RoleSession, 0, len(s.sessions))
	for _, sess := range s.sessions {
		list = append(list, sess)
	}
	return list
}

// ─── SSE Pub/Sub ─────────────────────────────────────────────────────────────

// Subscribe registers a new SSE subscriber for the given role.
// The returned Subscriber.Ch will receive digests as they are stored.
// Callers MUST call Unsubscribe when the SSE connection closes.
func (s *Store) Subscribe(role models.Role) (*Subscriber, error) {
	if !role.IsValid() {
		return nil, fmt.Errorf("store.Subscribe: invalid role %q", role)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.nextSubID++
	sub := &Subscriber{
		Role: role,
		Ch:   make(chan *models.RelevanceDigest, 8),
		id:   s.nextSubID,
	}
	s.subscribers = append(s.subscribers, sub)
	return sub, nil
}

// Unsubscribe removes sub from the active subscriber list and closes its channel.
// Safe to call multiple times (idempotent after first call).
func (s *Store) Unsubscribe(sub *Subscriber) {
	if sub == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, s2 := range s.subscribers {
		if s2.id == sub.id {
			s.subscribers = append(s.subscribers[:i], s.subscribers[i+1:]...)
			close(sub.Ch)
			return
		}
	}
}

// ─── Observability ───────────────────────────────────────────────────────────

// Stats returns a snapshot of store sizes. Safe to call at any time.
// Useful for the /health endpoint and debugging.
func (s *Store) Stats() map[string]int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return map[string]int{
		"events":      len(s.events),
		"digests":     len(s.digests),
		"sessions":    len(s.sessions),
		"subscribers": len(s.subscribers),
	}
}

// ─── Pending Commands ─────────────────────────────────────────────────────────

// UpsertPendingCommand stores a command for a user, overwriting any previous
// unread command (last-write-wins). The IDE extension will consume it on the
// next poll cycle.
func (s *Store) UpsertPendingCommand(user string, cmd *PendingCommand) {
	if user == "" || cmd == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pendingCmds[user] = cmd
}

// ConsumeCommand atomically retrieves and deletes the pending command for user.
// Returns nil if no command is waiting. This is consume-once semantics — the
// IDE extension gets exactly one delivery per voice command.
func (s *Store) ConsumeCommand(user string) *PendingCommand {
	if user == "" {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	cmd, ok := s.pendingCmds[user]
	if !ok {
		return nil
	}
	delete(s.pendingCmds, user)
	return cmd
}
