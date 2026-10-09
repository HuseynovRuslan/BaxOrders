<#
.SYNOPSIS
    BAX Sifarişlər — AI workflow runner.

.DESCRIPTION
    Routes between the Coordinator, Planner, Coder and Reviewer roles according to the
    action the Coordinator returns.

    The runner is deliberately dumb. It calls a role, reads the Coordinator's decision,
    routes to the next role and stops. It never edits application code, never edits
    workflow state, never touches the database or git, and never infers a business
    decision. The AI roles themselves stay governed by the files under AI_WORKFLOW/.

    Two things it does do, because the first automated run showed they were missing:

    1. Every role runs under its own narrow permission profile. Nothing gets a blanket
       allowance, and no role can reach past what its job needs.
    2. Everything a role does is printed as it happens. A role that reads for ten minutes
       used to look identical to a role that had hung.

.NOTES
    Verified against Claude Code 2.1.280 on this machine:
      --restricted            ignores user/project/local settings, so --settings is the
                              whole policy; confines file tools to the working directory.
      --settings <file>       a JSON file. A JSON *string* is mangled by PowerShell's
                              native-argument quoting, so a file is used.
      --tools                 which built-in tools exist at all for the session.
      Edit(path) rules        cover every file-writing tool. Write(path) rules are
                              ignored by file permission checks — the CLI says so itself.
      Bash(cmd:*)             prefix match. Proven: with only Bash(dotnet build:*) named,
                              dotnet build ran and dotnet test was refused.
      Read-only git           status/log/diff/rev-parse run without an explicit rule.

    --max-turns does not exist in this version and is not used.
    --dangerously-skip-permissions and bypassPermissions are never used.
    Authentication and global/user settings are never altered.
#>

# This runner decides for itself how errors behave, rather than inheriting it from whoever
# dot-sources or calls it. resume-agent.ps1 sets 'Stop' for its own logic, and because it
# invokes this script in the same session that preference leaked in here — turning warnings
# that had been harmless all night into run-killers. Twice on 2026-09-25, both times at the
# commit, both times after a task had already passed review.
#
# 'Continue' is right for a long unattended run: a role's transcript line failing to write,
# or git remarking on line endings, must not end thirteen tasks' worth of work. The places
# that genuinely must stop — a state conflict, a role making no progress, a non-zero exit —
# check their own conditions and return explicitly.
$ErrorActionPreference = 'Continue'

# ---------------------------------------------------------------------------
# Configuration — change the routing here.
# ---------------------------------------------------------------------------

$CoordinatorModel  = 'sonnet'
$CoordinatorEffort = 'medium'

$PlannerModel  = 'opus'
$PlannerEffort = 'high'

$CoderModel  = 'opus'
$CoderEffort = 'xhigh'

$ReviewerModel  = 'opus'
$ReviewerEffort = 'high'

# Protection against an endless Coder/Reviewer loop. Each Coordinator decision
# is one cycle. The per-role progress check below usually stops things first.
#
# The owner asked (2026-09-24) for the whole queue to run without stopping between tasks,
# so this is sized for the queue rather than for one task: a task costs roughly six cycles
# (Coordinator + Planner, Coordinator + Coder, Coordinator + Reviewer), and a task that
# needs a fix round costs more. This is not the thing that decides when to stop — the
# progress and stall checks are. It is only the last resort, for a loop neither of them
# can see, and it should never be the reason a run ends.
$MaxCycles = 240

# The second layer, for the case the first one cannot see: a role that changes a
# workflow file on every pass without the workflow ever advancing — rewriting the same
# specification, say. The immediate check calls that progress, because something moved;
# this one notices that the Coordinator keeps asking for the same role anyway.
$StallLimit = 3

# Where the full stream of every role is kept. Logs only — the runner never writes
# workflow state.
$LogDirectory = 'AI_WORKFLOW/LOGS'

# ---------------------------------------------------------------------------
# Permission profiles
# ---------------------------------------------------------------------------
#
# Each role gets the narrowest set of tools and rules its job needs, and nothing more.
# The profiles are written to a temporary folder at startup rather than kept in the
# repository, so this script stays the only file the runner owns.
#
# Read-only git needs no rule — the CLI treats it as safe — but it is listed anyway, so
# the intent is readable here rather than dependent on what the CLI classifies.

$RoleTools = @{
    Coordinator = 'Read,Bash,Glob,Grep'
    Planner     = 'Read,Write,Edit,Bash,Glob,Grep'
    Coder       = 'Read,Write,Edit,Bash,Glob,Grep'
    Reviewer    = 'Read,Write,Edit,Bash,Glob,Grep'
}

# Inspecting the repository and its history. Shared by every role.
$ReadOnlyGit = @(
    '"Bash(git status:*)"',
    '"Bash(git log:*)"',
    '"Bash(git diff:*)"',
    '"Bash(git show:*)"',
    '"Bash(git rev-parse:*)"',
    '"Bash(git branch:*)"'
)

# Denied by default for every role. The Task 3 branch further down lifts exactly two
# of these for the Coder, and only while task 3 is the current task: the backup command
# and the catalogue tool. Everything else here is denied for everybody, always.
$AlwaysDenied = @(
    '"Bash(git push:*)"',
    '"Bash(git reset:*)"',
    '"Bash(git clean:*)"',
    '"Bash(git checkout:*)"',
    '"Bash(git rebase:*)"',
    '"Bash(git commit:*)"',
    '"Bash(psql:*)"',
    '"Bash(pg_dump:*)"',
    '"Bash(pg_restore:*)"',
    '"Bash(dotnet ef:*)"',
    # No deny for "dotnet run" belongs here. The profile is restrictive — a command that is
    # not in the allow list cannot run — and a data task's allow list names the one tool its
    # specification calls for. A deny here would outrank that grant and block the very tool
    # the task exists to run.
    '"Edit(.claude/**)"',
    '"Edit(run-agent.ps1)"',
    # The owner briefs are the business source-of-truth and are immutable planning input.
    # A role that could edit a brief could quietly rewrite the requirement it is judged
    # against, which would make the Reviewer's acceptance meaningless. Only the owner
    # changes these.
    '"Edit(AI_WORKFLOW/BRIEFS/**)"'
)

