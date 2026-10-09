<#
.SYNOPSIS
    BAX Sifarişlər — read-only monitor for the AI workflow runner.

.DESCRIPTION
    A dashboard to watch run-agent.ps1 from a second terminal: which role is working,
    what it has just done, where the workflow state stands, and what git sees.

    It is strictly read-only. It never writes a workflow file, never creates a log,
    never runs claude, never touches the database and never signals a process. The
    worst it can do is print something.

    Log files are opened with a shared read handle, so watching a log the runner is
    still appending to cannot interfere with the runner.

.PARAMETER RefreshSeconds
    How often to redraw. Two seconds by default.

.EXAMPLE
    .\monitor-agent.ps1
    .\monitor-agent.ps1 -RefreshSeconds 5

.NOTES
    Windows PowerShell 5.1 and PowerShell 7. No external modules.
    Ctrl+C closes it.
#>

[CmdletBinding()]
param(
    [ValidateRange(1, 3600)]
    [int] $RefreshSeconds = 2
)

# ---------------------------------------------------------------------------
# Appearance
# ---------------------------------------------------------------------------

$StatusColours = @{
    'READY'          = 'Green'
    'PLANNING'       = 'Cyan'
    'RUNNING'        = 'Yellow'
    'REVIEW'         = 'Magenta'
    'FIX_REQUIRED'   = 'Red'
    'HUMAN_REQUIRED' = 'Red'
    'DONE'           = 'Green'
    'SETUP'          = 'DarkYellow'
}

$Divider = '============================================================'

# How far back to look in a log file, and how many activities to show.
$TailBytes = 262144
$TailLines = 400
$ActivityCount = 5
$StaleMinutes = 5
$GitLimit = 15

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

<#
    Masks anything that looks like a credential before it reaches the screen.

    The monitor shows command lines, and a command line is exactly where a password
    ends up when somebody is in a hurry. Nothing is printed that has not been through
    this.
#>
function Protect-Text {
    param([Parameter(Mandatory = $false)][AllowEmptyString()][string] $Text)

    if ([string]::IsNullOrEmpty($Text)) {
        return ''
    }

    $safe = $Text
    $safe = [regex]::Replace($safe, '(?i)\b(password|passwd|pwd|pgpassword|token|secret|api[_-]?key|authorization)\b\s*[=:]\s*\S+', '$1=***')
    $safe = [regex]::Replace($safe, '(?i)\b(sk-|ghp_|github_pat_)\S+', '***')
    return $safe
}

function Format-Line {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyString()][string] $Text,
        [Parameter(Mandatory = $true)][int] $Length
    )

    if ([string]::IsNullOrEmpty($Text)) {
        return ''
    }

    $flat = ($Text -replace "`r", ' ') -replace "`n", ' '
    $flat = $flat.Trim()
    if ($flat.Length -le $Length) {
        return $flat
    }

    return $flat.Substring(0, $Length) + '...'
}

function Write-Label {
    param(
        [Parameter(Mandatory = $true)][string] $Label,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string] $Value,
        [Parameter(Mandatory = $false)][string] $Colour = ''
    )

    Write-Host (' {0,-12}' -f $Label) -NoNewline
    if ([string]::IsNullOrWhiteSpace($Colour)) {
        Write-Host $Value
    }
    else {
        Write-Host $Value -ForegroundColor $Colour
    }
}

function Get-Age {
    param([Parameter(Mandatory = $true)][datetime] $When)

    $span = (Get-Date) - $When
    if ($span.TotalSeconds -lt 60) {
        return ('{0:N0} sec ago' -f $span.TotalSeconds)
    }

    if ($span.TotalMinutes -lt 60) {
        return ('{0:N0} min ago' -f $span.TotalMinutes)
    }

    return ('{0:N1} hours ago' -f $span.TotalHours)
}

<#
    The tail of a file that somebody else may be writing to.

    A shared read/write handle is the point: Get-Content would take a handle the
    runner's Add-Content can collide with, and a monitor that interrupts the thing it
    is monitoring is worse than no monitor.
