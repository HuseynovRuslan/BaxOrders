# Runs the workflow and resumes it after an account session limit.
#
# A long queue outlives the account's usage window. When that window closes, the role
# process exits 1 and the runner stops — correctly, because it does not retry blindly.
# The cost is the gap afterwards: the limit lifts at a known time, but nobody is there to
# start the run again. That happened on 2026-09-25 and cost three hours.
#
# This wrapper closes only that gap. It reads the reset time out of the role's own message
# ("You've hit your session limit · resets 3:50am"), waits for it, reconciles the state the
# interrupted Coder left behind, and starts the runner again. Everything else — what to run,
# what to allow, when to stop — stays in run-agent.ps1 and in the workflow files.
#
# It resumes ONLY for the session limit. A state conflict, a missing file, a stalled role or
# any other non-zero exit stops it for good, because those need a person to look.

[CmdletBinding()]
param(
    # A run that keeps hitting the limit is making little progress per window; stop rather
    # than wait out the night for nothing.
    # A limit that resets in three hours, polled every five minutes, is ~36 attempts. The
    # budget has to outlast a long limit without a person, so it is counted generously.
    [int] $MaxResumes = 80,

    # How often to try again when the limit message carries no reset time.
    [int] $PollMinutes = 5,

    # How long to wait after a dropped connection or an overloaded API.
    [int] $TransientSeconds = 60,

    # Waiting longer than this means the message was misread, or the account is in a state
    # this script does not understand.
    [int] $MaxWaitHours = 12
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$StatePath = Join-Path $RepoRoot 'AI_WORKFLOW/STATE.json'
$RunnerPath = Join-Path $RepoRoot 'run-agent.ps1'

if (-not (Test-Path -LiteralPath $RunnerPath)) {
    Write-Host 'run-agent.ps1 is not next to this script. Nothing was started.'
    exit 1
}

# STATE.json is read and written through run-agent.ps1's own state functions, so the
# workflow holds exactly one implementation of "write this file safely". run-agent.ps1 is a
# script, not a module, so only those functions are lifted out of its syntax tree -
# dot-sourcing the whole file would start a run. Parsing it here also means a runner with a
# syntax error is caught before anything is waited on.
$StateFunctions = @('Read-StateObject', 'Write-StateObject')
$runnerTokens = $null
$runnerErrors = $null
$runnerAst = [System.Management.Automation.Language.Parser]::ParseFile($RunnerPath, [ref]$runnerTokens, [ref]$runnerErrors)

if ($runnerErrors.Count -gt 0) {
    Write-Host ('run-agent.ps1 does not parse ({0} errors). Nothing was started.' -f $runnerErrors.Count)
    foreach ($e in $runnerErrors) {
        Write-Host ('  line {0}: {1}' -f $e.Extent.StartLineNumber, $e.Message)
    }
    exit 1
}

$stateLoaded = @()
foreach ($fn in $runnerAst.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)) {
    if ($StateFunctions -contains $fn.Name) {
        . ([scriptblock]::Create($fn.Extent.Text))
        $stateLoaded += $fn.Name
    }
}

$stateMissing = @($StateFunctions | Where-Object { $stateLoaded -notcontains $_ })
if ($stateMissing.Count -gt 0) {
    Write-Host ('run-agent.ps1 no longer defines: {0}. Nothing was started.' -f ($stateMissing -join ', '))
    exit 1
}

function Write-Line {
    param([string] $Message, [string] $Colour = '')
    $line = '[{0}] RESUME | {1}' -f (Get-Date).ToString('HH:mm:ss'), $Message
    if ([string]::IsNullOrWhiteSpace($Colour)) { Write-Host $line } else { Write-Host $line -ForegroundColor $Colour }
}