# Application code. The Coder may write here; nobody else may.
$ApplicationPaths = @(
    '"Edit(src/**)"',
    '"Edit(frontend/**)"',
    '"Edit(tests/**)"',
    '"Edit(tools/**)"',
    '"Edit(scripts/**)"',
    '"Edit(samples/**)"',
    '"Edit(docs/**)"'
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

$RequiredFiles = @(
    'AI_WORKFLOW/COORDINATOR_PROMPT.md',
    'AI_WORKFLOW/PLANNER_PROMPT.md',
    'AI_WORKFLOW/CODER_PROMPT.md',
    'AI_WORKFLOW/REVIEWER_PROMPT.md',
    'AI_WORKFLOW/WORKFLOW_RULES.md',
    'AI_WORKFLOW/PLAN.md',
    'AI_WORKFLOW/CURRENT_TASK.md',
    'AI_WORKFLOW/STATE.json',
    'AI_WORKFLOW/LAST_REPORT.md'
)

# The directory the Planner writes specifications into. Which numbered files live in
# it is the workflow's business, not the runner's, so only the directory is required.
$RequiredDirectories = @(
    'AI_WORKFLOW/TASKS'
)

$ValidActions = @(
    'RUN_PLANNER',
    'RUN_CODER',
    'RUN_REVIEWER',
    'STOP_SETUP',
    'STOP_RUNNING',
    'STOP_HUMAN_REQUIRED',
    'STOP_DONE',
    'STOP_STATE_CONFLICT'
)

$CoordinatorPrompt = @'
Execute the Coordinator workflow now.

Read and follow:
AI_WORKFLOW/COORDINATOR_PROMPT.md

exactly.

Do not execute Planner, Coder or Reviewer yourself.

Return the Coordinator decision and STOP.
'@

$PlannerPrompt = @'
Execute the Planner workflow now.

Read and follow:
AI_WORKFLOW/PLANNER_PROMPT.md

exactly.

Do not execute Coder afterwards.

When the Planner reaches its required stopping point, STOP.
'@

$CoderPrompt = @'
Execute the Coder workflow now.

Read and follow:
AI_WORKFLOW/CODER_PROMPT.md

exactly.

Do not execute Reviewer afterwards.

When the Coder reaches its required stopping point, STOP.
'@

$ReviewerPrompt = @'
Execute the Reviewer workflow now.

Read and follow:
AI_WORKFLOW/REVIEWER_PROMPT.md

exactly.

Do not execute Coder afterwards.

When the Reviewer reaches its required stopping point, STOP.
'@

# ---------------------------------------------------------------------------
# Permission profile files
# ---------------------------------------------------------------------------

<#
    Writes one role's policy and returns the path.

    The JSON is assembled as text rather than through ConvertTo-Json so the rules read
    the same here as they do in the file, which is what anybody auditing this wants.
#>
# A permission rule written as a relative path is matched against the role's *current*
# directory, not the repository root. One "cd" into a subdirectory and every such rule
# stops meaning what it says: allow rules silently refuse the files they name, and — far
# worse — deny rules silently stop guarding the files they forbid. This happened twice:
# a Planner that cd'd into LOGS, and the Task 3 Coder that cd'd into the frontend and was
# then refused its own report file.
#
# So every path rule is emitted twice: as written, and anchored to the repository root
# with the "//" absolute prefix the CLI already understands (see the Coordinator's
# "Edit(//**)" deny). Keeping both forms is deliberate. If the absolute spelling were
# ever wrong, an allow rule would merely fail closed, and a deny rule would still be
# enforced by the relative twin it was paired with.
function Expand-PathRules {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyCollection()][string[]] $Rules,
        [Parameter(Mandatory = $true)][string] $RepoRoot
    )

    $root = $RepoRoot.Replace('\', '/').TrimEnd('/')
    $expanded = New-Object System.Collections.ArrayList

    foreach ($rule in $Rules) {
        [void]$expanded.Add($rule)

        # "Edit(path)" only. Bash rules are commands, not paths, and "Edit(//**)" is
        # already absolute.
        $match = [regex]::Match($rule, '^"Edit\((?<path>[^)]+)\)"$')
        if (-not $match.Success) { continue }

        $path = $match.Groups['path'].Value
        if ($path.StartsWith('/') -or $path -match '^[A-Za-z]:') { continue }

        # Two absolute spellings, not one. The "//" prefix is the convention the CLI's own
        # "Edit(//**)" uses, but on Windows it was observed not to match a real path like
        # C:\Users\...\LAST_REPORT.md: a Coder that had changed directory was refused a file
        # this rule was supposed to allow. The drive-letter form is emitted as well so the
        # rule holds whichever spelling the matcher actually compares against.
        #
        # The extra parentheses matter: inside a method call the comma would otherwise be
        # read as an argument separator, and the format string would lose its second value.
        [void]$expanded.Add(('"Edit(//{0}/{1})"' -f $root, $path))
        [void]$expanded.Add(('"Edit({0}/{1})"' -f $root, $path))
    }

    return @($expanded)
}

function New-PermissionProfile {
    param(
        [Parameter(Mandatory = $true)][string] $Folder,
        [Parameter(Mandatory = $true)][string] $Role,
        [Parameter(Mandatory = $true)][string[]] $Allow,
        [Parameter(Mandatory = $true)][string[]] $Deny,
        [Parameter(Mandatory = $true)][string] $RepoRoot
    )

    $allowText = (Expand-PathRules -Rules $Allow -RepoRoot $RepoRoot) -join ",`r`n      "
    $denyText = (Expand-PathRules -Rules $Deny -RepoRoot $RepoRoot) -join ",`r`n      "

    $json = @"
{
  "permissions": {
    "allow": [
      $allowText
    ],
    "deny": [
      $denyText
    ]
  }
}
"@

    $path = Join-Path -Path $Folder -ChildPath ($Role.ToLowerInvariant() + '.settings.json')
    [System.IO.File]::WriteAllText($path, $json, (New-Object System.Text.UTF8Encoding($false)))
    return $path
}

# Commits a task the Reviewer has accepted.
#
# The commit is made by the runner rather than by a role, deliberately. A model holding
# "git commit" can commit anything it likes; this function can only commit the tree that
# a review just passed, with the message that review wrote. The Reviewer signals a pass by
# writing AI_WORKFLOW/COMMIT_MESSAGE.txt — the file existing IS the instruction, and it is
# consumed here so the same acceptance can never commit twice.
#
# The workflow's own files stay out of it. AI_WORKFLOW/, this runner and the monitor are
# infrastructure, not the task, and mixing them into a task's diff would make the diff
# unreviewable — which is the one thing the whole workflow exists to prevent.
function Invoke-AcceptedCommit {
    param(
        [Parameter(Mandatory = $true)][string] $RepoRoot,
        [Parameter(Mandatory = $true)][string] $StatePath
    )

    $messagePath = Join-Path -Path $RepoRoot -ChildPath 'AI_WORKFLOW/COMMIT_MESSAGE.txt'
    if (-not (Test-Path -LiteralPath $messagePath)) {
        return
    }

    $message = [System.IO.File]::ReadAllText($messagePath, [System.Text.Encoding]::UTF8)
    if ([string]::IsNullOrWhiteSpace($message)) {
        Write-Host 'Accepted commit skipped: COMMIT_MESSAGE.txt is empty.'
        Remove-Item -LiteralPath $messagePath -Force
        return
    }

    # Fail closed, before anything is staged. The hash this produces has to land in
    # STATE.json for the next Coordinator to see it; if the file will not parse it cannot
    # land anywhere, and a commit whose hash is lost is worse than no commit at all.
    $read = Read-StateObject -Path $StatePath
    if (-not $read.Ok) {
        Write-Host ''
        Write-Host 'INVALID_STATE — nothing was staged and nothing was committed.'
        Write-Host ('AI_WORKFLOW/STATE.json could not be parsed: {0}' -f $read.Error)
        Write-Host 'COMMIT_MESSAGE.txt is kept. Repair the JSON by hand, then start the runner again.'
        return
    }

    $attribution = 'Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>'
    if ($message -notmatch [regex]::Escape($attribution)) {
        $message = $message.TrimEnd() + "`r`n`r`n" + $attribution + "`r`n"
    }

    # No "2>&1" on any of these. In Windows PowerShell, redirecting a native command's
    # stderr wraps each line in an ErrorRecord, and a plain git *warning* then becomes a
    # terminating error. On 2026-09-25 git's "LF will be replaced by CRLF" notice did
    # exactly that: Task 13a had passed review, its commit message was written, and the
    # runner died inside this function before committing. git's own messages go to the
    # console, where they belong.
    & git -C $RepoRoot add -A -- '.' ':(exclude)AI_WORKFLOW' ':(exclude)run-agent.ps1' ':(exclude)monitor-agent.ps1' ':(exclude)resume-agent.ps1' | Out-Null

    $staged = @(& git -C $RepoRoot diff --cached --name-only)
    if ($staged.Count -eq 0) {
        Write-Host 'Accepted commit skipped: the task changed no files outside AI_WORKFLOW.'
        Remove-Item -LiteralPath $messagePath -Force
        return
    }

    $prepared = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ('bax-commit-' + [guid]::NewGuid().ToString('N') + '.txt')
    [System.IO.File]::WriteAllText($prepared, $message, (New-Object System.Text.UTF8Encoding($false)))

    & git -C $RepoRoot commit -q -F $prepared
    $commitExit = $LASTEXITCODE
    Remove-Item -LiteralPath $prepared -Force -ErrorAction SilentlyContinue

    if ($commitExit -ne 0) {
        Write-Host ('Accepted commit FAILED (git exit {0}). COMMIT_MESSAGE.txt is kept for the owner.' -f $commitExit)
        return
    }

    Remove-Item -LiteralPath $messagePath -Force

    $hash = (& git -C $RepoRoot rev-parse --short HEAD | Select-Object -First 1)
    Write-Host ''
    Write-Host ('COMMITTED: {0}  ({1} files)' -f $hash, $staged.Count)

    # The hash only exists now, so the Reviewer could not have written it. STATE.json is
    # the one place the next Coordinator reads it from.
    $written = Set-StateField -Path $StatePath -Field 'lastAcceptedCommit' -Value ([string]$hash)

    if ($written.Ok) {
        Write-Host ('STATE.json lastAcceptedCommit = {0}' -f $hash)
    }
    else {
        Write-Host ''
        Write-Host ('INVALID_STATE — commit {0} was made, but its hash could NOT be recorded: {1}' -f $hash, $written.Error)
        Write-Host 'Put lastAcceptedCommit in AI_WORKFLOW/STATE.json by hand before starting the runner again.'
    }
}

