<#
.SYNOPSIS
    Focused tests for the runner's STATE.json handling.

.DESCRIPTION
    On 2026-09-25 the Planner wrote an unescaped quote into STATE.json. The file stopped
    parsing and every reader in the runner silently saw an empty string: the status
    fingerprint went blank, the Coder's permission profile was built without its task
    number, and the accepted commit hash had nowhere to be recorded. These tests hold the
    fix in place.

    run-agent.ps1 is a script, not a module, so dot-sourcing the whole file would start
    the workflow. Only the state functions are lifted out of its syntax tree - which also
    proves the runner itself still compiles.

    Everything happens inside one temporary folder. The real AI_WORKFLOW/STATE.json is
    never read and never written.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File AI_WORKFLOW\tests\Test-StateFile.ps1
#>
[CmdletBinding()]
param(
    [string] $RunnerPath
)

$ErrorActionPreference = 'Continue'

try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

if ([string]::IsNullOrWhiteSpace($RunnerPath)) {
    $RunnerPath = Join-Path -Path (Split-Path -Path (Split-Path -Path $PSScriptRoot -Parent) -Parent) -ChildPath 'run-agent.ps1'
}

if (-not (Test-Path -LiteralPath $RunnerPath)) {
    Write-Host ('ERROR: cannot find the runner at {0}' -f $RunnerPath)
    exit 2
}

# ---------------------------------------------------------------------------
# Load only the functions under test
# ---------------------------------------------------------------------------

$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($RunnerPath, [ref]$tokens, [ref]$parseErrors)

if ($parseErrors.Count -gt 0) {
    Write-Host ('ERROR: run-agent.ps1 does not parse ({0} errors):' -f $parseErrors.Count)
    foreach ($e in $parseErrors) {
        Write-Host ('  line {0}: {1}' -f $e.Extent.StartLineNumber, $e.Message)
    }
    exit 2
}

$wanted = @('Read-StateObject', 'Write-StateObject', 'Set-StateField', 'Get-StateField', 'Get-StateReason', 'Invoke-AcceptedCommit')
$loaded = @()

foreach ($fn in $ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)) {
    if ($wanted -contains $fn.Name) {
        . ([scriptblock]::Create($fn.Extent.Text))
        $loaded += $fn.Name
    }
}

$missing = @($wanted | Where-Object { $loaded -notcontains $_ })
if ($missing.Count -gt 0) {
    Write-Host ('ERROR: the runner no longer defines: {0}' -f ($missing -join ', '))
    exit 2
}

# ---------------------------------------------------------------------------
# Harness
# ---------------------------------------------------------------------------

$script:Passed = 0
$script:Failed = 0
$script:Failures = @()

function Assert-True {
    param([bool] $Condition, [string] $Message)
    if (-not $Condition) { throw $Message }
}

function Assert-Equal {
    param($Expected, $Actual, [string] $Message)
    if ("$Expected" -ne "$Actual") {
        throw ('{0} - expected [{1}], got [{2}]' -f $Message, $Expected, $Actual)
    }
}

function Test-Case {
    param([string] $Name, [scriptblock] $Body)

    try {
        & $Body
        $script:Passed = $script:Passed + 1
        Write-Host ('  PASS  {0}' -f $Name)
    }
    catch {
        $script:Failed = $script:Failed + 1
        $script:Failures += ('{0}: {1}' -f $Name, $_.Exception.Message)
        Write-Host ('  FAIL  {0}' -f $Name)
        Write-Host ('        {0}' -f $_.Exception.Message)
    }
}

function New-ValidState {
    return [pscustomobject]@{
        status                = 'READY'
        currentTask           = '15a5'
        lastAcceptedTask      = '15a4'
        lastAcceptedCommit    = '7a09257'
        nextTask              = '15b'
        humanApprovalRequired = $false
        reason                = 'the four "Xeyr" rows B-122 ... B-125'
    }
}