# Every way the CLI says "you have run out of quota", and the reset time when it gives one.
#
# The first version of this looked only for "hit your session limit ... resets 3:50am". That
# is one wording of several: a usage limit, a rate limit, a plan limit and a weekly limit all
# stop the run the same way, and some of them print no reset time at all. A limit that was
# not recognised used to stop the wrapper for good, which is the one outcome this exists to
# prevent — the machine sits idle until a person notices.
#
# Returns @{ IsLimit = <bool>; ResetAt = <DateTime or $null>; Evidence = <string> }.
function Get-LimitVerdict {
    param([string] $Text)

    $verdict = @{ Kind = 'None'; IsLimit = $false; ResetAt = $null; Evidence = '' }

    if ([string]::IsNullOrWhiteSpace($Text)) { return $verdict }

    # Deliberately broad. A false positive costs one retry; a false negative costs the night.
    $signals = @(
        'hit your (session|usage|rate|plan|weekly) limit',
        '(session|usage|rate|plan|weekly|5-hour|five-hour) limit (has been )?(reached|exceeded)',
        'usage limit reached',
        'rate[ _-]?limit(ed|ing)?\b',
        'too many requests',
        'you have reached your [^\r\n]{0,40}limit',
        'upgrade to increase your usage limit',
        'quota (exceeded|reached)',
        '\b429\b'
    )

    foreach ($signal in $signals) {
        $m = [regex]::Match($Text, $signal, 'IgnoreCase')
        if ($m.Success) {
            $verdict.IsLimit = $true
            $verdict.Kind = 'Limit'
            # The whole line, so the log says what was actually seen rather than the pattern.
            $lineStart = $Text.LastIndexOf("`n", [Math]::Max(0, [Math]::Min($m.Index, $Text.Length - 1))) + 1
            $lineEnd = $Text.IndexOf("`n", $m.Index)
            if ($lineEnd -lt 0) { $lineEnd = $Text.Length }
            $verdict.Evidence = $Text.Substring($lineStart, $lineEnd - $lineStart).Trim()
            break
        }
    }

    if (-not $verdict.IsLimit) {
        # Not a quota problem, but not the work's fault either: the API connection dropped, the
        # service was overloaded, a gateway timed out. On 2026-09-26 the Coder for 22a died on
        # "API Error: Connection dropped (ECONNRESET)" twenty-five minutes into its run, and the
        # night ended there. These deserve a short retry, not a long wait and not a person.
        #
        # Kept deliberately narrow. A failing test, a type error or a refused permission must
        # never land here: retrying those forever would hide a real defect.
        $transient = @(
            'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE',
            'connection dropped',
            'connection reset',
            'socket hang up',
            'fetch failed',
            'overloaded',
            'service unavailable',
            'internal server error',
            '50[234]\s+(bad gateway|service unavailable|gateway time)'
        )

        foreach ($signal in $transient) {
            $m = [regex]::Match($Text, $signal, 'IgnoreCase')
            if ($m.Success) {
                $verdict.Kind = 'Transient'
                $lineStart = $Text.LastIndexOf("`n", [Math]::Max(0, [Math]::Min($m.Index, $Text.Length - 1))) + 1
                $lineEnd = $Text.IndexOf("`n", $m.Index)
                if ($lineEnd -lt 0) { $lineEnd = $Text.Length }
                $verdict.Evidence = $Text.Substring($lineStart, $lineEnd - $lineStart).Trim()
                break
            }
        }

        return $verdict
    }

    # "resets 3:50am", "resets at 15:04", "resets at 4pm". Read independently of which
    # wording matched, because the phrase and the time do not always travel together.
    $clock = [regex]::Match($Text, 'resets?\s+(?:at\s+)?(?<h>\d{1,2})(?::(?<m>\d{2}))?\s*(?<ampm>am|pm)?', 'IgnoreCase')
    if ($clock.Success) {
        $hour = [int]$clock.Groups['h'].Value
        $minute = if ($clock.Groups['m'].Success) { [int]$clock.Groups['m'].Value } else { 0 }
        $ampm = $clock.Groups['ampm'].Value.ToLowerInvariant()

        if ($ampm -eq 'am' -and $hour -eq 12) { $hour = 0 }
        elseif ($ampm -eq 'pm' -and $hour -lt 12) { $hour += 12 }

        if ($hour -le 23 -and $minute -le 59) {
            $now = Get-Date
            $reset = $now.Date.AddHours($hour).AddMinutes($minute)
            if ($reset -le $now) { $reset = $reset.AddDays(1) }   # already past today, so tomorrow
            $verdict.ResetAt = $reset
        }
    }

    return $verdict
}

# One runner at a time, always. A second one would have two Coders writing the same files
# and two Reviewers deciding the same task. Before anything is started, any other runner
# process is waited out; it is never killed from here, because the one that is already
# running may be doing real work.
function Wait-ForNoOtherRunner {
    param([int] $TimeoutMinutes = 30)

    $deadline = (Get-Date).AddMinutes($TimeoutMinutes)

    while ($true) {
        $others = @()
        try {
            $others = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
                Where-Object { $_.CommandLine -like '*run-agent.ps1*' -and $_.ProcessId -ne $PID })
        }
        catch { }

        if ($others.Count -eq 0) { return $true }

        if ((Get-Date) -ge $deadline) {
            Write-Line ('Another runner is still running (PID {0}) after {1} minutes. Nothing was started.' -f ($others[0].ProcessId), $TimeoutMinutes) 'Red'
            return $false
        }

        Write-Line ('Another runner is running (PID {0}); waiting rather than starting a second one.' -f ($others[0].ProcessId)) 'Yellow'
        Start-Sleep -Seconds 30
    }
}