# ---------------------------------------------------------------------------
# Console
# ---------------------------------------------------------------------------

function Write-Event {
    param(
        [Parameter(Mandatory = $true)][string] $Role,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string] $Message,
        [Parameter(Mandatory = $false)][string] $Colour = ''
    )

    $line = '[{0}] {1} | {2}' -f (Get-Date).ToString('HH:mm:ss'), $Role.ToUpperInvariant(), $Message
    if ([string]::IsNullOrWhiteSpace($Colour)) {
        Write-Host $line
    }
    else {
        Write-Host $line -ForegroundColor $Colour
    }
}

function Write-Banner {
    param(
        [Parameter(Mandatory = $true)][string] $Role,
        [Parameter(Mandatory = $true)][string] $Model,
        [Parameter(Mandatory = $true)][string] $Effort,
        [Parameter(Mandatory = $true)][int]    $Cycle,
        [Parameter(Mandatory = $true)][int]    $Limit
    )

    Write-Host ''
    Write-Host '=================================================='
    Write-Host $Role.ToUpperInvariant()
    Write-Host ('Model: {0}' -f $Model)
    Write-Host ('Effort: {0}' -f $Effort)
    Write-Host ('Cycle: {0}/{1}' -f $Cycle, $Limit)
    Write-Host '=================================================='
}

<# A tool call in one short line: the thing worth seeing while a role works. #>
function Get-ToolSummary {
    param($Block)

    $arguments = $Block.input
    if ($null -eq $arguments) {
        return ''
    }

    $names = $arguments.PSObject.Properties.Name
    $detail = ''
    foreach ($candidate in @('command', 'file_path', 'path', 'pattern', 'query', 'prompt')) {
        if ($names -contains $candidate) {
            $detail = [string]$arguments.$candidate
            break
        }
    }

    if ([string]::IsNullOrWhiteSpace($detail)) {
        return ''
    }

    $detail = ($detail -split "`r?`n")[0].Trim()
    if ($detail.Length -gt 110) {
        $detail = $detail.Substring(0, 110) + '...'
    }

    return $detail
}

<#
    Prints one line of the CLI's stream as it arrives, and returns the final text when
    the stream reports one.

    This is the whole point of streaming rather than capturing: a role that spends
    fifteen minutes reading files and running tests used to print nothing at all until
    it finished, so there was no way to tell work from a hang.

    Anything that cannot be interpreted is printed as a short fallback line rather than
    hidden — silence is the one thing this must never produce.
#>
function Write-StreamLine {
    param(
        [Parameter(Mandatory = $true)][string] $Role,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string] $Line
    )

    $text = $Line.Trim()
    if ([string]::IsNullOrWhiteSpace($text)) {
        return $null
    }

    if (-not $text.StartsWith('{')) {
        if ($text.Length -gt 160) {
            $text = $text.Substring(0, 160) + '...'
        }

        Write-Event -Role $Role -Message $text -Colour DarkGray
        return $null
    }

    try {
        $evt = $text | ConvertFrom-Json
    }
    catch {
        Write-Event -Role $Role -Message '(unreadable event)' -Colour DarkGray
        return $null
    }

    switch ($evt.type) {

        'system' {
            if ($evt.subtype -eq 'init') {
                Write-Event -Role $Role -Message 'session started' -Colour DarkGray
            }
        }

        'assistant' {
            foreach ($block in $evt.message.content) {
                if ($block.type -eq 'text') {
                    if (-not [string]::IsNullOrWhiteSpace($block.text)) {
                        foreach ($paragraph in ($block.text -split "`r?`n")) {
                            if (-not [string]::IsNullOrWhiteSpace($paragraph)) {
                                Write-Event -Role $Role -Message $paragraph
                            }
                        }
                    }
                }
                elseif ($block.type -eq 'tool_use') {
                    $summary = Get-ToolSummary -Block $block
                    if ([string]::IsNullOrWhiteSpace($summary)) {
                        Write-Event -Role $Role -Message $block.name -Colour Cyan
                    }
                    else {
                        Write-Event -Role $Role -Message ($block.name + '  ' + $summary) -Colour Cyan
                    }
                }
            }
        }

        'result' {
            if ($evt.subtype -ne 'success') {
                Write-Event -Role $Role -Message ('ended: ' + $evt.subtype) -Colour Yellow
            }

            $note = ''
            if (($evt.PSObject.Properties.Name -contains 'num_turns') -and $null -ne $evt.num_turns) {
                $note = $note + ('turns {0}' -f $evt.num_turns)
            }

            if (($evt.PSObject.Properties.Name -contains 'total_cost_usd') -and $null -ne $evt.total_cost_usd) {
                $note = $note + ('  cost ${0:N2}' -f $evt.total_cost_usd)
            }

            if (-not [string]::IsNullOrWhiteSpace($note)) {
                Write-Event -Role $Role -Message $note -Colour DarkGray
            }

            # The final assistant text. Routing is parsed from this and from nothing
            # else — never from the prose or tool calls streamed along the way.
            return $evt.result
        }
    }

    return $null
}

# ---------------------------------------------------------------------------
# Repository state
# ---------------------------------------------------------------------------

<#
    A fingerprint of the workflow files, so the runner can tell whether a role actually
    changed anything. Logs are excluded: they change on every run by definition.
