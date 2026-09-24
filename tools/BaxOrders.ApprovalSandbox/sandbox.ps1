<#
.SYNOPSIS
  The approval sandbox of Task 4: a separate database of synthetic orders, and the API that serves it.

.DESCRIPTION
  Everything here happens in the database baxorders_sandbox on the local cluster that scripts/dev-postgres.ps1
  runs. The real database is never reached: the tool acts only on baxorders_sandbox, and the API refuses to
  start in the Sandbox environment against any other database.

    -Create   create baxorders_sandbox from the migrations and seed it with synthetic data
    -Reset    drop it and create it again: the test order waiting for approval, the draft unsent
    -Drop     drop it
    -Run      start the API in the Sandbox environment on http://localhost:5081, against baxorders_sandbox

  -Create and -Reset need BAXORDERS_SANDBOX_PASSWORD: the password the three test accounts get (at least 10
  characters, with a digit and a lower-case letter). It is not stored in any file.

  The database password is read from the local cluster's password file and handed to the child process through
  the environment only. It is never printed, and the variables are put back as they were when the script ends.

.EXAMPLE
  $env:BAXORDERS_SANDBOX_PASSWORD = '<choose one>'
  ./tools/BaxOrders.ApprovalSandbox/sandbox.ps1 -Create
  ./tools/BaxOrders.ApprovalSandbox/sandbox.ps1 -Run
  # in another window:
  cd frontend/bax-orders-web; npm run dev:sandbox     # the UI on http://localhost:5174
#>
param(
  [switch]$Create,
  [switch]$Reset,
  [switch]$Drop,
  [switch]$Run,
  [int]$Port = 55434,
  [string]$DataRoot = (Join-Path $env:LOCALAPPDATA 'BaxOrders')
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$tool = Join-Path $PSScriptRoot 'BaxOrders.ApprovalSandbox.csproj'
$api = Join-Path $repo 'src/BaxOrders.Api'
$database = 'baxorders_sandbox'

$chosen = @(@($Create, $Reset, $Drop, $Run) | Where-Object { $_.IsPresent }).Count
if ($chosen -ne 1) {
  throw 'Choose exactly one of -Create, -Reset, -Drop or -Run.'
}

# Written by scripts/dev-postgres.ps1 beside the cluster it runs.
$passwordFile = Join-Path $DataRoot 'pg-dev.password'
if (-not (Test-Path $passwordFile)) {
  throw "No local PostgreSQL password at $passwordFile. Run scripts/dev-postgres.ps1 first."
}
$clusterPassword = (Get-Content $passwordFile -Raw).Trim()

function New-ConnectionString([string]$Name) {
  "Host=localhost;Port=$Port;Database=$Name;Username=baxorders;Password=$clusterPassword"
}

$savedServer = $env:BAXORDERS_SANDBOX_SERVER
$savedConnection = $env:ConnectionStrings__BaxOrders
try {
  if ($Run) {
    # User-secrets are not read outside Development, so the connection reaches the API through the environment.
    $env:ConnectionStrings__BaxOrders = New-ConnectionString $database
    Write-Host "Sandbox API: http://localhost:5081 (environment Sandbox, database $database)."
    Write-Host 'Create the database first with -Create if it does not exist yet.'
    Write-Host 'The UI, in another window: cd frontend/bax-orders-web; npm run dev:sandbox  ->  http://localhost:5174'
    dotnet run --project $api --launch-profile sandbox
    return
  }

  if (($Create -or $Reset) -and [string]::IsNullOrWhiteSpace($env:BAXORDERS_SANDBOX_PASSWORD)) {
    throw 'Set BAXORDERS_SANDBOX_PASSWORD to the password the test accounts should have (at least 10 characters, with a digit and a lower-case letter).'
  }

  # The server the tool creates the sandbox on, unless one was chosen already. The tool replaces the database.
  if ([string]::IsNullOrWhiteSpace($env:BAXORDERS_SANDBOX_SERVER)) {
    $env:BAXORDERS_SANDBOX_SERVER = New-ConnectionString 'postgres'
  }

  $command = if ($Create) { '--create' } elseif ($Reset) { '--reset' } else { '--drop' }
  dotnet run --project $tool -- $command
  if ($LASTEXITCODE -ne 0) {
    throw "The sandbox tool did not finish (exit code $LASTEXITCODE); its message is above."
  }
} finally {
  $env:BAXORDERS_SANDBOX_SERVER = $savedServer
  $env:ConnectionStrings__BaxOrders = $savedConnection
}
