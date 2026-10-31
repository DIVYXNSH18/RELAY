// Package filter implements the core Relay relevance engine.
//
// The engine analyses a raw git-style unified diff and classifies it into one
// of three significance tiers:
//
//   - High     — breaking or structurally significant change; surfaced immediately
//   - Medium   — meaningful but non-breaking; surfaced as ambient context
//   - Suppress — cosmetic (whitespace / comments); silently discarded
//
// Design notes:
//
//   - All compiled regexes are package-level vars so they are compiled exactly
//     once at program start, not on every request.
//   - Filter.Analyse is stateless and goroutine-safe; the Filter struct itself
//     carries no mutable state.
//   - Detection is intentionally heuristic (regex-based) and tuned for the
//     most common languages used in a hackathon (TypeScript, Go, Python, Java).
//   - Rules are checked in strict priority order: High before Medium before
//     generic Medium fallback. The first matching rule wins.
package filter

import (
	"fmt"
	"regexp"
	"strings"

	"relay-backend/internal/models"
)

// ─── Compiled regex patterns ──────────────────────────────────────────────────
//
// All regexes operate on individual diff content lines (the text that follows
// the leading '+' or '-' character), NOT on the raw diff text.

var (
	// ── High-significance: function / type signatures ──────────────────────
	// Matches common function/class declaration keywords across languages.
	funcSignatureRe = regexp.MustCompile(
		`(?i)\b(func|function|def|method|class|interface|struct|enum|type\s+\w+\s+(?:struct|interface))\b.*[(<]`,
	)

	// ── High-significance: error-handling constructs ───────────────────────
	// Matches try/catch/throw/panic/recover and idiomatic Go error checks.
	errorHandlingRe = regexp.MustCompile(
		`(?i)\b(catch|except|rescue|panic|recover|throw|throws|raise|handleError|onError)\b|err\s*!=\s*nil`,
	)

	// ── Medium-significance: import / dependency changes ───────────────────
	importRe = regexp.MustCompile(
		`(?i)^\s*(import|require|use\s+\w|from\s+\S+\s+import|#include)\b`,
	)

	// ── Medium-significance: environment / config access ──────────────────
	envConfigRe = regexp.MustCompile(
		`(?i)\b(os\.Getenv|process\.env|dotenv|viper\.|config\[|Settings\.|\.env)\b`,
	)

	// ── Suppress: comment-only lines ──────────────────────────────────────
	commentLineRe = regexp.MustCompile(`^\s*(//|#|/\*|\*|<!--|--)`)

	// ── Suppress: blank / whitespace-only lines ───────────────────────────
	blankLineRe = regexp.MustCompile(`^\s*$`)
)

// ─── Filter ───────────────────────────────────────────────────────────────────

// Filter analyses raw unified diffs and assigns relevance metadata.
// It is safe to use concurrently and holds no mutable state.
type Filter struct{}

// New returns a ready-to-use Filter.
func New() *Filter { return &Filter{} }

// FilterResult is the output of a single Filter.Analyse call.
type FilterResult struct {
	Significance models.Significance
	Summary      string
	TargetRoles  []models.Role
	DiffSnippet  string
}

