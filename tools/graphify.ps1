param(
    [Parameter(Position = 0)]
    [ValidateSet('query', 'path', 'explain', 'update', 'status')]
    [string]$Action = 'status',
    [Parameter(Position = 1)][string]$Question,
    [Parameter(Position = 2)][string]$Target,
    [ValidateRange(100, 10000)][int]$Budget = 800
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$graphPath = Join-Path $repoRoot 'graphify-out\graph.json'
if (-not (Test-Path -LiteralPath $graphPath)) {
    throw 'Graph missing. Use the Graphify skill to build code and documents with .graphifyignore exclusions.'
}
if ($Action -eq 'status') {
    $graph = Get-Content -LiteralPath $graphPath -Raw | ConvertFrom-Json
    [pscustomobject]@{ Graph = $graphPath; Nodes = $graph.nodes.Count; Connections = $graph.links.Count }
    return
}
if ($Action -in @('query', 'path', 'explain') -and [string]::IsNullOrWhiteSpace($Question)) {
    throw 'Provide a question or symbol.'
}
if ($Action -eq 'path' -and [string]::IsNullOrWhiteSpace($Target)) {
    throw 'Provide both symbols for a path query.'
}
$graphifyCommand = Get-Command graphify -ErrorAction SilentlyContinue
$graphifyExe = if ($graphifyCommand) { $graphifyCommand.Source } else { Join-Path $env:USERPROFILE '.local\bin\graphify.exe' }
if (-not (Test-Path -LiteralPath $graphifyExe)) { throw 'Graphify is not installed. Install the graphifyy CLI first.' }

$savedBackend = $env:GRAPHIFY_BACKEND
$savedLogging = $env:GRAPHIFY_QUERY_LOG_DISABLE
$savedRefresh = $env:GRAPHIFY_NO_AUTO_REFRESH
Push-Location -LiteralPath $repoRoot
try {
    $env:GRAPHIFY_BACKEND = 'none'
    $env:GRAPHIFY_QUERY_LOG_DISABLE = '1'
    $env:GRAPHIFY_NO_AUTO_REFRESH = '1'
    switch ($Action) {
        'query' { & $graphifyExe query $Question --budget $Budget --graph $graphPath }
        'path' { & $graphifyExe path $Question $Target --graph $graphPath }
        'explain' { & $graphifyExe explain $Question --graph $graphPath }
        'update' { & $graphifyExe update $repoRoot }
    }
    if ($LASTEXITCODE -ne 0) { throw "Graphify exited with status $LASTEXITCODE." }
}
finally {
    $env:GRAPHIFY_BACKEND = $savedBackend
    $env:GRAPHIFY_QUERY_LOG_DISABLE = $savedLogging
    $env:GRAPHIFY_NO_AUTO_REFRESH = $savedRefresh
    Pop-Location
}