#>
function Get-WorkflowFingerprint {
    param([Parameter(Mandatory = $true)][string] $Root)

    $folder = Join-Path -Path $Root -ChildPath 'AI_WORKFLOW'
    $builder = New-Object System.Text.StringBuilder

    foreach ($file in (Get-ChildItem -LiteralPath $folder -File -Recurse | Sort-Object FullName)) {
        if ($file.FullName -like '*\LOGS\*') {
            continue
        }

        [void]$builder.AppendLine($file.FullName + '|' + (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash)
    }

    return $builder.ToString()
}

<# What the working tree looks like, so a Coder that changed nothing can be spotted. #>
function Get-TreeFingerprint {
    try {
        return ((& git status --porcelain) | Out-String)
    }
    catch {
        return ''
    }
}

<#
    STATE.json, read as JSON, with a verdict instead of a guess.

    On 2026-09-25 the Planner wrote an unescaped quote into the reason text. The file
    stopped parsing, and every reader here silently saw an empty string: the status
    fingerprint went blank, the Coder's permission profile was built without its task
    number, and the accepted commit hash had nowhere to be recorded. Nothing said a word.
    A file that will not parse is a stop now, not a default.

    Returns @{ Ok = <bool>; State = <object or $null>; Error = <string> }.
#>
function Read-StateObject {
    param(
        [Parameter(Mandatory = $true)][string] $Path,
        [int] $Attempts = 3,
        [int] $DelayMs = 120
    )

    $lastError = ''

    for ($try = 1; $try -le $Attempts; $try = $try + 1) {
        try {
            if (-not (Test-Path -LiteralPath $Path)) {
                $lastError = 'the file does not exist'
            }
            else {
                $text = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)

                if ([string]::IsNullOrWhiteSpace($text)) {
                    $lastError = 'the file is empty'
                }
                else {
                    $state = $text | ConvertFrom-Json

                    if ($null -eq $state) {
                        $lastError = 'the file parsed to nothing'
                    }
                    else {
                        return @{ Ok = $true; State = $state; Error = '' }
                    }
                }
            }
        }
        catch {
            $lastError = $_.Exception.Message
        }

        # A role rewriting the file, or the replace below, can be caught mid-flight. That
        # race lasts milliseconds; a genuinely malformed file survives every attempt.
        if ($try -lt $Attempts) {
            Start-Sleep -Milliseconds $DelayMs
        }
    }

    return @{ Ok = $false; State = $null; Error = $lastError }
}

<#
    The one way this runner writes STATE.json.

    Serialize, prove the bytes on disk parse, and only then let them become STATE.json.
    Nothing here assembles JSON by hand: hand-assembled JSON is what broke the file.

    Returns the same shape as Read-StateObject, holding the state as it was read back.