function Write-Raw {
    param([string] $Path, [string] $Text)
    [System.IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false)))
}

# The exact shape the Planner left behind: a quoted screen word inside reason.
$BrokenState = '{"status":"REVIEW","currentTask":"15a5","reason":"the four "Xeyr" rows"}'

$sandbox = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ('bax-state-tests-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $sandbox -Force | Out-Null

function New-Folder {
    param([string] $Name)
    $p = Join-Path -Path $sandbox -ChildPath $Name
    New-Item -ItemType Directory -Path $p -Force | Out-Null
    return $p
}

Write-Host ''
Write-Host 'STATE.json handling'
Write-Host ('  runner  : {0}' -f $RunnerPath)
Write-Host ('  sandbox : {0}' -f $sandbox)
Write-Host ''

try {

# ---------------------------------------------------------------------------
# 1. The text that used to break the file
# ---------------------------------------------------------------------------

Test-Case 'a reason holding double quotes round-trips' {
    $path = Join-Path (New-Folder 'quotes') 'STATE.json'
    $state = New-ValidState
    $state.reason = 'the four "Xeyr" rows B-122 ... B-125, and the "Yeni mehsullar 60" heading'

    $w = Write-StateObject -Path $path -State $state
    Assert-True $w.Ok ('the write was refused: ' + $w.Error)

    $r = Read-StateObject -Path $path
    Assert-True $r.Ok ('the read was refused: ' + $r.Error)
    Assert-Equal $state.reason $r.State.reason 'reason'

    # Escaped on disk, plain once parsed - the shape the hand-written file lacked.
    $raw = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    Assert-True ($raw -match '\\"Xeyr\\"') 'the quotes were not escaped on disk'
}

Test-Case 'newlines, tabs, backslashes and non-ASCII text round-trip' {
    $path = Join-Path (New-Folder 'escapes') 'STATE.json'

    $nl = [string][char]13 + [string][char]10
    $tab = [string][char]9
    $quote = [string][char]34
    $azeri = [string][char]0x0259 + [string][char]0x015F   # schwa and s-cedilla
    $awkward = 'line one' + $nl + 'line two' + $tab + 'after a tab, ' +
               'C:\Users\HP\BaxOrders\tools\Catalogue, a lone \ and a closing ' + $quote +
               ' plus m' + $azeri + 'hsul'

    $state = New-ValidState
    $state.reason = $awkward

    $w = Write-StateObject -Path $path -State $state
    Assert-True $w.Ok ('the write was refused: ' + $w.Error)

    $r = Read-StateObject -Path $path
    Assert-True $r.Ok ('the read was refused: ' + $r.Error)
    Assert-Equal $awkward $r.State.reason 'reason'
}

# ---------------------------------------------------------------------------
# 2. The write itself
# ---------------------------------------------------------------------------

Test-Case 'the write is UTF-8 without a BOM and leaves no temporary file' {
    $folder = New-Folder 'atomic'
    $path = Join-Path $folder 'STATE.json'

    $w = Write-StateObject -Path $path -State (New-ValidState)
    Assert-True $w.Ok ('the write was refused: ' + $w.Error)

    $bytes = [System.IO.File]::ReadAllBytes($path)
    $hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    Assert-True (-not $hasBom) 'a BOM was written'

    $leftovers = @(Get-ChildItem -Path $folder -Filter '.state-*' -Force)
    Assert-Equal 0 $leftovers.Count 'a temporary file was left behind'

    # The returned state is the one read back off the disk, not the one handed in.
    Assert-Equal '15a5' $w.State.currentTask 'the returned state'
}

Test-Case 'a second write replaces the file without losing a field' {
    $path = Join-Path (New-Folder 'replace') 'STATE.json'
    Write-StateObject -Path $path -State (New-ValidState) | Out-Null

    $second = New-ValidState
    $second.status = 'REVIEW'
    $w = Write-StateObject -Path $path -State $second
    Assert-True $w.Ok ('the write was refused: ' + $w.Error)

    $r = Read-StateObject -Path $path
    Assert-Equal 'REVIEW' $r.State.status 'status'
    Assert-Equal 7 $r.State.PSObject.Properties.Name.Count 'field count'
}

# ---------------------------------------------------------------------------
# 3. Malformed state is refused, never defaulted
# ---------------------------------------------------------------------------

Test-Case 'a malformed STATE.json is refused, not defaulted' {
    $path = Join-Path (New-Folder 'broken') 'STATE.json'
    Write-Raw -Path $path -Text $BrokenState

    $r = Read-StateObject -Path $path -Attempts 2 -DelayMs 10
    Assert-True (-not $r.Ok) 'a malformed file was accepted'
    Assert-True ($null -eq $r.State) 'a malformed file still produced a state object'
    Assert-True (-not [string]::IsNullOrWhiteSpace($r.Error)) 'no error was reported'
}

Test-Case 'an empty or missing STATE.json is refused' {
    $folder = New-Folder 'empty'
    $empty = Join-Path $folder 'STATE.json'
    Write-Raw -Path $empty -Text ''

    $r = Read-StateObject -Path $empty -Attempts 1
    Assert-True (-not $r.Ok) 'an empty file was accepted'

    $r2 = Read-StateObject -Path (Join-Path $folder 'nothing-here.json') -Attempts 1
    Assert-True (-not $r2.Ok) 'a missing file was accepted'
}

Test-Case 'Get-StateField throws on a malformed file instead of returning an empty task id' {
    $path = Join-Path (New-Folder 'nodefault') 'STATE.json'
    Write-Raw -Path $path -Text $BrokenState

    $returned = 'sentinel'
    $threw = $false
    try {
        $returned = Get-StateField -Path $path -Field 'currentTask'
    }
    catch {
        $threw = $true
        Assert-True ($_.Exception.Message -like '*INVALID_STATE*') ('the failure was not marked INVALID_STATE: ' + $_.Exception.Message)
    }

    Assert-True $threw 'Get-StateField returned instead of throwing'
    Assert-Equal 'sentinel' $returned 'Get-StateField produced a value anyway'
}

Test-Case 'Set-StateField refuses to write on top of a malformed file' {
    $path = Join-Path (New-Folder 'nowrite') 'STATE.json'
    Write-Raw -Path $path -Text $BrokenState

    $w = Set-StateField -Path $path -Field 'lastAcceptedCommit' -Value 'deadbee'
    Assert-True (-not $w.Ok) 'a malformed file was overwritten'

    $raw = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    Assert-Equal $BrokenState $raw 'the malformed file was modified'
}

# ---------------------------------------------------------------------------
# 4. Malformed state stops dispatch, and stops the commit
# ---------------------------------------------------------------------------

Test-Case 'the runner reads the state before it dispatches a role' {
    $src = [System.IO.File]::ReadAllText($RunnerPath, [System.Text.Encoding]::UTF8)

    $cycleGate = $src.IndexOf('$cycleState = Read-StateObject')
    $preGate = $src.IndexOf('$beforeState = Read-StateObject')
    $roleSwitch = $src.IndexOf('switch ($action)')

    Assert-True ($cycleGate -gt 0) 'the cycle gate is gone'
    Assert-True ($preGate -gt 0) 'the pre-dispatch gate is gone'
    Assert-True ($roleSwitch -gt 0) 'the role switch could not be found'
    Assert-True ($cycleGate -lt $preGate) 'the cycle gate no longer runs first'
    Assert-True ($preGate -lt $roleSwitch) 'the pre-dispatch gate no longer runs before the role switch'

    # No dispatch and no progress check may take a field through a path that can default.
    Assert-True ($src -notmatch "Get-StateField[^\r\n]*'currentTask'") 'a dispatch still reads currentTask through Get-StateField'
    Assert-True ($src -notmatch "Get-StateField[^\r\n]*'status'") 'a progress check still reads status through Get-StateField'
}

Test-Case 'a malformed state stops the accepted commit before anything is staged' {
    $repo = New-Folder 'repo'
    New-Item -ItemType Directory -Path (Join-Path $repo 'AI_WORKFLOW') -Force | Out-Null

    & git -C $repo init -q
    & git -C $repo config user.email 'state-test@example.invalid'
    & git -C $repo config user.name 'State Test'
    & git -C $repo config commit.gpgsign false

    Write-Raw -Path (Join-Path $repo 'app.txt') -Text 'first'
    & git -C $repo add -A
    & git -C $repo commit -q -m 'base'
    $before = (& git -C $repo rev-parse HEAD | Select-Object -First 1)

    # A real change, a real commit message, and a state that will not parse.
    Write-Raw -Path (Join-Path $repo 'app.txt') -Text 'second'
    $messagePath = Join-Path $repo 'AI_WORKFLOW\COMMIT_MESSAGE.txt'
    Write-Raw -Path $messagePath -Text 'feat: this must never be committed'
    $statePath = Join-Path $repo 'AI_WORKFLOW\STATE.json'
    Write-Raw -Path $statePath -Text $BrokenState

    Invoke-AcceptedCommit -RepoRoot $repo -StatePath $statePath | Out-Null

    $after = (& git -C $repo rev-parse HEAD | Select-Object -First 1)
    Assert-Equal $before $after 'a commit was made while the state was malformed'
    Assert-True (Test-Path -LiteralPath $messagePath) 'COMMIT_MESSAGE.txt was consumed'

    $staged = @(& git -C $repo diff --cached --name-only)
    Assert-Equal 0 $staged.Count 'files were left staged'
}

Test-Case 'a valid state lets the accepted commit through and records the hash' {
    $repo = New-Folder 'repo-ok'
    New-Item -ItemType Directory -Path (Join-Path $repo 'AI_WORKFLOW') -Force | Out-Null

    & git -C $repo init -q
    & git -C $repo config user.email 'state-test@example.invalid'
    & git -C $repo config user.name 'State Test'
    & git -C $repo config commit.gpgsign false

    Write-Raw -Path (Join-Path $repo 'app.txt') -Text 'first'
    & git -C $repo add -A
    & git -C $repo commit -q -m 'base'
    $before = (& git -C $repo rev-parse --short HEAD | Select-Object -First 1)

    Write-Raw -Path (Join-Path $repo 'app.txt') -Text 'second'
    $messagePath = Join-Path $repo 'AI_WORKFLOW\COMMIT_MESSAGE.txt'
    Write-Raw -Path $messagePath -Text 'feat: a real change'
    $statePath = Join-Path $repo 'AI_WORKFLOW\STATE.json'
    Write-StateObject -Path $statePath -State (New-ValidState) | Out-Null

    Invoke-AcceptedCommit -RepoRoot $repo -StatePath $statePath | Out-Null

    $after = (& git -C $repo rev-parse --short HEAD | Select-Object -First 1)
    Assert-True ($before -ne $after) 'no commit was made on a valid state'
    Assert-True (-not (Test-Path -LiteralPath $messagePath)) 'COMMIT_MESSAGE.txt was kept after a successful commit'

    $r = Read-StateObject -Path $statePath
    Assert-True $r.Ok ('the state stopped parsing after the commit: ' + $r.Error)
    Assert-Equal $after $r.State.lastAcceptedCommit 'lastAcceptedCommit'
    Assert-Equal '15a5' $r.State.currentTask 'currentTask survived the commit'
    Assert-True ($r.State.reason -like '*Xeyr*') 'reason survived the commit'
}

# ---------------------------------------------------------------------------
# 5. A bounded retry, then a safe stop
# ---------------------------------------------------------------------------

Test-Case 'a locked STATE.json is retried three times, then refused with the file intact' {
    $folder = New-Folder 'locked'
    $path = Join-Path $folder 'STATE.json'
    Write-StateObject -Path $path -State (New-ValidState) | Out-Null
    $original = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

    # Opened without delete sharing, so the file cannot be replaced underneath it.
    $lock = [System.IO.File]::Open($path, 'Open', 'Read', 'Read')
    try {
        $started = Get-Date
        $changed = New-ValidState
        $changed.status = 'DONE'
        $w = Write-StateObject -Path $path -State $changed
        $elapsed = (Get-Date) - $started

        Assert-True (-not $w.Ok) 'the write succeeded while the file was locked'
        Assert-True ($w.Error -like '*3 attempts*') ('the failure did not name the bounded retry: ' + $w.Error)
        Assert-True ($elapsed.TotalMilliseconds -ge 250) ('it did not actually retry - {0} ms' -f [int]$elapsed.TotalMilliseconds)
    }
    finally {
        $lock.Dispose()
    }

    Assert-Equal $original ([System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)) 'the original file was damaged'

    $leftovers = @(Get-ChildItem -Path $folder -Filter '.state-*' -Force)
    Assert-Equal 0 $leftovers.Count 'a temporary file was left behind after the failure'
}

# ---------------------------------------------------------------------------
# 6. A valid state behaves exactly as it did
# ---------------------------------------------------------------------------

Test-Case 'a valid state reads and updates exactly as before' {
    $path = Join-Path (New-Folder 'valid') 'STATE.json'
    Write-StateObject -Path $path -State (New-ValidState) | Out-Null

    Assert-Equal '15a5'  (Get-StateField -Path $path -Field 'currentTask') 'currentTask'
    Assert-Equal 'READY' (Get-StateField -Path $path -Field 'status') 'status'
    Assert-Equal '15b'   (Get-StateField -Path $path -Field 'nextTask') 'nextTask'
    Assert-True  ((Get-StateReason -Path $path) -like '*Xeyr*') 'the reason'

    $set = Set-StateField -Path $path -Field 'lastAcceptedCommit' -Value 'abc1234'
    Assert-True $set.Ok ('the update was refused: ' + $set.Error)

    $r = Read-StateObject -Path $path
    Assert-Equal 'abc1234' $r.State.lastAcceptedCommit    'lastAcceptedCommit'
    Assert-Equal '15a5'    $r.State.currentTask           'currentTask survived'
    Assert-Equal '15a4'    $r.State.lastAcceptedTask      'lastAcceptedTask survived'

    Assert-Equal 'READY'   $r.State.status                'status survived'
    Assert-Equal '15b'     $r.State.nextTask              'nextTask survived'
    Assert-Equal $false    $r.State.humanApprovalRequired 'humanApprovalRequired survived'
    Assert-True  ($r.State.reason -like '*"Xeyr"*')       'reason survived with its quotes'
}

Test-Case 'a field the file does not carry yet is added, and nothing else moves' {
    $path = Join-Path (New-Folder 'newfield') 'STATE.json'
    Write-StateObject -Path $path -State (New-ValidState) | Out-Null

    $set = Set-StateField -Path $path -Field 'lastReviewedBy' -Value 'Reviewer'
    Assert-True $set.Ok ('the update was refused: ' + $set.Error)

    $r = Read-StateObject -Path $path
    Assert-Equal 'Reviewer' $r.State.lastReviewedBy 'the new field'
    Assert-Equal 8 $r.State.PSObject.Properties.Name.Count 'field count'
    Assert-Equal '15a5' $r.State.currentTask 'currentTask survived'
}

}
finally {
    Remove-Item -LiteralPath $sandbox -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host ('{0} passed, {1} failed' -f $script:Passed, $script:Failed)

if ($script:Failed -gt 0) {
    Write-Host ''
    foreach ($f in $script:Failures) { Write-Host ('  - {0}' -f $f) }
    exit 1
}

exit 0