// Analyse processes rawDiff and returns a FilterResult.
// filePath is used only for generating human-readable summaries.
// This method is safe to call concurrently.
func (f *Filter) Analyse(filePath, rawDiff string) FilterResult {
	added, removed := extractDiffLines(rawDiff)

	// Guard: nothing to analyse.
	if len(added) == 0 && len(removed) == 0 {
		return FilterResult{
			Significance: models.SignificanceSuppress,
			Summary:      "No diff content detected",
		}
	}

	// Guard: all changes are cosmetic → suppress.
	allChanged := concat(added, removed)
	if allCosmetic(allChanged) {
		return FilterResult{
			Significance: models.SignificanceSuppress,
			Summary:      "Cosmetic change (whitespace or comments only)",
		}
	}

	short := shortPath(filePath)

	// ── Priority 1: High – function / type signature changed ────────────────
	if anyMatch(funcSignatureRe, allChanged) && len(added) > 0 && len(removed) > 0 {
		snippet := firstN(matchingLines(funcSignatureRe, added), 3)
		if snippet == "" {
			snippet = firstN(added, 3)
		}
		return FilterResult{
			Significance: models.SignificanceHigh,
			Summary:      fmt.Sprintf("Function/type signature changed in %s", short),
			TargetRoles:  []models.Role{models.RoleDebugger, models.RoleDeployer},
			DiffSnippet:  snippet,
		}
	}

	// ── Priority 2: High – new function / type added ─────────────────────────
	if anyMatch(funcSignatureRe, added) && !anyMatch(funcSignatureRe, removed) {
		snippet := firstN(matchingLines(funcSignatureRe, added), 3)
		return FilterResult{
			Significance: models.SignificanceHigh,
			Summary:      fmt.Sprintf("New function or type added in %s", short),
			TargetRoles:  []models.Role{models.RoleDebugger},
			DiffSnippet:  snippet,
		}
	}

	// ── Priority 3: High – error-handling block touched ──────────────────────
	if anyMatch(errorHandlingRe, allChanged) {
		snippet := firstN(matchingLines(errorHandlingRe, added), 3)
		if snippet == "" {
			snippet = firstN(added, 3)
		}
		return FilterResult{
			Significance: models.SignificanceHigh,
			Summary:      fmt.Sprintf("Error handling modified in %s", short),
			TargetRoles:  []models.Role{models.RoleDebugger},
			DiffSnippet:  snippet,
		}
	}

	// ── Priority 4: Medium – new import or dependency ─────────────────────────
	if anyMatch(importRe, added) {
		snippet := firstN(matchingLines(importRe, added), 3)
		return FilterResult{
			Significance: models.SignificanceMedium,
			Summary:      fmt.Sprintf("New dependency or import added in %s", short),
			TargetRoles:  []models.Role{models.RoleDeployer},
			DiffSnippet:  snippet,
		}
	}

	// ── Priority 5: Medium – environment / config access ─────────────────────
	if anyMatch(envConfigRe, added) {
		snippet := firstN(matchingLines(envConfigRe, added), 3)
		return FilterResult{
			Significance: models.SignificanceMedium,
			Summary:      fmt.Sprintf("Environment or config access changed in %s", short),
			TargetRoles:  []models.Role{models.RoleDeployer, models.RoleDebugger},
			DiffSnippet:  snippet,
		}
	}

	// ── Fallback: Medium – generic logic change ───────────────────────────────
	return FilterResult{
		Significance: models.SignificanceMedium,
		Summary:      fmt.Sprintf("Logic change in %s", short),
		TargetRoles:  []models.Role{models.RoleDebugger},
		DiffSnippet:  firstN(added, 3),
	}
}

// extractDiffLines parses a raw unified diff into added (+) and removed (-) line slices,
// ignoring git header lines like "+++" and "---".
func extractDiffLines(rawDiff string) (added []string, removed []string) {
	lines := strings.Split(rawDiff, "\n")
	for _, l := range lines {
		l = strings.TrimRight(l, "\r")
		if strings.HasPrefix(l, "+++") || strings.HasPrefix(l, "---") {
			continue
		}
		if strings.HasPrefix(l, "+") {
			added = append(added, strings.TrimPrefix(l, "+"))
		} else if strings.HasPrefix(l, "-") {
			removed = append(removed, strings.TrimPrefix(l, "-"))
		}
	}
	return added, removed
}

// anyMatch returns true if re matches at least one element in lines.
func anyMatch(re *regexp.Regexp, lines []string) bool {
	for _, l := range lines {
		if re.MatchString(l) {
			return true
		}
	}
	return false
}

// matchingLines returns the subset of lines that match re.
func matchingLines(re *regexp.Regexp, lines []string) []string {
	out := make([]string, 0, len(lines))
	for _, l := range lines {
		if re.MatchString(l) {
			out = append(out, l)
		}
	}
	return out
}

// allCosmetic returns true when every line in lines is blank or a comment.
func allCosmetic(lines []string) bool {
	if len(lines) == 0 {
		return true
	}
	for _, l := range lines {
		if blankLineRe.MatchString(l) {
			continue
		}
		if commentLineRe.MatchString(l) {
			continue
		}
		return false
	}
	return true
}

// firstN joins at most n elements of lines with newlines into a single string.
func firstN(lines []string, n int) string {
	if n > len(lines) {
		n = len(lines)
	}
	return strings.Join(lines[:n], "\n")
}

// concat returns a new slice containing all elements from a followed by b.
// It intentionally allocates a new backing array to avoid aliasing.
func concat(a, b []string) []string {
	out := make([]string, 0, len(a)+len(b))
	out = append(out, a...)
	out = append(out, b...)
	return out
}

// shortPath returns at most the last two path components for compact display.
// e.g. "src/auth/login.ts" → "auth/login.ts"
func shortPath(path string) string {
	parts := strings.FieldsFunc(path, func(r rune) bool {
		return r == '/' || r == '\\'
	})
	switch {
	case len(parts) >= 2:
		return parts[len(parts)-2] + "/" + parts[len(parts)-1]
	case len(parts) == 1:
		return parts[0]
	default:
		return path
	}
}