#>
function Read-TailLines {
    param(
        [Parameter(Mandatory = $true)][string] $Path,
        [Parameter(Mandatory = $false)][int] $Count = 400
    )

    try {
        $stream = [System.IO.File]::Open(
            $Path,
            [System.IO.FileMode]::Open,
            [System.IO.FileAccess]::Read,
            [System.IO.FileShare]::ReadWrite)
    }
    catch {
        return @()
    }

    try {
        if ($stream.Length -gt $TailBytes) {
            [void]$stream.Seek(-$TailBytes, [System.IO.SeekOrigin]::End)
        }

        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
        $queue = New-Object System.Collections.Generic.Queue[string]

        while (-not $reader.EndOfStream) {
            [void]$queue.Enqueue($reader.ReadLine())
            if ($queue.Count -gt $Count) {
                [void]$queue.Dequeue()
            }
        }

        return @($queue.ToArray())
    }
    catch {
        return @()
    }
    finally {
        $stream.Dispose()
    }
}

# ---------------------------------------------------------------------------
# Workflow state
# ---------------------------------------------------------------------------

function Get-WorkflowState {
    param([Parameter(Mandatory = $true)][string] $Root)

    $path = Join-Path -Path $Root -ChildPath 'AI_WORKFLOW/STATE.json'
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        return $null
    }

    try {
        $json = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
        return ($json | ConvertFrom-Json)
    }
    catch {
        return $null
    }
}

function Get-CurrentTask {
    param([Parameter(Mandatory = $true)][string] $Root)

    $path = Join-Path -Path $Root -ChildPath 'AI_WORKFLOW/CURRENT_TASK.md'
    $result = [pscustomobject]@{ Task = ''; Title = ''; Status = ''; Specification = '' }

    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        return $result
    }

    try {
        $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    }
    catch {
        return $result
    }

    $patterns = @{
        Task          = '(?m)^\s*Task:\s*(.+?)\s*$'
        Title         = '(?m)^\s*Title:\s*(.+?)\s*$'
        Status        = '(?m)^\s*Status:\s*\**\s*([A-Za-z_ ]+?)\s*\**\s*$'
        Specification = '(?m)^\s*`(AI_WORKFLOW/TASKS/[^`]+)`\s*$'
    }

    foreach ($name in $patterns.Keys) {
        $match = [regex]::Match($text, $patterns[$name])
        if ($match.Success) {
            $result.$name = $match.Groups[1].Value.Trim()
        }
    }

    # The heading carries the title when the metadata form does not.
    if ([string]::IsNullOrWhiteSpace($result.Title)) {
        $heading = [regex]::Match($text, '(?m)^##\s*Task\s*\d+\s*[-—–]\s*(.+?)\s*$')
        if ($heading.Success) {
            $result.Title = $heading.Groups[1].Value.Trim()
        }
    }

    return $result
}

function Get-LastReportSummary {
    param([Parameter(Mandatory = $true)][string] $Root)

    $path = Join-Path -Path $Root -ChildPath 'AI_WORKFLOW/LAST_REPORT.md'
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        return $null
    }

    $file = Get-Item -LiteralPath $path
    $marker = ''

    try {
        $lines = Read-TailLines -Path $path -Count 60
        for ($index = $lines.Count - 1; $index -ge 0; $index--) {
            $candidate = $lines[$index].Trim()
            if ($candidate -match '^(READY_FOR_REVIEW|BLOCKED_HUMAN|IMPLEMENTATION_FAILED|REVIEW_CONFIRMED[A-Z_]*|[A-Z][A-Z_]{5,})$') {
                $marker = $candidate
                break
            }
        }
    }
    catch {
        $marker = ''
    }

    return [pscustomobject]@{
        Updated = $file.LastWriteTime
        Marker  = $marker
    }
}

# ---------------------------------------------------------------------------
# Processes
# ---------------------------------------------------------------------------

<#
    Which role, if any, is working right now.

    The runner passes each role's prompt on the command line, so the prompt's first
    sentence identifies the role. Any other Claude session on the machine — an editor's,
    a person's — has no such sentence and is ignored.
