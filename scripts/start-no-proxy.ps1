$ErrorActionPreference = "Stop"

# Find an available TCP port, starting from 8088.
function Get-AvailablePort {
  param([int]$StartPort = 8088)

  $port = $StartPort
  while ($true) {
    $used = netstat -ano -p tcp | Where-Object { $_ -match ":$port\s" }
    if (-not $used) {
      return $port
    }
    $port++
  }
}

# Clear invalid proxy env vars for the current shell session before starting Expo.
Remove-Item Env:HTTP_PROXY,Env:HTTPS_PROXY,Env:ALL_PROXY,Env:GIT_HTTP_PROXY,Env:GIT_HTTPS_PROXY -ErrorAction SilentlyContinue

$port = Get-AvailablePort -StartPort 8088
Write-Host "Starting Expo on port $port"
npx expo start --port $port