#>
function Write-StateObject {
    param(
        [Parameter(Mandatory = $true)][string] $Path,
        [Parameter(Mandatory = $true)] $State
    )

    $folder = Split-Path -Path $Path -Parent
    $temp = Join-Path -Path $folder -ChildPath ('.state-' + [guid]::NewGuid().ToString('N') + '.tmp')
    $backup = Join-Path -Path $folder -ChildPath ('.state-' + [guid]::NewGuid().ToString('N') + '.bak')

    try {
        $json = $State | ConvertTo-Json -Depth 10

        # The temporary file shares the directory, so the replace stays on one volume and
        # no reader ever sees a half-written STATE.json.
        [System.IO.File]::WriteAllText($temp, $json, (New-Object System.Text.UTF8Encoding($false)))

        # What the next reader gets is the bytes on disk, not the string still in memory.
        $staged = Read-StateObject -Path $temp -Attempts 1
        if (-not $staged.Ok) {
            throw ('the serialized state did not parse back: {0}' -f $staged.Error)
        }

        $replaced = $false
        $lastError = ''

        for ($try = 1; $try -le 3; $try = $try + 1) {
            try {
                if (Test-Path -LiteralPath $Path) {
                    # File.Replace is the atomic swap. Every null form of its backup
                    # argument is refused here: PowerShell 5.1 hands the method an empty
                    # string and .NET calls that an illegal path, so the replace branch
                    # failed every time until a real backup name was passed. It is removed
                    # again in the finally below.
                    [System.IO.File]::Replace($temp, $Path, $backup)
                }
                else {
                    [System.IO.File]::Move($temp, $Path)
                }

                $replaced = $true
                break
            }
            catch {
                $lastError = $_.Exception.Message
                if ($try -lt 3) {
                    Start-Sleep -Milliseconds 150
                }
            }
        }

        if (-not $replaced) {
            throw ('the file could not be replaced after 3 attempts: {0}' -f $lastError)
        }

        $final = Read-StateObject -Path $Path
        if (-not $final.Ok) {
            throw ('the file did not parse after the write: {0}' -f $final.Error)
        }

        return $final
    }
    catch {
        return @{ Ok = $false; State = $null; Error = $_.Exception.Message }
    }
    finally {
        foreach ($leftover in @($temp, $backup)) {
            if (Test-Path -LiteralPath $leftover) {
                Remove-Item -LiteralPath $leftover -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

<#
    Change one field and write the whole file back through Write-StateObject. A field the
    file does not carry yet is added; every other field keeps the value it had.
#>
function Set-StateField {
    param(
        [Parameter(Mandatory = $true)][string] $Path,
        [Parameter(Mandatory = $true)][string] $Field,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string] $Value
    )

    $read = Read-StateObject -Path $Path
    if (-not $read.Ok) {
        return $read
    }

    $state = $read.State

    if ($null -eq $state.PSObject.Properties[$Field]) {
        Add-Member -InputObject $state -MemberType NoteProperty -Name $Field -Value $Value
    }
    else {
        $state.$Field = $Value
    }

    return (Write-StateObject -Path $Path -State $state)
}

<#
    One field, or nothing at all.

    This used to return an empty string when STATE.json would not parse, and the runner
    read that as an empty task id and an empty status and carried on. It throws now. A
    corrupted state is never a default, and the caller decides how to stop.
#>
function Get-StateField {
    param(
        [Parameter(Mandatory = $true)][string] $Path,
        [Parameter(Mandatory = $true)][string] $Field
    )

    $read = Read-StateObject -Path $Path
    if (-not $read.Ok) {
        Write-Host ('INVALID_STATE: AI_WORKFLOW/STATE.json could not be parsed ({0}).' -f $read.Error)
        throw ('INVALID_STATE: cannot read "{0}" — {1}' -f $Field, $read.Error)
    }

    return [string]$read.State.$Field
}

<#
    Did the role get anywhere?

    The first automated run burned cycles because the Planner could not write: it exited
    cleanly, changed nothing, and the Coordinator asked for it again. Exit code zero is
    not progress — something the role was supposed to move has to have moved.
#>
function Test-RoleProgress {
    param(
        [Parameter(Mandatory = $true)][string] $Role,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string] $StateBefore,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string] $StateAfter,
        [Parameter(Mandatory = $true)][bool]   $WorkflowChanged,
        [Parameter(Mandatory = $true)][bool]   $TreeChanged
    )

    if ($WorkflowChanged) {
        return $true
    }

    if ($StateAfter -ne $StateBefore) {
        return $true
    }

    # The Coder's other way of showing its work: the implementation itself.
    if ($Role -eq 'Coder' -and $TreeChanged) {
        return $true
    }

    return $false
}

# ---------------------------------------------------------------------------
# Invocation
# ---------------------------------------------------------------------------

<#
    One invocation of the CLI. Returns the final text and the exit code; the caller
    decides what to do with a failure. Nothing here retries, and nothing here interprets
    what the role said.
#>
function Invoke-ClaudeRole {
    param(
        [Parameter(Mandatory = $true)][string] $Role,
        [Parameter(Mandatory = $true)][string] $Model,
        [Parameter(Mandatory = $true)][string] $Effort,
        [Parameter(Mandatory = $true)][string] $Prompt,
        [Parameter(Mandatory = $true)][string] $Tools,
        [Parameter(Mandatory = $true)][string] $SettingsPath,
        [Parameter(Mandatory = $true)][int]    $Cycle,
        [Parameter(Mandatory = $true)][int]    $Limit,
        [Parameter(Mandatory = $false)][string] $LogPath = ''
    )

    Write-Banner -Role $Role -Model $Model -Effort $Effort -Cycle $Cycle -Limit $Limit

    $started = Get-Date
    Write-Event -Role $Role -Message ('started  ' + $Model + ' / ' + $Effort) -Colour Green

    $result = ''

    # One writer held open for the whole run, sharing the file with readers.
    #
    # Add-Content was used here and opened the file afresh for every line. Anything else
    # holding it — a role grepping its own transcript, a monitor tailing it — made that open
    # fail, and the failure was not cosmetic: on 2026-09-25 it killed the runner outright,
    # mid-Reviewer, after Task 13a had already passed and its commit message was written.
    # The commit never happened. Twice before, the same call had silently dropped lines and
    # left holes in the record a review is supposed to rely on.
    #
    # FileShare::ReadWrite is the point: readers may hold the file open and this still
    # writes. If the log cannot be opened at all, the run continues without it — losing the
    # transcript is bad, losing the run is worse.
    $logWriter = $null
    if (-not [string]::IsNullOrWhiteSpace($LogPath)) {
        try {
            $logStream = New-Object System.IO.FileStream(
                $LogPath,
                [System.IO.FileMode]::Append,
                [System.IO.FileAccess]::Write,
                [System.IO.FileShare]::ReadWrite)
            $logWriter = New-Object System.IO.StreamWriter($logStream, (New-Object System.Text.UTF8Encoding($false)))
            $logWriter.AutoFlush = $true
        }
        catch {
            Write-Event -Role $Role -Message ('log unavailable, continuing without it: ' + $_.Exception.Message) -Colour Yellow
            $logWriter = $null
        }
    }

    # --restricted makes --settings the whole policy: user, project and local settings
    # files are ignored, so a broad rule elsewhere on the machine cannot widen this.
    # stream-json rather than text, so the console shows the work as it happens.
    $global:LASTEXITCODE = 0
    & claude -p $Prompt `
        --model $Model `
        --effort $Effort `
        --restricted `
        --tools $Tools `
        --settings $SettingsPath `
        --output-format stream-json `
        --verbose 2>&1 |
        ForEach-Object {
            $line = [string]$_

            if ($null -ne $logWriter) {
                # A log that cannot be written must never take the run down with it.
                try { $logWriter.WriteLine($line) } catch { }
            }

            $emitted = Write-StreamLine -Role $Role -Line $line
            if ($null -ne $emitted) {
                $result = [string]$emitted
            }
        }

    $code = $LASTEXITCODE
    if ($null -eq $code) {
        $code = 0
    }

    if ($null -ne $logWriter) {
        try { $logWriter.Flush(); $logWriter.Dispose() } catch { }
    }

    $elapsed = (Get-Date) - $started
    Write-Event -Role $Role -Message ('finished — {0:hh\:mm\:ss}' -f $elapsed) -Colour Green

    return [pscustomobject]@{
        Output   = $result
        ExitCode = $code
        Elapsed  = $elapsed
    }
}

<#
    Reads the Coordinator's decision out of its final text.

    Only "Action:" lines are considered, so an action name mentioned in prose or in a
    streamed tool call cannot be mistaken for the decision. Markdown around the field and
    around the value is tolerated:

        Action: RUN_CODER
        - Action: RUN_CODER
        - **Action:** `RUN_CODER`

    Exactly one distinct valid action must be found. None, or two that disagree, is a
    runner error — the runner never guesses which one was meant.
#>
function Get-CoordinatorAction {
    param(
        [Parameter(Mandatory = $true)][AllowEmptyString()][string] $Output,
        [Parameter(Mandatory = $true)][string[]] $Allowed
    )

    $found = New-Object System.Collections.ArrayList
    $pattern = '^\s*(?:[-*+]\s+)?(?:\*\*)?\s*Action\s*(?:\*\*)?\s*:\s*(.+?)\s*$'

    foreach ($line in ($Output -split "`r?`n")) {
        $match = [regex]::Match($line, $pattern)
        if (-not $match.Success) {
            continue
        }

        $value = $match.Groups[1].Value
        $value = $value -replace '\*\*', ''
        $value = $value -replace '`', ''
        $value = $value.Trim().Trim('.').Trim()

        if ($Allowed -contains $value) {
            if (-not $found.Contains($value)) {
                [void]$found.Add($value)
            }
        }
    }

    return [pscustomobject]@{
        Actions = @($found)
        Count   = $found.Count
    }
}

<# The reason the workflow is blocked, read straight from the state file. #>
function Get-StateReason {
    param([Parameter(Mandatory = $true)][string] $Path)

    $reason = Get-StateField -Path $Path -Field 'reason'
    if ([string]::IsNullOrWhiteSpace($reason)) {
        return $null
    }

    return $reason
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

# The console has to render Azerbaijani text; this is local to this process and
# touches nothing outside it.
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
}
catch {
    # An older host may refuse; the runner still works, the accents may not.
}

$RunnerExitCode = 0
$originalLocation = Get-Location

