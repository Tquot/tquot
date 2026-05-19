$path = Join-Path $PSScriptRoot "..\app\dashboard\new-quote\QuoteEngine.tsx"
$lines = Get-Content $path
$start = ($lines | Select-String -Pattern '^function FlightOptionCard' | Select-Object -First 1).LineNumber
$end = ($lines | Select-String -Pattern '^function StepIndicator' | Select-Object -First 1).LineNumber
if (-not $start -or -not $end) { throw "markers not found" }
$before = $lines[0..($start - 2)]
$after = $lines[($end - 1)..($lines.Length - 1)]
($before + $after) | Set-Content $path -Encoding utf8
Write-Host "Removed FlightOptionCard block lines $start-$($end-1)"