#>
function Get-ActiveRole {
    $roles = @{
        'Execute the Coordinator workflow' = 'Coordinator'
        'Execute the Planner workflow'     = 'Planner'
        'Execute the Coder workflow'       = 'Coder'
        'Execute the Reviewer workflow'    = 'Reviewer'
    }

    try {
        $processes = @(Get-CimInstance Win32_Process -Filter "Name='claude.exe'" -ErrorAction Stop)
    }
    catch {
        return $null
    }

    foreach ($process in $processes) {
        $commandLine = [string]$process.CommandLine
        if ([string]::IsNullOrWhiteSpace($commandLine)) {
            continue
        }

        foreach ($needle in $roles.Keys) {
            if ($commandLine.Contains($needle)) {
                $model = ''
                $effort = ''

                $modelMatch = [regex]::Match($commandLine, '--model\s+"?([A-Za-z0-9._-]+)"?')
                if ($modelMatch.Success) {
                    $model = $modelMatch.Groups[1].Value
                }

                $effortMatch = [regex]::Match($commandLine, '--effort\s+"?([A-Za-z]+)"?')
                if ($effortMatch.Success) {
                    $effort = $effortMatch.Groups[1].Value
                }

                $started = $null
                try {
                    $started = [datetime]$process.CreationDate
                }
                catch {
                    $started = $null
                }

                return [pscustomobject]@{
                    Role    = $roles[$needle]
                    Pid     = $process.ProcessId
                    Model   = $model
                    Effort  = $effort
                    Started = $started
                }
            }
        }
    }

    return $null
}

<# Is the runner itself up? The monitor must never mistake itself for it. #>
function Test-RunnerRunning {
    try {
        $processes = @(Get-CimInstance Win32_Process -ErrorAction Stop |
            Where-Object { $_.Name -eq 'powershell.exe' -or $_.Name -eq 'pwsh.exe' })
    }
    catch {
        return $null
    }

    foreach ($process in $processes) {
        $commandLine = [string]$process.CommandLine
        if ([string]::IsNullOrWhiteSpace($commandLine)) {
            continue
        }

        if ($commandLine -match 'monitor-agent\.ps1') {
            continue
        }

        if ($commandLine -match 'run-agent\.ps1') {
            return $true
        }
    }

    return $false
}

# ---------------------------------------------------------------------------
# Log activity
# ---------------------------------------------------------------------------

function Get-LatestLog {
    param([Parameter(Mandatory = $true)][string] $Root)

    $folder = Join-Path -Path $Root -ChildPath 'AI_WORKFLOW/LOGS'
    if (-not (Test-Path -LiteralPath $folder -PathType Container)) {
        return $null
    }

    try {
        return (Get-ChildItem -LiteralPath $folder -Filter '*.jsonl' -File -ErrorAction Stop |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1)
    }
    catch {
        return $null
    }
}

<#
    The last few things the active role actually did, in words.

    Raw stream-json across the screen is unreadable, so each event becomes one short
    line: a verb, and the one argument worth seeing. Anything that will not parse is
    skipped rather than allowed to break the refresh.
#>
function Get-RecentActivity {
    param(
        [Parameter(Mandatory = $true)][string] $Path,
        [Parameter(Mandatory = $true)][int] $Count
    )

    $activities = New-Object System.Collections.ArrayList
    $lines = Read-TailLines -Path $Path -Count $TailLines

    foreach ($line in $lines) {
        $text = $line
        if ($null -eq $text) {
            continue
        }

        $text = $text.Trim()
        if (-not $text.StartsWith('{')) {
            continue
        }

        try {
            $evt = $text | ConvertFrom-Json
        }
        catch {
            continue
        }

        try {
            if ($evt.type -eq 'assistant') {
                foreach ($block in $evt.message.content) {
                    if ($block.type -eq 'tool_use') {
                        $detail = ''
                        foreach ($candidate in @('command', 'file_path', 'path', 'pattern', 'query')) {
                            if ($block.input.PSObject.Properties.Name -contains $candidate) {
                                $detail = [string]$block.input.$candidate
                                break
                            }
                        }

                        [void]$activities.Add([pscustomobject]@{
                            Verb   = [string]$block.name
                            Detail = $detail
                        })
                    }
                    elseif ($block.type -eq 'text' -and -not [string]::IsNullOrWhiteSpace($block.text)) {
                        [void]$activities.Add([pscustomobject]@{
                            Verb   = 'says'
                            Detail = $block.text
                        })
                    }
                }
            }
            elseif ($evt.type -eq 'result') {
                $note = [string]$evt.subtype
                if (($evt.PSObject.Properties.Name -contains 'num_turns') -and $null -ne $evt.num_turns) {
                    $note = $note + (', {0} turns' -f $evt.num_turns)
                }

                [void]$activities.Add([pscustomobject]@{
                    Verb   = 'result'
                    Detail = $note
                })
            }
        }
        catch {
            continue
        }
    }

    if ($activities.Count -le $Count) {
        return @($activities.ToArray())
    }

    return @($activities.ToArray()[($activities.Count - $Count)..($activities.Count - 1)])
}