try {
    $repoRoot = $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($repoRoot)) {
        Write-Host 'ERROR: cannot determine the repository root from $PSScriptRoot.'
        $RunnerExitCode = 1
        return
    }

    Set-Location -LiteralPath $repoRoot

    Write-Host 'BAX AI WORKFLOW'
    Write-Host ('Repository: {0}' -f $repoRoot)
    Write-Host ('Max cycles: {0}' -f $MaxCycles)

    # ---- preflight --------------------------------------------------------

    $claudeCommand = Get-Command claude -ErrorAction SilentlyContinue
    if ($null -eq $claudeCommand) {
        Write-Host ''
        Write-Host 'ERROR: the Claude CLI was not found on PATH.'
        Write-Host 'Nothing was invoked. Install or expose "claude" and run this again.'
        $RunnerExitCode = 1
        return
    }

    $missing = New-Object System.Collections.ArrayList
    foreach ($relative in $RequiredFiles) {
        $full = Join-Path -Path $repoRoot -ChildPath $relative
        if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
            [void]$missing.Add($relative)
        }
    }

    if ($missing.Count -gt 0) {
        Write-Host ''
        Write-Host 'ERROR: the workflow is not set up. These files are missing:'
        foreach ($item in $missing) {
            Write-Host ('  - {0}' -f $item)
        }

        Write-Host ''
        Write-Host 'No model was invoked. The runner does not create or repair workflow files.'
        $RunnerExitCode = 1
        return
    }

    $missingDirectories = New-Object System.Collections.ArrayList
    foreach ($relative in $RequiredDirectories) {
        $full = Join-Path -Path $repoRoot -ChildPath $relative
        if (-not (Test-Path -LiteralPath $full -PathType Container)) {
            [void]$missingDirectories.Add($relative)
        }
    }

    if ($missingDirectories.Count -gt 0) {
        Write-Host ''
        Write-Host 'ERROR: the workflow is not set up. These directories are missing:'
        foreach ($item in $missingDirectories) {
            Write-Host ('  - {0}' -f $item)
        }

        Write-Host ''
        Write-Host 'No model was invoked. The runner does not create or repair workflow files.'
        $RunnerExitCode = 1
        return
    }

    $statePath = Join-Path -Path $repoRoot -ChildPath 'AI_WORKFLOW/STATE.json'

    # Logs, not state. Every role's full stream is kept here so a finished run can be
    # read back line by line instead of scrolled for in a terminal buffer.
    $logFolder = Join-Path -Path $repoRoot -ChildPath $LogDirectory
    if (-not (Test-Path -LiteralPath $logFolder -PathType Container)) {
        [void](New-Item -ItemType Directory -Path $logFolder -Force)
    }

    $runStamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
    Write-Host ('Logs: {0}' -f (Join-Path -Path $LogDirectory -ChildPath ($runStamp + '-*.jsonl')))

    # ---- permission profiles ----------------------------------------------

    $profileFolder = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ('bax-agent-permissions-' + $runStamp)
    [void](New-Item -ItemType Directory -Path $profileFolder -Force)

    # Coordinator: reads and decides. It writes nothing at all.
    $coordinatorSettings = New-PermissionProfile -Folder $profileFolder -Role 'Coordinator' `
        -RepoRoot $repoRoot `
        -Allow (@('"Read"', '"Glob"', '"Grep"') + $ReadOnlyGit) `
        -Deny  (@('"Edit(//**)"') + $AlwaysDenied)

    # Planner and Reviewer: read anything, write only workflow files.
    $workflowAuthorAllow = @('"Read"', '"Glob"', '"Grep"', '"Edit(AI_WORKFLOW/**)"') + $ReadOnlyGit
    $workflowAuthorDeny = $ApplicationPaths + $AlwaysDenied

    $plannerSettings = New-PermissionProfile -Folder $profileFolder -Role 'Planner' `
        -RepoRoot $repoRoot -Allow $workflowAuthorAllow -Deny $workflowAuthorDeny

    $reviewerSettings = New-PermissionProfile -Folder $profileFolder -Role 'Reviewer' `
        -RepoRoot $repoRoot -Allow $workflowAuthorAllow -Deny $workflowAuthorDeny

    # Coder: writes the application, and the two workflow files CODER_PROMPT.md names.
    # The rest of the workflow belongs to the Planner and the Reviewer, so it is denied.
    #
    # "dotnet run" is not here at all. Running an arbitrary project is arbitrary code
    # execution inside the repository, and one of those projects would be free to write
    # to the live database. Even the named catalogue tool is withheld: it belongs to
    # Task 3, so it is granted by the Task 3 branch below and by nothing else.
    $coderAllow = @(
        '"Read"', '"Glob"', '"Grep"',
        '"Edit(src/**)"', '"Edit(frontend/**)"', '"Edit(tests/**)"', '"Edit(tools/**)"',
        # The solution file, so a new project can be registered where the build and the
        # test run will actually see it. Named exactly; the rest of the repository root
        # stays out of reach.
        '"Edit(BaxOrders.slnx)"',
        # Audit write-ups, and only those. Task 15 records the final audit under
        # docs/audits/, and the Coder had no way to write there: the rest of docs/ is
        # reference the tasks read rather than produce — business-decisions.md above all,
        # which is evidence and must not be edited by a role.
        '"Edit(docs/audits/**)"',
        '"Edit(AI_WORKFLOW/STATE.json)"', '"Edit(AI_WORKFLOW/LAST_REPORT.md)"',
        # Deleting a file is part of implementing a task — Task 11b merged two pages and
        # had to retire five files — and until now no role could do it. The Coder left
        # comment-only placeholders, the Reviewer could not accept them, and FIX_REQUIRED
        # would have looped, because a second Coder run would be refused the same way.
        #
        # Only "git rm", never "rm". That matters more than it looks: git rm removes only
        # *tracked* files, and everything this workflow must protect from a role —
        # AI_WORKFLOW/ with the owner briefs, this runner, the monitor — is untracked. So
        # the narrow spelling cannot reach them, whatever path is passed to it. Every
        # deletion also lands in the diff the Reviewer reads, and in a commit that
        # "git reset" undoes.
        '"Bash(git rm:*)"',
        '"Bash(dotnet build:*)"', '"Bash(dotnet test:*)"',
        '"Bash(npm run:*)"', '"Bash(npm ci:*)"',
        '"Bash(npx vitest:*)"', '"Bash(npx tsc:*)"'
    ) + $ReadOnlyGit

    $coderDeny = @(
        '"Edit(AI_WORKFLOW/PLAN.md)"',
        '"Edit(AI_WORKFLOW/CURRENT_TASK.md)"',
        '"Edit(AI_WORKFLOW/WORKFLOW_RULES.md)"',
        '"Edit(AI_WORKFLOW/TASKS/**)"'
    ) + $AlwaysDenied

    # The database is closed to the Coder unless the task at hand is a data task, and the
    # task's own specification is what says so: a line reading "DATA_MIGRATION: yes". The
    # Planner writes that line, the Reviewer can see it in the diff, and it is read from
    # the file rather than written into the profile, so the permission disappears the
    # moment the current task changes. A tool built for one task cannot be run again by a
    # later one by accident.
    #
    # This is rebuilt before *every* Coder run, not once per run. A single run now carries
    # the whole queue, so a profile computed at startup would freeze the first task's
    # permissions onto all thirteen — closing the database on the one task that needs it,
    # and leaving it open afterwards if that first task had been the data one.
    #
    # psql is never granted, for any task. A shell that can run arbitrary SQL cannot be
    # told apart from one that can destroy the data.
    # "dotnet run" is never granted in general: running an arbitrary project is arbitrary
    # code execution, and one of them could write to the live database. What is granted is
    # the one tool the current task's own specification names, read out of that file.
    #
    # The earlier attempt wrote the rule as "tools/" and expected it to cover whatever came
    # after. It did not: the matcher compares at a word boundary, so "tools/" never reached
    # "tools/BaxOrders.ProductMatchMigration". Task 13a's Coder finished its code, was
    # refused its own first command, and — correctly — stopped rather than reaching the
    # database another way. Naming the project in full is what Task 3 did and what works.
    $dataTaskOnly = @('"Bash(pg_dump:*)"')

    $script:BuildCoderProfile = {
        param([string] $Task)

        $isDataTask = $false

        if (-not [string]::IsNullOrWhiteSpace($Task)) {
            # A task number may carry a split suffix — "04a", or "4a" if written short.
            # Normalise the digits to two places and keep the letter: 4a and 04a both
            # mean TASK-04a.md.
            $m = [regex]::Match($Task, '^\s*(\d+)([A-Za-z]*)\s*$')
            $fileKey = if ($m.Success) { $m.Groups[1].Value.PadLeft(2, '0') + $m.Groups[2].Value.ToLowerInvariant() } else { $Task }

            $specPath = Join-Path -Path $repoRoot -ChildPath ('AI_WORKFLOW/TASKS/TASK-{0}.md' -f $fileKey)
            if (Test-Path -LiteralPath $specPath) {
                $specText = [System.IO.File]::ReadAllText($specPath, [System.Text.Encoding]::UTF8)
                if ($specText -match '(?im)^\s*DATA_MIGRATION\s*:\s*yes\s*$') {
                    $isDataTask = $true
                }
            }
            else {
                Write-Host ('Coder profile: no specification found at TASK-{0}.md.' -f $fileKey)
            }
        }

        $allow = $coderAllow
        $deny = $coderDeny

        if ($isDataTask) {
            # Every tool project the specification names, each granted in full. A task that
            # forgets to name its tool gets no way to run one, which fails closed.
            $tools = @()
            # Matched only where the specification actually calls the tool, not wherever a
            # tools/ path is mentioned: Task 13a names Task 3's catalogue tool as the model
            # to copy, and nothing should re-run that by accident.
            foreach ($m in [regex]::Matches($specText, 'dotnet\s+run\s+--project\s+tools/(?<name>[A-Za-z0-9][A-Za-z0-9._-]*)')) {
                $name = $m.Groups['name'].Value
                if ($tools -notcontains $name) { $tools += $name }
            }

            $toolRules = @($tools | ForEach-Object { '"Bash(dotnet run --project tools/{0}:*)"' -f $_ })
            $granted = $dataTaskOnly + $toolRules

            $allow = $coderAllow + $granted
            $deny = @($coderDeny | Where-Object { $granted -notcontains $_ })

            if ($tools.Count -eq 0) {
                Write-Host ('Coder profile: task {0} is a data task, but its specification names no tools/ project — pg_dump only.' -f $Task)
            }
            else {
                Write-Host ('Coder profile: task {0} is a data task — pg_dump and {1} allowed; psql still denied.' -f $Task, ($tools -join ', '))
            }
        }
        else {
            Write-Host ('Coder profile: no database commands (task {0} is not marked DATA_MIGRATION).' -f $Task)
        }

        return (New-PermissionProfile -Folder $profileFolder -Role 'Coder' `
                -RepoRoot $repoRoot -Allow $allow -Deny $deny)
    }

    # Nothing starts on a state the runner cannot read. The cycle loop repeats this check;
    # here it stops the runner before it has built a single permission profile.
    $startup = Read-StateObject -Path $statePath
    if (-not $startup.Ok) {
        Write-Host ''
        Write-Host 'WORKFLOW NOT STARTED — INVALID_STATE'
        Write-Host ('AI_WORKFLOW/STATE.json could not be parsed: {0}' -f $startup.Error)
        Write-Host 'Usually an unescaped quote inside "reason". Repair the JSON by hand, then start again.'
        $RunnerExitCode = 1
        return
    }

    $currentTask = [string]$startup.State.currentTask
    $coderSettings = & $script:BuildCoderProfile $currentTask

    Write-Host ('Permissions: {0}' -f $profileFolder)

    # ---- cycle loop -------------------------------------------------------

    $cycle = 0
    $stalled = 0
    $previousAction = ''
    while ($true) {
        $cycle = $cycle + 1

        if ($cycle -gt $MaxCycles) {
            Write-Host ''
            Write-Host 'WORKFLOW STOPPED — MAX CYCLES REACHED'
            Write-Host ('The runner made {0} Coordinator decisions without reaching a stop.' -f $MaxCycles)
            Write-Host 'Workflow state was left exactly as it is.'
            $RunnerExitCode = 1
            return
        }

        Write-Host ''
        Write-Host ('[Cycle {0}]' -f $cycle)

        # Fail closed at the top of every cycle. A STATE.json that will not parse is not a
        # blank slate: no role is dispatched, nothing is committed, and the file is left
        # exactly as it is for a hand repair.
        $cycleState = Read-StateObject -Path $statePath
        if (-not $cycleState.Ok) {
            Write-Host ''
            Write-Host 'WORKFLOW STOPPED — INVALID_STATE'
            Write-Host ('AI_WORKFLOW/STATE.json could not be parsed: {0}' -f $cycleState.Error)
            Write-Host 'No role was dispatched and nothing was committed.'
            Write-Host 'Usually an unescaped quote inside "reason". Repair the JSON by hand, then start again.'
            $RunnerExitCode = 1
            return
        }

        $coordinator = Invoke-ClaudeRole `
            -Role 'Coordinator' `
            -Model $CoordinatorModel `
            -Effort $CoordinatorEffort `
            -Prompt $CoordinatorPrompt `
            -Tools $RoleTools.Coordinator `
            -SettingsPath $coordinatorSettings `
            -LogPath (Join-Path -Path $logFolder -ChildPath ('{0}-cycle{1:D2}-coordinator.jsonl' -f $runStamp, $cycle)) `
            -Cycle $cycle `
            -Limit $MaxCycles

        if ($coordinator.ExitCode -ne 0) {
            Write-Host ''
            Write-Host ('ERROR: the Coordinator process exited with code {0}.' -f $coordinator.ExitCode)
            Write-Host 'The runner stops here and does not retry.'
            $RunnerExitCode = $coordinator.ExitCode
            return
        }

        $parsed = Get-CoordinatorAction -Output $coordinator.Output -Allowed $ValidActions

        if ($parsed.Count -eq 0) {
            Write-Host ''
            Write-Host 'ERROR: no valid Action was found in the Coordinator output.'
            Write-Host ('Expected one of: {0}' -f ($ValidActions -join ', '))
            Write-Host 'The runner does not guess the intended action.'
            $RunnerExitCode = 1
            return
        }

        if ($parsed.Count -gt 1) {
            Write-Host ''
            Write-Host 'ERROR: the Coordinator output names more than one action:'
            foreach ($item in $parsed.Actions) {
                Write-Host ('  - {0}' -f $item)
            }

            Write-Host 'The runner does not guess which one was meant.'
            $RunnerExitCode = 1
            return
        }

        $action = $parsed.Actions[0]

        Write-Host ''
        Write-Host ('Coordinator action: {0}' -f $action)

        # Second layer: the same role asked for over and over. The immediate progress
        # check below catches a role that moves nothing at all; this catches one that
        # moves something every time without the workflow getting anywhere.
        if ($action -eq $previousAction -and $action.StartsWith('RUN_')) {
            $stalled = $stalled + 1
        }
        else {
            $stalled = 0
        }

        $previousAction = $action

        if ($stalled -ge $StallLimit) {
            Write-Host ''
            Write-Host 'WORKFLOW STOPPED — NO PROGRESS'
            Write-Host ('Role: {0}' -f $action.Substring(4))
            Write-Host ('The Coordinator asked for {0} {1} cycles in a row without the workflow advancing.' -f $action, ($stalled + 1))
            Write-Host 'Workflow state was left exactly as it is.'
            $RunnerExitCode = 1
            return
        }

        # Everything a non-Coordinator role is expected to move, captured before it runs.
        # The Coordinator has run since the cycle gate, so the file is read again.
        $beforeState = Read-StateObject -Path $statePath
        if (-not $beforeState.Ok) {
            Write-Host ''
            Write-Host 'WORKFLOW STOPPED — INVALID_STATE'
            Write-Host ('AI_WORKFLOW/STATE.json stopped parsing before {0} could be dispatched: {1}' -f $action, $beforeState.Error)
            Write-Host 'No role was dispatched and nothing was committed.'
            $RunnerExitCode = 1
            return
        }

        $stateBefore = [string]$beforeState.State.status
        $workflowBefore = Get-WorkflowFingerprint -Root $repoRoot
        $treeBefore = Get-TreeFingerprint

        $roleRan = ''
        $roleExit = 0

        switch ($action) {

            'RUN_PLANNER' {
                $planner = Invoke-ClaudeRole `
                    -Role 'Planner' `
                    -Model $PlannerModel `
                    -Effort $PlannerEffort `
                    -Prompt $PlannerPrompt `
                    -Tools $RoleTools.Planner `
                    -SettingsPath $plannerSettings `
                    -LogPath (Join-Path -Path $logFolder -ChildPath ('{0}-cycle{1:D2}-planner.jsonl' -f $runStamp, $cycle)) `
                    -Cycle $cycle `
                    -Limit $MaxCycles

                $roleRan = 'Planner'
                $roleExit = $planner.ExitCode
            }

            'RUN_CODER' {
                $coder = Invoke-ClaudeRole `
                    -Role 'Coder' `
                    -Model $CoderModel `
                    -Effort $CoderEffort `
                    -Prompt $CoderPrompt `
                    -Tools $RoleTools.Coder `
                    -SettingsPath (& $script:BuildCoderProfile ([string]$beforeState.State.currentTask)) `
                    -LogPath (Join-Path -Path $logFolder -ChildPath ('{0}-cycle{1:D2}-coder.jsonl' -f $runStamp, $cycle)) `
                    -Cycle $cycle `
                    -Limit $MaxCycles

                $roleRan = 'Coder'
                $roleExit = $coder.ExitCode
            }

            'RUN_REVIEWER' {
                $reviewer = Invoke-ClaudeRole `
                    -Role 'Reviewer' `
                    -Model $ReviewerModel `
                    -Effort $ReviewerEffort `
                    -Prompt $ReviewerPrompt `
                    -Tools $RoleTools.Reviewer `
                    -SettingsPath $reviewerSettings `
                    -LogPath (Join-Path -Path $logFolder -ChildPath ('{0}-cycle{1:D2}-reviewer.jsonl' -f $runStamp, $cycle)) `
                    -Cycle $cycle `
                    -Limit $MaxCycles

                $roleRan = 'Reviewer'
                $roleExit = $reviewer.ExitCode

                # A pass leaves a commit message behind. Nothing else does.
                Invoke-AcceptedCommit -RepoRoot $repoRoot -StatePath $statePath
            }

            'STOP_HUMAN_REQUIRED' {
                Write-Host ''
                Write-Host 'WORKFLOW STOPPED — HUMAN DECISION REQUIRED'

                $reason = $null
                try {
                    $reason = Get-StateReason -Path $statePath
                }
                catch {
                    Write-Host ('INVALID_STATE: the reason could not be read — {0}' -f $_.Exception.Message)
                }

                if ($null -eq $reason) {
                    Write-Host 'Reason: (none recorded in AI_WORKFLOW/STATE.json)'
                }
                else {
                    Write-Host ('Reason: {0}' -f $reason)
                }

                $RunnerExitCode = 0
                return
            }

            'STOP_DONE' {
                Write-Host ''
                Write-Host 'WORKFLOW COMPLETE'
                $RunnerExitCode = 0
                return
            }

            'STOP_SETUP' {
                Write-Host ''
                Write-Host 'WORKFLOW STOPPED — SETUP INCOMPLETE'
                $RunnerExitCode = 0
                return
            }

            'STOP_RUNNING' {
                Write-Host ''
                Write-Host 'WORKFLOW STOPPED — STATE IS ALREADY RUNNING'
                Write-Host 'The runner does not repair the state. Finish or reconcile the active execution.'
                $RunnerExitCode = 0
                return
            }

            'STOP_STATE_CONFLICT' {
                Write-Host ''
                Write-Host 'WORKFLOW STOPPED — STATE CONFLICT'
                Write-Host 'The workflow files disagree. The runner does not repair them.'
                $RunnerExitCode = 1
                return
            }

            default {
                # Unreachable: the parser only returns actions from $ValidActions.
                Write-Host ''
                Write-Host ('ERROR: unhandled action "{0}".' -f $action)
                $RunnerExitCode = 1
                return
            }
        }

        # ---- the role has run; did it get anywhere? -----------------------

        if ($roleExit -ne 0) {
            Write-Host ''
            Write-Host ('ERROR: the {0} process exited with code {1}.' -f $roleRan, $roleExit)
            Write-Host 'The runner stops here and does not retry.'
            $RunnerExitCode = $roleExit
            return
        }

        $afterState = Read-StateObject -Path $statePath
        if (-not $afterState.Ok) {
            Write-Host ''
            Write-Host 'WORKFLOW STOPPED — INVALID_STATE'
            Write-Host ('{0} left AI_WORKFLOW/STATE.json unparseable: {1}' -f $roleRan, $afterState.Error)
            Write-Host 'The next role was not dispatched. Repair the JSON by hand, then start again.'
            $RunnerExitCode = 1
            return
        }

        $stateAfter = [string]$afterState.State.status
        $workflowChanged = ((Get-WorkflowFingerprint -Root $repoRoot) -ne $workflowBefore)
        $treeChanged = ((Get-TreeFingerprint) -ne $treeBefore)

        $progressed = Test-RoleProgress `
            -Role $roleRan `
            -StateBefore $stateBefore `
            -StateAfter $stateAfter `
            -WorkflowChanged $workflowChanged `
            -TreeChanged $treeChanged

        if (-not $progressed) {
            Write-Host ''
            Write-Host 'WORKFLOW STOPPED — NO PROGRESS'
            Write-Host ('Role: {0}' -f $roleRan.ToUpperInvariant())
            Write-Host ('State remained: {0}' -f $stateAfter)
            Write-Host 'No expected workflow file changed.'
            Write-Host ''
            Write-Host 'The role exited cleanly but moved nothing. It is most likely unable to write'
            Write-Host 'the files it needs. Workflow state was left exactly as it is, and no further'
            Write-Host 'Coordinator cycle was started.'
            $RunnerExitCode = 1
            return
        }

        Write-Host ('{0} finished; state {1} -> {2}' -f $roleRan, $stateBefore, $stateAfter)
    }
}
catch {
    # An unhandled error used to leave a red stack trace and an exit code of 0, which the
    # wrapper read as a clean stop.
    Write-Host ''
    Write-Host ('ERROR: the runner stopped on an unhandled error: {0}' -f $_.Exception.Message)
    $RunnerExitCode = 1
}
finally {
    Set-Location -LiteralPath $originalLocation

    # The exit belongs here, not after the try/finally.
    #
    # Every stop in the loop above uses "return", and at script scope that ends the script
    # immediately — an "exit" written after this block is never reached. run-agent.ps1
    # therefore exited 0 whatever went wrong: a state conflict, a stalled role, a Coder killed
    # mid-run. resume-agent.ps1 decides whether to resume from exactly that code, so it never
    # saw a single failure and never resumed one. Found on 2026-09-26, when the Coder for 22a
    # was cut off by ECONNRESET and the wrapper called it "stopped on its own terms".
    exit $RunnerExitCode
}
