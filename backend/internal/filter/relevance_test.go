package filter_test

import (
	"testing"

	"relay-backend/internal/filter"
	"relay-backend/internal/models"
)

// newFilter is a test helper so test bodies stay minimal.
func newFilter() *filter.Filter { return filter.New() }

// ─── High: function signature changed ────────────────────────────────────────

func TestAnalyse_FunctionSignatureChanged_TypeScript(t *testing.T) {
	diff := "-function auth(user: any) {\n+function authenticateUser(token: string) {"
	result := newFilter().Analyse("src/auth/login.ts", diff)
	assertSignificance(t, models.SignificanceHigh, result)
	assertHasRole(t, models.RoleDebugger, result)
	assertHasRole(t, models.RoleDeployer, result)
}

func TestAnalyse_FunctionSignatureChanged_Go(t *testing.T) {
	diff := "-func process(data []byte) error {\n+func process(ctx context.Context, data []byte) error {"
	result := newFilter().Analyse("internal/worker/processor.go", diff)
	assertSignificance(t, models.SignificanceHigh, result)
	assertHasRole(t, models.RoleDebugger, result)
}

func TestAnalyse_FunctionSignatureChanged_Python(t *testing.T) {
	diff := "-def login(username):\n+def login(username, mfa_token=None):"
	result := newFilter().Analyse("app/auth.py", diff)
	assertSignificance(t, models.SignificanceHigh, result)
}

// ─── High: new function added ─────────────────────────────────────────────────

func TestAnalyse_NewFunctionAdded(t *testing.T) {
	diff := "+function refreshToken(token: string): Promise<string> {\n+  return api.post('/refresh', { token })\n+}"
	result := newFilter().Analyse("src/api/tokens.ts", diff)
	assertSignificance(t, models.SignificanceHigh, result)
	assertHasRole(t, models.RoleDebugger, result)
}

// ─── High: error handling ─────────────────────────────────────────────────────

func TestAnalyse_ErrorHandlingAdded_Go(t *testing.T) {
	diff := "+\tif err != nil {\n+\t\treturn fmt.Errorf(\"failed to connect: %w\", err)\n+\t}"
	result := newFilter().Analyse("internal/db/client.go", diff)
	assertSignificance(t, models.SignificanceHigh, result)
	assertHasRole(t, models.RoleDebugger, result)
}

func TestAnalyse_ErrorHandlingAdded_JS(t *testing.T) {
	diff := "+  try {\n+    await db.connect()\n+  } catch (err) {\n+    logger.error(err)\n+  }"
	result := newFilter().Analyse("src/db.ts", diff)
	assertSignificance(t, models.SignificanceHigh, result)
	assertHasRole(t, models.RoleDebugger, result)
}

func TestAnalyse_PanicAdded_Go(t *testing.T) {
	diff := "+\tpanic(\"unexpected nil pointer\")"
	result := newFilter().Analyse("main.go", diff)
	assertSignificance(t, models.SignificanceHigh, result)
}

// ─── Medium: import / dependency ─────────────────────────────────────────────

func TestAnalyse_ImportAdded_TypeScript(t *testing.T) {
	diff := "+import { Redis } from 'ioredis'"
	result := newFilter().Analyse("src/cache.ts", diff)
	assertSignificance(t, models.SignificanceMedium, result)
	assertHasRole(t, models.RoleDeployer, result)
}

func TestAnalyse_ImportAdded_Go(t *testing.T) {
	diff := "+\t\"github.com/go-redis/redis/v9\""
	result := newFilter().Analyse("go.mod", diff)
	assertSignificance(t, models.SignificanceMedium, result)
}

func TestAnalyse_ImportAdded_Python(t *testing.T) {
	diff := "+import boto3"
	result := newFilter().Analyse("scripts/upload.py", diff)
	assertSignificance(t, models.SignificanceMedium, result)
}

// ─── Medium: environment / config access ─────────────────────────────────────

func TestAnalyse_EnvAccess_Go(t *testing.T) {
	diff := "+apiKey := os.Getenv(\"OPENAI_API_KEY\")"
	result := newFilter().Analyse("internal/llm/client.go", diff)
	assertSignificance(t, models.SignificanceMedium, result)
	assertHasRole(t, models.RoleDeployer, result)
}

func TestAnalyse_EnvAccess_Node(t *testing.T) {
	diff := "+const key = process.env.SECRET_KEY"
	result := newFilter().Analyse("src/config.ts", diff)
	assertSignificance(t, models.SignificanceMedium, result)
}

// ─── Suppress: cosmetic changes ──────────────────────────────────────────────

func TestAnalyse_CommentOnly(t *testing.T) {
	diff := "-// old comment\n+// updated comment"
	result := newFilter().Analyse("src/main.ts", diff)
	assertSignificance(t, models.SignificanceSuppress, result)
}

func TestAnalyse_WhitespaceOnly(t *testing.T) {
	diff := "+   \n-   \n+\t\t\n- "
	result := newFilter().Analyse("src/main.ts", diff)
	assertSignificance(t, models.SignificanceSuppress, result)
}

func TestAnalyse_EmptyDiff(t *testing.T) {
	result := newFilter().Analyse("src/main.ts", "")
	assertSignificance(t, models.SignificanceSuppress, result)
}

func TestAnalyse_DiffHeaderOnly(t *testing.T) {
	// A diff with only "+++" and "---" file headers and @@ hunk headers.
	diff := "--- a/src/foo.ts\n+++ b/src/foo.ts\n@@ -1,2 +1,2 @@"
	result := newFilter().Analyse("src/foo.ts", diff)
	assertSignificance(t, models.SignificanceSuppress, result)
}

// ─── Snippet content validation ───────────────────────────────────────────────

func TestAnalyse_SnippetIsNonEmpty_ForHighResult(t *testing.T) {
	diff := "-function old(x: number) {\n+function updated(x: number, y: number) {"
	result := newFilter().Analyse("src/math.ts", diff)
	if result.Significance != models.SignificanceHigh {
		t.Fatalf("expected High, got %s", result.Significance)
	}
	if result.DiffSnippet == "" {
		t.Error("expected a non-empty DiffSnippet for High significance result")
	}
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

func assertSignificance(t *testing.T, want models.Significance, result filter.FilterResult) {
	t.Helper()
	if result.Significance != want {
		t.Errorf("Significance: want %q, got %q (summary: %s)", want, result.Significance, result.Summary)
	}
}

func assertHasRole(t *testing.T, want models.Role, result filter.FilterResult) {
	t.Helper()
	for _, r := range result.TargetRoles {
		if r == want {
			return
		}
	}
	t.Errorf("TargetRoles: expected role %q in %v", want, result.TargetRoles)
}
