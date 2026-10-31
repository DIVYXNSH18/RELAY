# Relay Live Diff Simulation Script
# Run this during your video presentation to demonstrate real-time context synchronization!

param (
    [string]$User = "Divyansh",
    [string]$File = "backend/internal/auth/jwt.go"
)

$uri = "http://localhost:8080/api/v1/events"
$timestamp = (Get-Date).ToUniversalTime().ToString("o")

$diff = "@@ -32,5 +32,12 @@ func ValidateToken(token string) (*UserClaims, error) {`n+	if claims.Role == `"`" {`n+		return nil, errors.New(`"missing role claim`")`n+	}`n+	logger.Info(`"token validated successfully`", `"user`", claims.Subject, `"role`", claims.Role)`n+	return claims, nil`n }"

$payload = @{
    source_user = $User
    file_path   = $File
    raw_diff    = $diff
    timestamp   = $timestamp
} | ConvertTo-Json

Write-Host ""
Write-Host "[Relay] Pushing simulated IDE diff to Context Engine..." -ForegroundColor Cyan
Write-Host "   User: $User"
Write-Host "   File: $File"
Write-Host "   URL:  $uri"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $payload -ContentType "application/json"
    Write-Host "[Success] Diff event processed and broadcasted over SSE!" -ForegroundColor Green
    Write-Host "   Digest Event ID: $($response.data.event_id)"
    Write-Host "   Summary:         $($response.data.summary)"
    Write-Host "   Significance:    $($response.data.significance)"
    Write-Host "   Target Roles:    $($response.data.target_roles -join ', ')"
    Write-Host ""
    Write-Host ">>> Check your phone/browser screen now -- the new diff card is live! <<<" -ForegroundColor Yellow
} catch {
    Write-Host "[Error] Failed to send event: $($_.Exception.Message)" -ForegroundColor Red
}