# The interrupted Coder left the state at RUNNING with no report. The Coordinator refuses to
# act on that, and rightly: it cannot tell a live run from a dead one. This is the same
# reconciliation a person would do, and it is deliberately narrow — only RUNNING, only after
# a limit, and it records that the tree may carry partial work so the next Coder is not
# surprised by it.
function Reset-InterruptedState {
    if (-not (Test-Path -LiteralPath $StatePath)) {
        Write-Line 'STATE.json is missing; not touching it.' 'Yellow'
        return $false
    }

    $read = Read-StateObject -Path $StatePath
    if (-not $read.Ok) {
        Write-Line ('INVALID_STATE: STATE.json could not be parsed: {0}' -f $read.Error) 'Yellow'
        Write-Line 'The file was left exactly as it is, and nothing was reconciled.' 'Yellow'
        return $false
    }

    $state = $read.State

    # PLANNING, READY, REVIEW and FIX_REQUIRED all resume by themselves: the Coordinator
    # reads the state and dispatches the same role again, so a Planner or a Reviewer cut off
    # by a limit simply runs once more from the top of its own phase. Only RUNNING needs a
    # hand, because the Coordinator cannot tell a live Coder from a dead one. Nothing here
    # ever writes DONE, FAILED or HUMAN_REQUIRED — a limit is not a verdict on the work.
    if ($state.status -ne 'RUNNING') {
        $phase = switch ($state.status) {
            'PLANNING'     { 'the Planner writes the specification again' }
            'READY'        { 'the Coder starts on the specification' }
            'REVIEW'       { 'the Reviewer reviews again' }
            'FIX_REQUIRED' { 'the Coder works through the review again' }
            default        { 'the Coordinator decides' }
        }

        Write-Line ('State is {0} for task {1}; nothing to reconcile — on resume, {2}.' -f $state.status, $state.currentTask, $phase) 'Cyan'
        return $true
    }

    # No "2>&1": it would turn a git warning into a terminating error (see run-agent.ps1's
    # commit function, where that killed a run).
    $dirty = @(& git -C $RepoRoot status --porcelain |
        Where-Object { $_ -notmatch 'AI_WORKFLOW|run-agent\.ps1|monitor-agent\.ps1|resume-agent\.ps1' })

    $note = if ($dirty.Count -eq 0) {
        'The tree is clean, so nothing was written before the cut-off.'
    }
    else {
        'The tree carries {0} uncommitted entries from the interrupted run; the next Coder continues from them.' -f $dirty.Count
    }

    $state.status = 'READY'
    $state.reason = 'The Coder run for {0} was cut off by an account usage limit, not by anything about the work. resume-agent.ps1 set RUNNING back to READY so the Coder can run again from the same specification. {1} The task specification is unchanged and still governs, and no verdict was recorded.' -f $state.currentTask, $note

    $written = Write-StateObject -Path $StatePath -State $state
    if (-not $written.Ok) {
        Write-Line ('STATE.json could not be reconciled: {0}' -f $written.Error) 'Yellow'
        Write-Line 'The file was left exactly as it is.' 'Yellow'
        return $false
    }

    Write-Line ('State reconciled: RUNNING -> READY for task {0}. {1}' -f $state.currentTask, $note) 'Cyan'
    return $true
}

# ---------------------------------------------------------------------------

Write-Host ''
Write-Host 'BAX AI WORKFLOW — with automatic resume after a usage limit'
Write-Host ('Repository: {0}' -f $RepoRoot)
Write-Host ('Resumes allowed: {0}' -f $MaxResumes)
Write-Host ''

$resumes = 0

