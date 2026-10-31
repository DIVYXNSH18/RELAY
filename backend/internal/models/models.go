// Package models defines the core domain types shared across the Relay backend.
// Each type that participates in request/response serialisation includes
// field-level validation via an explicit Validate() method.
package models

import "time"

// ─── Roles ───────────────────────────────────────────────────────────────────

// Role represents a team member's declared function within a Relay session.
type Role string

const (
	RoleCoder    Role = "Coder"
	RoleDebugger Role = "Debugger"
	RoleDeployer Role = "Deployer"
)

// IsValid reports whether r is a known, supported role.
func (r Role) IsValid() bool {
	switch r {
	case RoleCoder, RoleDebugger, RoleDeployer:
		return true
	}
	return false
}

// ─── Significance ─────────────────────────────────────────────────────────────

// Significance classifies how actionable a diff is for the target role(s).
type Significance string

const (
	// SignificanceHigh is assigned to breaking or structurally significant changes
	// (e.g. function signature changes, error-handling modifications).
	SignificanceHigh Significance = "High"

	// SignificanceMedium is assigned to meaningful but non-breaking changes
	// (e.g. new imports, environment config touches).
	SignificanceMedium Significance = "Medium"

	// SignificanceSuppress marks a diff as cosmetic (whitespace, comments).
	// Suppressed digests are stored for audit but never surfaced to the phone.
	SignificanceSuppress Significance = "Suppress"
)

// ─── WorkspaceEvent ──────────────────────────────────────────────────────────

// WorkspaceEvent is the raw diff payload pushed by the VS Code extension
// whenever a file is saved. It is stored verbatim before filtering.
type WorkspaceEvent struct {
	ID          string    `json:"id"`
	SourceUser  string    `json:"source_user"`
	FilePath    string    `json:"file_path"`
	RawDiff     string    `json:"raw_diff"`
	Timestamp   time.Time `json:"timestamp"`
	ProcessedAt time.Time `json:"processed_at"`
}

// CreateEventRequest is the validated inbound DTO for POST /api/v1/events.
type CreateEventRequest struct {
	SourceUser string    `json:"source_user"`
	FilePath   string    `json:"file_path"`
	RawDiff    string    `json:"raw_diff"`
	Timestamp  time.Time `json:"timestamp"`
}

// Validate returns a human-readable validation failure message, or an empty
// string when the request is well-formed.
func (r *CreateEventRequest) Validate() string {
	switch {
	case r.SourceUser == "":
		return "source_user is required"
	case len(r.SourceUser) > 128:
		return "source_user exceeds 128 characters"
	case r.FilePath == "":
		return "file_path is required"
	case len(r.FilePath) > 1024:
		return "file_path exceeds 1024 characters"
	case r.RawDiff == "":
		return "raw_diff is required"
	case len(r.RawDiff) > 128*1024:
		return "raw_diff exceeds 128 KB"
	}
	return ""
}

// ─── RelevanceDigest ─────────────────────────────────────────────────────────

// RelevanceDigest is the filtered, human-readable summary of a WorkspaceEvent.
// It is what the phone app fetches and what the IDE chat participant injects
// as context into the LLM prompt.
type RelevanceDigest struct {
	EventID      string       `json:"event_id"`
	Summary      string       `json:"summary"`
	Significance Significance `json:"significance"`
	TargetRoles  []Role       `json:"target_roles"`
	DiffSnippet  string       `json:"diff_snippet"`
	FilePath     string       `json:"file_path"`
	SourceUser   string       `json:"source_user"`
	CreatedAt    time.Time    `json:"created_at"`
}

// ─── RoleSession ─────────────────────────────────────────────────────────────

// RoleSession tracks the active role claimed by a team member.
type RoleSession struct {
	User      string    `json:"user"`
	Role      Role      `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateSessionRequest is the validated inbound DTO for POST /api/v1/sessions.
type CreateSessionRequest struct {
	User string `json:"user"`
	Role Role   `json:"role"`
}

// Validate returns a validation failure message or an empty string.
func (r *CreateSessionRequest) Validate() string {
	switch {
	case r.User == "":
		return "user is required"
	case len(r.User) > 128:
		return "user exceeds 128 characters"
	case !r.Role.IsValid():
		return "role must be one of: Coder, Debugger, Deployer"
	}
	return ""
}

// ─── API envelope types ───────────────────────────────────────────────────────

// APIError is the standard error response envelope. The Code field is a
// machine-readable constant; Message is human-readable.
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// APIResponse is the standard success response envelope wrapping any data type.
type APIResponse[T any] struct {
	Data T `json:"data"`
}