# ---------------------------------------------------------------------------
# Git
# ---------------------------------------------------------------------------

function Get-GitStatus {
    param([Parameter(Mandatory = $true)][string] $Root)

    try {
        Push-Location -LiteralPath $Root
    }
    catch {
        return $null
    }

    try {
        # Read-only: --short reports, it never changes anything.
        $output = & git status --short 2>&1
        if ($LASTEXITCODE -ne 0) {
            return $null
        }

        return @($output | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    }
    catch {
        return $null
    }
    finally {
        Pop-Location
    }
}

# ---------------------------------------------------------------------------
# The dashboard
# ---------------------------------------------------------------------------

function Show-Dashboard {
    param([Parameter(Mandatory = $true)][string] $Root)

    Clear-Host

    Write-Host $Divider
    Write-Host ' BAX AI WORKFLOW MONITOR'
    Write-Host $Divider

    Write-Label -Label 'Time:' -Value (Get-Date).ToString('HH:mm:ss')

    # ---- runner ----------------------------------------------------------

    $runnerUp = Test-RunnerRunning
    if ($null -eq $runnerUp) {
        Write-Label -Label 'Runner:' -Value 'UNKNOWN (process list unavailable)' -Colour DarkGray
    }
    elseif ($runnerUp) {
        Write-Label -Label 'Runner:' -Value 'RUNNING' -Colour Green
    }
    else {
        Write-Label -Label 'Runner:' -Value 'NOT RUNNING' -Colour DarkGray
    }

    # ---- workflow state --------------------------------------------------

    $state = Get-WorkflowState -Root $Root
    if ($null -eq $state) {
        Write-Label -Label 'State:' -Value 'AI_WORKFLOW/STATE.json not readable' -Colour Red
    }
    else {
        $status = [string]$state.status
        $colour = 'White'
        if ($StatusColours.ContainsKey($status)) {
            $colour = $StatusColours[$status]
        }

        Write-Label -Label 'State:' -Value $status -Colour $colour
        Write-Label -Label 'Task:' -Value ([string]$state.currentTask)
        Write-Label -Label 'Next task:' -Value ([string]$state.nextTask)

        if ($state.humanApprovalRequired) {
            Write-Label -Label 'Approval:' -Value 'HUMAN APPROVAL REQUIRED' -Colour Red
        }

        if (-not [string]::IsNullOrWhiteSpace([string]$state.reason)) {
            Write-Host ' Reason:'
            Write-Host ('  ' + (Format-Line -Text (Protect-Text -Text ([string]$state.reason)) -Length 100)) -ForegroundColor DarkGray
        }
    }

    # ---- current task ----------------------------------------------------

    $task = Get-CurrentTask -Root $Root
    if (-not [string]::IsNullOrWhiteSpace($task.Title)) {
        Write-Host ''
        Write-Label -Label 'Title:' -Value (Format-Line -Text $task.Title -Length 80)
        if (-not [string]::IsNullOrWhiteSpace($task.Status)) {
            Write-Label -Label 'Task status:' -Value $task.Status
        }

        if (-not [string]::IsNullOrWhiteSpace($task.Specification)) {
            Write-Label -Label 'Spec:' -Value $task.Specification -Colour DarkGray
        }
    }

    # ---- active role -----------------------------------------------------

    Write-Host ''
    $role = Get-ActiveRole
    if ($null -eq $role) {
        Write-Label -Label 'Active role:' -Value 'NONE / between cycles' -Colour DarkGray
    }
    else {
        Write-Label -Label 'Active role:' -Value $role.Role.ToUpperInvariant() -Colour Yellow

        if (-not [string]::IsNullOrWhiteSpace($role.Model)) {
            Write-Label -Label 'Model:' -Value $role.Model
        }

        if (-not [string]::IsNullOrWhiteSpace($role.Effort)) {
            Write-Label -Label 'Effort:' -Value $role.Effort
        }

        Write-Label -Label 'PID:' -Value ([string]$role.Pid)

        if ($null -ne $role.Started) {
            $elapsed = (Get-Date) - $role.Started
            Write-Label -Label 'Running:' -Value ('{0:hh\:mm\:ss}' -f $elapsed)
        }
    }

    # ---- activity --------------------------------------------------------

    $log = Get-LatestLog -Root $Root
    Write-Host ''

    if ($null -eq $log) {
        Write-Host ' Last activity:'
        Write-Host '  (no logs yet)' -ForegroundColor DarkGray
    }
    else {
        Write-Host ' Last activity:'
        $activities = Get-RecentActivity -Path $log.FullName -Count $ActivityCount
        if ($activities.Count -eq 0) {
            Write-Host '  (nothing readable yet)' -ForegroundColor DarkGray
        }
        else {
            foreach ($activity in $activities) {
                $detail = Format-Line -Text (Protect-Text -Text $activity.Detail) -Length 64
                Write-Host ('  {0,-8} {1}' -f $activity.Verb, $detail)
            }
        }

        Write-Host ''
        Write-Host ' Latest log:'
        Write-Host ('  AI_WORKFLOW/LOGS/' + $log.Name) -ForegroundColor DarkGray
        Write-Host ('  Updated: {0}  ({1})' -f $log.LastWriteTime.ToString('HH:mm:ss'), (Get-Age -When $log.LastWriteTime)) -ForegroundColor DarkGray

        # Informational only. The monitor never acts on this.
        $idle = (Get-Date) - $log.LastWriteTime
        if ($null -ne $role -and $idle.TotalMinutes -gt $StaleMinutes) {
            Write-Host ''
            Write-Host ('  WARNING: no new log activity for {0:N0} minutes' -f $idle.TotalMinutes) -ForegroundColor Yellow
        }
    }

    # ---- last report -----------------------------------------------------

    $report = Get-LastReportSummary -Root $Root
    if ($null -ne $report) {
        Write-Host ''
        Write-Host ' Last report:'
        $line = '  Updated: ' + $report.Updated.ToString('HH:mm:ss') + '  (' + (Get-Age -When $report.Updated) + ')'
        if (-not [string]::IsNullOrWhiteSpace($report.Marker)) {
            $line = $line + '   ' + $report.Marker
        }

        Write-Host $line -ForegroundColor DarkGray
    }

    # ---- git -------------------------------------------------------------

    Write-Host ''
    Write-Host ' Git:'
    $git = Get-GitStatus -Root $Root
    if ($null -eq $git) {
        Write-Host '  (git unavailable)' -ForegroundColor DarkGray
    }
    elseif ($git.Count -eq 0) {
        Write-Host '  clean' -ForegroundColor DarkGray
    }
    else {
        $shown = $git
        if ($git.Count -gt $GitLimit) {
            $shown = $git[0..($GitLimit - 1)]
        }

        foreach ($entry in $shown) {
            Write-Host ('  ' + (Format-Line -Text $entry -Length 70))
        }

        if ($git.Count -gt $GitLimit) {
            Write-Host ('  ... {0} more' -f ($git.Count - $GitLimit)) -ForegroundColor DarkGray
        }
    }

    Write-Host ''
    Write-Host ' Press Ctrl+C to close monitor.' -ForegroundColor DarkGray
    Write-Host $Divider
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
}
catch {
    # An older host may refuse; the accents suffer, the monitor does not.
}

$repoRoot = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($repoRoot)) {
    Write-Host 'ERROR: cannot determine the repository root from $PSScriptRoot.'
    exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path -Path $repoRoot -ChildPath 'AI_WORKFLOW') -PathType Container)) {
    Write-Host ('ERROR: no AI_WORKFLOW folder under {0}.' -f $repoRoot)
    Write-Host 'The monitor reads the workflow; it does not create it.'
    exit 1
}

while ($true) {
    try {
        Show-Dashboard -Root $repoRoot
    }
    catch {
        # A refresh that fails is not a reason to stop watching.
        Write-Host ''
        Write-Host (' refresh error: {0}' -f (Format-Line -Text $_.Exception.Message -Length 90)) -ForegroundColor DarkGray
    }

    Start-Sleep -Seconds $RefreshSeconds
}