while ($true) {
    $transcript = Join-Path ([System.IO.Path]::GetTempPath()) ('bax-runner-' + (Get-Date).ToString('yyyyMMdd-HHmmss') + '.log')

    if (-not (Wait-ForNoOtherRunner)) { break }

    Write-Line 'starting run-agent.ps1' 'Green'
    Write-Host ''

    # The runner is started as a child process, not called in-process, and that is the whole
    # point. run-agent.ps1 prints through Write-Host, which in Windows PowerShell goes
    # straight to the host and never enters the pipeline — so calling it directly and teeing
    # the result captured almost nothing. The session-limit line was printed on screen and
    # was absent from the transcript, the reset time could not be read, and the wrapper
    # stopped saying "that was not the session limit" while the message sat in plain view.
    #
    # A child process's Write-Host becomes that process's stdout, which the parent pipeline
    # does receive. Tee-Object then both shows it live and records it.
    # No "2>&1" here either, and 'Continue' around the call. powershell.exe is a native
    # executable: merging its stderr makes every line an ErrorRecord, and under the 'Stop'
    # preference this wrapper sets for its own logic, git's "LF will be replaced by CRLF"
    # notice from inside the run then kills the wrapper. That happened on 2026-09-25 with
    # Task 16a, after the review had passed and the commit message was written.
    #
    # Nothing is lost by dropping it: the session-limit line the transcript exists for is
    # printed by run-agent.ps1 through Write-Host, which is the child's stdout.
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $RunnerPath |
            Tee-Object -FilePath $transcript
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($null -eq $exitCode) { $exitCode = 0 }

    Write-Host ''
    Write-Line ('run-agent.ps1 exited with {0}' -f $exitCode)

    if ($exitCode -eq 0) {
        Write-Line 'The runner stopped on its own terms. Nothing to resume.' 'Green'
        break
    }

    $text = ''
    try { $text = [System.IO.File]::ReadAllText($transcript) } catch { }

    $verdict = Get-LimitVerdict -Text $text
    if ($verdict.Kind -eq 'None') {
        Write-Line 'That failure was neither a usage limit nor a dropped connection. Stopping so a person can look.' 'Red'
        break
    }

    $resumes++
    if ($resumes -gt $MaxResumes) {
        Write-Line ('A usage limit stopped the run {0} times. Stopping.' -f $MaxResumes) 'Yellow'
        break
    }

    if (-not [string]::IsNullOrWhiteSpace($verdict.Evidence)) {
        Write-Line ('Limit: {0}' -f $verdict.Evidence) 'Yellow'
    }

    if ($verdict.Kind -eq 'Transient') {
        # A blip. Wait a minute and run again; the state is reconciled below exactly as after a
        # limit, so an interrupted Coder resumes from its own specification.
        Write-Line ('The API connection failed, not the work. Retrying in {0}s (attempt {1} of {2}).' -f $TransientSeconds, $resumes, $MaxResumes) 'Yellow'
        Start-Sleep -Seconds $TransientSeconds
    }
    elseif ($null -ne $verdict.ResetAt) {
        # Two minutes past the stated time: the message gives a minute, not a second.
        $resumeAt = $verdict.ResetAt.AddMinutes(2)
        $wait = $resumeAt - (Get-Date)

        if ($wait.TotalHours -gt $MaxWaitHours) {
            Write-Line ('The reset reads as {0:HH:mm}, over {1} hours away. Stopping rather than guessing.' -f $resumeAt, $MaxWaitHours) 'Yellow'
            break
        }

        if ($wait.TotalSeconds -lt 0) { $resumeAt = (Get-Date).AddSeconds(30) }

        Write-Line ('Usage limit. It resets at {0:HH:mm}; resuming at {1:HH:mm} (resume {2} of {3}).' -f $verdict.ResetAt, $resumeAt, $resumes, $MaxResumes) 'Yellow'

        while ((Get-Date) -lt $resumeAt) {
            $left = $resumeAt - (Get-Date)
            Write-Line ('waiting — {0:hh\:mm\:ss} left' -f $left)
            Start-Sleep -Seconds ([Math]::Min(300, [Math]::Max(15, $left.TotalSeconds)))
        }
    }
    else {
        # No reset time in the message. Stopping here is what the first version did, and it
        # leaves the machine idle until somebody notices — the one outcome worth engineering
        # away. So the runner is simply tried again every few minutes, and each retry IS the
        # availability check: if the limit still holds, the runner exits again within seconds
        # and the attempt costs nothing.
        Write-Line ('Usage limit, and the message carries no reset time. Trying again every {0} minutes (attempt {1} of {2}).' -f $PollMinutes, $resumes, $MaxResumes) 'Yellow'

        $resumeAt = (Get-Date).AddMinutes($PollMinutes)
        while ((Get-Date) -lt $resumeAt) {
            $left = $resumeAt - (Get-Date)
            Write-Line ('waiting — {0:mm\:ss} until the next attempt' -f $left)
            Start-Sleep -Seconds ([Math]::Min(60, [Math]::Max(5, $left.TotalSeconds)))
        }
    }

    Write-Host ''
    if (-not (Reset-InterruptedState)) {
        Write-Line 'The state could not be reconciled. Stopping.' 'Red'
        break
    }
    Write-Host ''
}

Write-Host ''
Write-Line 'done'
