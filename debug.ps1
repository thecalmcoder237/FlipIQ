# debug.ps1
# ✅ Works with spaces in path — uses here-string for safety

$Url = "https://shhwgkabmhnjwkgztzre.supabase.co/functions/v1/fetch-property-intelligence"
$Body = '{"address":"123 Main St","zipCode":"30318"}'

# Output header (using here-string to avoid quote issues)
@'
🔍 Debugging Edge Function
URL: $Url
Payload: $Body
Length: $($Body.Length) bytes
'@ | Write-Host -ForegroundColor Cyan

# Run curl
$Output = curl.exe -X POST $Url `
  -H "Content-Type: application/json" `
  -d $Body `
  -s -v 2>&1

# Extract status
$StatusLine = $Output -split "`n" | Where-Object { $_ -match "HTTP/" } | Select-Object -First 1
@"
📡 Status: $StatusLine
"@ | Write-Host -ForegroundColor Magenta

# Show response
if ($Output -match '\{[^}]*\}') {
    $Json = $Matches[0]
    @"
📄 Response JSON:
$Json
"@ | Write-Host -ForegroundColor Cyan
} else {
    @"
⚠️ No JSON found. First 250 chars:
$($Output.Substring(0, [Math]::Min(250, $Output.Length)))
"@ | Write-Host -ForegroundColor Yellow
}