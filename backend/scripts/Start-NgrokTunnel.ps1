param(
  [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $backendRoot '.env'

if (-not (Test-Path $environmentFile)) {
  throw "Missing $environmentFile. Copy .env.example to .env and configure NGROK_DOMAIN and NGROK_AUTH_TOKEN."
}

$settings = @{}
foreach ($line in Get-Content $environmentFile) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    $value = $Matches[2].Trim()
    if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
      $value = $value.Substring(1, $value.Length - 2)
    } elseif ($value.Length -ge 2 -and $value.StartsWith("'") -and $value.EndsWith("'")) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    $settings[$Matches[1]] = $value
  }
}

$port = if ($settings['PORT']) { [int]$settings['PORT'] } else { 4000 }
$domain = $settings['NGROK_DOMAIN']
$authToken = $settings['NGROK_AUTH_TOKEN']

if (-not $domain -or $domain -notmatch '^[A-Za-z0-9.-]+$') {
  throw 'NGROK_DOMAIN is missing or invalid in backend/.env.'
}
if (-not $authToken -or $authToken -match '^(replace|your|paste)') {
  throw 'Set a valid NGROK_AUTH_TOKEN in backend/.env.'
}

$ngrokExecutable = Join-Path $env:APPDATA 'npm\node_modules\ngrok\bin\ngrok.exe'
if (-not (Test-Path $ngrokExecutable)) {
  $ngrokCommand = Get-Command ngrok.exe -ErrorAction SilentlyContinue
  if ($ngrokCommand) {
    $ngrokExecutable = $ngrokCommand.Source
  } else {
    throw 'Could not find ngrok.exe. Install ngrok or update Start-NgrokTunnel.ps1 with its path.'
  }
}

$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $listener) {
  throw "Nothing is listening on port $port. Start the backend first with npm run dev."
}

$publicUrl = "https://$domain"
if ($ValidateOnly) {
  Write-Output "ngrok configuration is valid for $publicUrl and localhost:$port."
  return
}

$previousAuthToken = $env:NGROK_AUTHTOKEN
try {
  $env:NGROK_AUTHTOKEN = $authToken
  Write-Output "Starting ngrok for $publicUrl -> localhost:$port. Press Ctrl+C to stop."
  & $ngrokExecutable http $port --url $publicUrl
  if ($LASTEXITCODE -ne 0) {
    throw "ngrok exited with code $LASTEXITCODE."
  }
} finally {
  if ($null -eq $previousAuthToken) {
    Remove-Item Env:\NGROK_AUTHTOKEN -ErrorAction SilentlyContinue
  } else {
    $env:NGROK_AUTHTOKEN = $previousAuthToken
  }
}