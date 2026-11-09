#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Resolves the APM packages registry for initialization Phase 1.7-APM.

.DESCRIPTION
    Replaces the legacy prepare-role-packs.ps1. Fetches the registry index.json
    from one or more registry sources (built-in Workplace-Agent-Packages repo,
    external URL(s), or both), validates the x-workplace blocks of every entry,
    filters by the user's selected role(s), and writes the deterministic selection
    file consumed by /initialize Phase 1.7-APM.

    The built-in catalogue lives in the standalone Workplace-Agent-Packages repo
    (apmPackages.registryRepoUrl in .core-version.json). Packages sit at the repo
    root (one <id>/ directory each), so the index.json is fetched from the repo
    root and each entry's path is the bare package id.

    Three registry-source modes (see apm-workflow.md Section 4):
      builtin  - fetch raw index.json from apmPackages.registryRepoUrl in .core-version.json
      external - fetch one or more user-supplied URLs
      both     - merge builtin + external (builtin wins on conflict by default)

    Role-agnostic mode (-RoleAgnosticOnly), used by /quick-init Step 4.5:
    no roles are required; instead of the matched/optional/standalone buckets
    the script selects every package whose xWorkplace.targetRoles is empty or
    absent into a `roleAgnosticPackages` array. The predicate is evaluated at
    runtime against whatever index the resolution ladder returned (live HTTPS,
    git clone, or offline snapshot) - no package names are hardcoded, so
    catalogue changes (added/removed/re-classified packages) are picked up
    automatically without touching this script.

    Authoritative procedure document:
      .opencode/skills/project-initialization/references/apm-workflow.md

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/prepare-apm-packages.ps1 -Roles backend,fullstack -Mode builtin

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/prepare-apm-packages.ps1 -Roles qa -Mode both -ExternalUrls 'https://internal.example.com/index.json'

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/prepare-apm-packages.ps1 -RoleAgnosticOnly -Mode builtin

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/prepare-apm-packages.ps1 -Cleanup
#>

[CmdletBinding()]
param(
  [string[]]$Roles = @(),
  [ValidateSet('builtin','external','both')]
  [string]$Mode = 'builtin',
  [string[]]$ExternalUrls = @(),
  [switch]$AllowGitFallback,
  [switch]$NoOfflineSnapshot,
  [switch]$Cleanup,
  [switch]$RoleAgnosticOnly
)

$ErrorActionPreference = 'Stop'

$SelectionFile = '.opencode/.temp-apm-selection.json'
$OfflineSnapshot = '.opencode/rules/packages-index.json'
$VersionFile = '.opencode/rules/.core-version.json'
$GitCloneDir = '.opencode/.tmp-apm-clone'                   # cleaned at end

function Remove-IfExists([string]$Path) {
  if (Test-Path $Path) { Remove-Item -Force -Recurse $Path }
}

function Test-LooksLikeHtml([string]$Content) {
  if ([string]::IsNullOrWhiteSpace($Content)) { return $false }
  $head = $Content.Substring(0, [Math]::Min(512, $Content.Length)).TrimStart()
  return $head -match '^(<!DOCTYPE html|<html|<\?xml.*?>\s*<html)' -or $head -match '<title>.*Sign in.*</title>'
}

function ConvertTo-NormalizedRoles([string[]]$InputRoles) {
  $aliases = @{
    'frontend' = 'frontend'; 'frontend developer' = 'frontend'; 'front-end' = 'frontend'
    'backend' = 'backend'; 'backend developer' = 'backend'; 'back-end' = 'backend'
    'fullstack' = 'fullstack'; 'full-stack' = 'fullstack'; 'full stack' = 'fullstack'
    'qa' = 'qa'; 'qa engineer' = 'qa'; 'test automation engineer' = 'qa'
    'performance' = 'performance'; 'performance engineer' = 'performance'
    'ba' = 'ba'; 'business analyst' = 'ba'
    'upgrade' = 'upgrade'; 'product upgrade' = 'upgrade'; 'product upgrade engineer' = 'upgrade'
    'mobile' = 'mobile'; 'designer' = 'designer'
  }
  $normalized = foreach ($role in $InputRoles) {
    foreach ($item in ($role -split ',')) {
      $key = $item.Trim().ToLowerInvariant()
      if ($key.Length -eq 0) { continue }
      if (-not $aliases.ContainsKey($key)) {
        throw "Unknown role '$item'. Use: frontend, backend, fullstack, qa, performance, ba, upgrade, mobile, designer."
      }
      $aliases[$key]
    }
  }
  return @($normalized | Select-Object -Unique)
}

function Read-TemplateInfo {
  if (-not (Test-Path $VersionFile)) {
    throw "Missing $VersionFile. Re-run /initialize Phase 0 or supply -ExternalUrls."
  }
  $v = Get-Content $VersionFile -Raw | ConvertFrom-Json
  # The package catalogue lives in the standalone Workplace-Agent-Packages repo
  # (apmPackages.registryRepoUrl). Fall back to templateSource only for legacy
  # .core-version.json files written before the packages split.
  $apm = $v.apmPackages
  $url = if ($apm -and $apm.registryRepoUrl) { $apm.registryRepoUrl } else { $v.templateSource.url }
  $branch = if ($apm -and $apm.registryBranch) { $apm.registryBranch }
            elseif ($v.templateSource.branch) { $v.templateSource.branch }
            else { 'master' }
  if (-not $url) { throw "apmPackages.registryRepoUrl (or templateSource.url) missing from $VersionFile." }
  $repo = $url -replace '\.git$',''
  return @{
    GitUrl    = $url                            # for git clone
    RawUrl    = "$repo/raw/$branch/index.json"  # GitLab/GitHub raw URL (root layout)
    Branch    = $branch
  }
}

function Fetch-Json([string]$Url) {
  try {
    $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -ErrorAction Stop
    $contentType = ''
    if ($resp.Headers -and $resp.Headers.ContainsKey('Content-Type')) {
      $contentType = [string]$resp.Headers['Content-Type']
    }
    $isHtmlByType = $contentType -match 'text/html'
    $isHtmlByBody = Test-LooksLikeHtml $resp.Content
    if ($isHtmlByType -or $isHtmlByBody) {
      Write-Warning "Fetch returned HTML (not JSON) for $Url. This usually means the registry URL requires authentication (e.g. private GitLab login page). Content-Type='$contentType'."
      return @{ ok = $false; reason = 'html'; url = $Url }
    }
    try {
      $json = $resp.Content | ConvertFrom-Json -ErrorAction Stop
      return @{ ok = $true; index = $json; url = $Url }
    } catch {
      Write-Warning "Fetch returned non-JSON body for $Url : $($_.Exception.Message)"
      return @{ ok = $false; reason = 'invalid-json'; url = $Url; detail = $_.Exception.Message }
    }
  } catch [System.Net.WebException] {
    $status = $null
    try { $status = [int]$_.Exception.Response.StatusCode } catch {}
    Write-Warning "HTTP error fetching $Url : status=$status, $($_.Exception.Message)"
    return @{ ok = $false; reason = 'http-error'; url = $Url; status = $status; detail = $_.Exception.Message }
  } catch {
    Write-Warning "Fetch failed for $Url : $($_.Exception.Message)"
    return @{ ok = $false; reason = 'fetch-error'; url = $Url; detail = $_.Exception.Message }
  }
}

function Load-OfflineSnapshot {
  if ($NoOfflineSnapshot) { return $null }
  if (Test-Path $OfflineSnapshot) {
    Write-Warning "Falling back to offline snapshot at $OfflineSnapshot (may be stale; refreshed by /update-workplace)."
    try {
      return Get-Content $OfflineSnapshot -Raw | ConvertFrom-Json -ErrorAction Stop
    } catch {
      Write-Warning "Offline snapshot at $OfflineSnapshot is corrupt: $($_.Exception.Message)"
    }
  }
  return $null
}

function Invoke-GitCloneIndex([string]$GitUrl, [string]$Branch, [string]$Dest, [switch]$NoPartial) {
  <#
    Shallow-clone $GitUrl into $Dest. Returns @{ ok; exitCode; stderr }.

    Native stderr goes to a FILE and is never merged with `2>&1`. git writes ordinary
    progress ("Cloning into 'x'...") to stderr; under Windows PowerShell 5.1 `2>&1`
    wraps every such line in an ErrorRecord, and with $ErrorActionPreference='Stop'
    the first one aborts the script - reporting "Git fallback failed: Cloning into
    'x'..." for a clone that actually SUCCEEDED, which silently demoted every private
    registry to the stale offline snapshot. Judge the run by $LASTEXITCODE alone.
  #>
  $errFile = Join-Path ([System.IO.Path]::GetTempPath()) ("apm-git-{0}.err" -f ([guid]::NewGuid().ToString('N')))
  $gitArgs = @('-c', 'advice.detachedHead=false', 'clone', '--depth', '1')
  if (-not $NoPartial) { $gitArgs += @('--filter=blob:none', '--sparse') }
  $gitArgs += @('--branch', $Branch, $GitUrl, $Dest)

  $prevPref = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $code = -1
  try {
    & git @gitArgs 2> $errFile
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $prevPref
  }

  $stderr = ''
  if (Test-Path $errFile) {
    $stderr = [string](Get-Content $errFile -Raw -ErrorAction SilentlyContinue)
    Remove-Item -Force $errFile -ErrorAction SilentlyContinue
  }
  return @{ ok = ($code -eq 0); exitCode = $code; stderr = $stderr }
}

function Fetch-Json-ViaGit([string]$GitUrl, [string]$Branch) {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Warning "git CLI not on PATH -- cannot use git fallback."
    return $null
  }
  Remove-IfExists $GitCloneDir
  Write-Host "Attempting authenticated git fallback (sparse clone of $GitUrl @ $Branch)" -ForegroundColor Cyan

  # A --sparse clone checks out the repo's root-level files by default, which is
  # exactly where index.json lives in the root-layout packages repo.
  $r = Invoke-GitCloneIndex $GitUrl $Branch $GitCloneDir
  if (-not $r.ok) {
    # Not every host advertises filter v2 / partial clone; retry as a plain shallow clone.
    Write-Warning "Partial (--filter=blob:none --sparse) clone failed with exit code $($r.exitCode); retrying as a plain shallow clone."
    if ($r.stderr.Trim()) { Write-Host $r.stderr.TrimEnd() -ForegroundColor DarkGray }
    Remove-IfExists $GitCloneDir
    $r = Invoke-GitCloneIndex $GitUrl $Branch $GitCloneDir -NoPartial
  }
  if (-not $r.ok) {
    Write-Warning "Git fallback failed: git clone returned exit code $($r.exitCode)."
    if ($r.stderr.Trim()) { Write-Host $r.stderr.TrimEnd() -ForegroundColor DarkGray }
    return $null
  }

  $local = Join-Path $GitCloneDir 'index.json'
  if (-not (Test-Path $local)) {
    Write-Warning "Git fallback: clone succeeded but $local is missing (wrong branch, or the repo is not root-layout)."
    return $null
  }
  Write-Host "Git fallback succeeded -- reading index from $local" -ForegroundColor Green
  try {
    return Get-Content $local -Raw | ConvertFrom-Json -ErrorAction Stop
  } catch {
    Write-Warning "Git fallback: $local is not valid JSON: $($_.Exception.Message)"
    return $null
  }
}

function Test-PackageEntry($entry, [System.Collections.Generic.List[string]]$errors) {
  if (-not $entry.name)    { $errors.Add("entry missing 'name'") }
  if (-not $entry.version) { $errors.Add("$($entry.name): missing 'version'") }
  if (-not $entry.path)    { $errors.Add("$($entry.name): missing 'path'") }
  $xw = $entry.xWorkplace
  if (-not $xw) { $errors.Add("$($entry.name): missing 'xWorkplace' block"); return }
  if ($xw.schemaVersion -ne 1) { $errors.Add("$($entry.name): xWorkplace.schemaVersion must be 1") }
  if ($xw.type -notin @('role-pack','module','skill')) { $errors.Add("$($entry.name): xWorkplace.type must be role-pack|module|skill") }
}

if ($Cleanup) {
  Remove-IfExists $SelectionFile
  Remove-IfExists $GitCloneDir
  Write-Host 'APM selection file cleaned.' -ForegroundColor Green
  exit 0
}

$selectedRoles = @(ConvertTo-NormalizedRoles $Roles)
if (-not $RoleAgnosticOnly -and $selectedRoles.Count -eq 0) { throw 'No roles provided. Example: -Roles backend,fullstack' }

# --- fetch indices ---------------------------------------------------------
# Resolution ladder for the BUILT-IN source (skipped if -Mode external):
#   1. HTTPS raw fetch -> apmPackages.registryRepoUrl raw index.json (root layout)
#   2. If HTTPS returned HTML (auth wall) and -AllowGitFallback or git is available:
#      authenticated git clone --depth 1 --filter=blob:none --sparse
#   3. Offline snapshot at .opencode/rules/packages-index.json
# Each step that succeeds short-circuits the ladder. Steps log clearly which path won
# so the agent can record the decision in the Decision Log section 1.7.

$sources = @()
$builtinFailure = $null

if ($Mode -in @('builtin','both')) {
  $tpl = Read-TemplateInfo
  Write-Host "Fetching built-in index from $($tpl.RawUrl)" -ForegroundColor Cyan
  $res = Fetch-Json $tpl.RawUrl
  if ($res.ok) {
    $sources += @{ url = $tpl.RawUrl; index = $res.index; priority = 0; resolvedVia = 'https-raw' }
  } else {
    # Step 2 -- git fallback when allowed or HTML detected
    $shouldTryGit = $AllowGitFallback -or ($res.reason -eq 'html')
    if ($shouldTryGit) {
      $gitIdx = Fetch-Json-ViaGit $tpl.GitUrl $tpl.Branch
      if ($gitIdx) {
        $sources += @{ url = $tpl.GitUrl; index = $gitIdx; priority = 0; resolvedVia = 'git-clone' }
      }
    }
    if ($sources.Count -eq 0) { $builtinFailure = $res }
  }
}

if ($Mode -in @('external','both')) {
  foreach ($u in $ExternalUrls) {
    Write-Host "Fetching external index from $u" -ForegroundColor Cyan
    $res = Fetch-Json $u
    if ($res.ok) {
      $sources += @{ url = $u; index = $res.index; priority = 1; resolvedVia = 'https-external' }
    }
  }
}

# Step 3 -- offline snapshot (last resort)
if ($sources.Count -eq 0) {
  $offline = Load-OfflineSnapshot
  if ($offline) {
    $sources += @{ url = $OfflineSnapshot; index = $offline; priority = 0; resolvedVia = 'offline-snapshot' }
  } else {
    $hint = @()
    if ($builtinFailure) {
      switch ($builtinFailure.reason) {
        'html' {
          $hint += "Registry URL returned HTML -- it likely requires authentication."
          $hint += "Fix options:"
          $hint += "  1) Re-run with -AllowGitFallback so the script uses your authenticated git credentials."
          $hint += "  2) Make sure git can reach the registry repo without prompting (test: git ls-remote $((Read-TemplateInfo).GitUrl)). Note the fallback already retries a plain shallow clone when partial clone is unsupported, so a failure here is credentials or connectivity, not filter support."
          $hint += "  3) Pass -Mode external -ExternalUrls <url> to a mirror of the registry index.json that does not require auth."
          $hint += "  4) Manually copy index.json from the Workplace-Agent-Packages repo to .opencode/rules/packages-index.json (offline snapshot)."
        }
        'http-error'  { $hint += "HTTP error (status=$($builtinFailure.status)). Check connectivity and that apmPackages.registryRepoUrl is correct." }
        'invalid-json'{ $hint += "Registry URL responded with a non-JSON body. Confirm the URL points at an index.json that matches the Workplace-Agent-Packages _schema/index.schema.json." }
        default       { $hint += "Live fetch failed: $($builtinFailure.detail)" }
      }
    } else {
      $hint += "No registry index could be resolved through any source (local, HTTPS, git, offline)."
    }
    $hint += ""
    $hint += "Reference: .opencode/skills/project-initialization/references/apm-workflow.md Section 4."
    throw "No registry index available. Abort.`n$($hint -join "`n")"
  }
}

# --- announce which rung of the ladder won ---------------------------------
# Phase 1.7-APM records this in Decision Log 1.7. A silent fall-through to the offline
# snapshot means the agent plans against package metadata that may be months stale
# (versions, optional/standaloneOnly flags, targetRoles, added/removed packages).
Write-Host ""
foreach ($s in $sources) {
  $stamp = if ($s.index.generatedAt) { " generatedAt=$($s.index.generatedAt)" } else { '' }
  if ($s.resolvedVia -eq 'offline-snapshot') {
    Write-Host ("Registry resolved via: {0} <- {1}{2}" -f $s.resolvedVia, $s.url, $stamp) -ForegroundColor Yellow
    Write-Host "  WARNING: this is a point-in-time snapshot, NOT the live registry. Record the fallback and its generatedAt in Decision Log 1.7, and re-run with -AllowGitFallback once git credentials are available." -ForegroundColor Yellow
  } else {
    Write-Host ("Registry resolved via: {0} <- {1}{2}" -f $s.resolvedVia, $s.url, $stamp) -ForegroundColor Green
  }
}
Write-Host ""

# --- merge by name (lower priority wins, i.e. builtin wins) ----------------
# The merge is first-wins (the ContainsKey guard below), so the LOWEST priority number must
# be consumed FIRST. Sorting by -priority put external (1) ahead of builtin (0) and silently
# inverted the documented precedence.
$merged = @{}
foreach ($s in ($sources | Sort-Object { $_.priority })) {
  foreach ($p in $s.index.packages) {
    if ($merged.ContainsKey($p.name)) { continue }
    $merged[$p.name] = @{ entry = $p; source = $s.url }
  }
}

# --- validate --------------------------------------------------------------
$errors = [System.Collections.Generic.List[string]]::new()
foreach ($pkg in $merged.Values) { Test-PackageEntry $pkg.entry $errors }
if ($errors.Count -gt 0) { throw "Invalid index entries:`n$($errors -join "`n")" }

# --- filter by role (or by role-agnostic predicate) ------------------------
$matched = [System.Collections.Generic.List[object]]::new()
$optional = [System.Collections.Generic.List[object]]::new()
$standalone = [System.Collections.Generic.List[object]]::new()
$roleAgnostic = [System.Collections.Generic.List[object]]::new()

foreach ($pkg in $merged.Values) {
  $e = $pkg.entry
  $xw = $e.xWorkplace
  $targetRoles = @($xw.targetRoles)
  $info = [PSCustomObject]@{
    name = $e.name
    version = $e.version
    description = $e.description
    path = $e.path
    ref = if ($e.ref) { $e.ref } else { 'master' }
    targetRoles = $targetRoles
    matchedRoles = @($targetRoles | Where-Object { $selectedRoles -contains $_ })
    optional = [bool]$xw.optional
    standaloneOnly = [bool]$xw.standaloneOnly
    contextSkills = @($xw.contextSkills)
    type = $xw.type
    source = $pkg.source
  }
  if ($RoleAgnosticOnly) {
    # Predicate-only classification: every entry with no role binding, evaluated
    # against whatever index the resolution ladder returned (live HTTPS, git
    # clone, or offline snapshot). standaloneOnly is intentionally NOT read, so
    # index/manifest drift on that flag cannot affect the result.
    if ($targetRoles.Count -eq 0) { $roleAgnostic.Add($info) }
  } elseif ($info.standaloneOnly) {
    $standalone.Add($info)
  } elseif ($info.optional) {
    $optional.Add($info)
  } elseif ($info.matchedRoles.Count -gt 0) {
    $matched.Add($info)
  }
}

$requiredContextSkills = @($matched | ForEach-Object { $_.contextSkills } | Where-Object { $_ } | Select-Object -Unique)

$summary = [PSCustomObject]@{
  selectedRoles = $selectedRoles
  mode = $Mode
  roleAgnosticOnly = [bool]$RoleAgnosticOnly
  sources = @($sources | ForEach-Object {
    [PSCustomObject]@{ url = $_.url; resolvedVia = $_.resolvedVia; priority = $_.priority; generatedAt = $_.index.generatedAt }
  })
  matchedPackages = $matched
  optionalPackages = $optional
  standaloneOnlyPackages = $standalone
  roleAgnosticPackages = $roleAgnostic
  requiredContextSkills = $requiredContextSkills
  generatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
}
# Write as UTF-8 *without* BOM. Set-Content -Encoding utf8 on Windows
# PowerShell 5.1 prepends EF BB BF, which breaks downstream JSON.parse
# consumers (Node hooks, agents that strict-parse JSON). [IO.File]::WriteAllText
# with UTF8Encoding($false) is portable across PS 5.1 and PS 7+.
$json = $summary | ConvertTo-Json -Depth 10
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$absSelectionPath = [System.IO.Path]::GetFullPath(
  [System.IO.Path]::Combine((Get-Location).Path, $SelectionFile)
)
[System.IO.File]::WriteAllText($absSelectionPath, $json, $utf8NoBom)

$rolesLabel = if ($selectedRoles.Count -gt 0) { $selectedRoles -join ', ' } else { '(none)' }
Write-Host "Selected roles: $rolesLabel" -ForegroundColor Gray
if ($RoleAgnosticOnly) {
  Write-Host "Role-agnostic packages ($($roleAgnostic.Count), empty targetRoles): $(@($roleAgnostic | ForEach-Object { $_.name }) -join ', ')" -ForegroundColor Green
} else {
  Write-Host "Matched packages: $(@($matched | ForEach-Object { $_.name }) -join ', ')" -ForegroundColor Green
  Write-Host "Optional packages: $(@($optional | ForEach-Object { $_.name }) -join ', ')" -ForegroundColor Yellow
  Write-Host "Standalone-only packages: $(@($standalone | ForEach-Object { $_.name }) -join ', ')" -ForegroundColor DarkYellow
}
Write-Host "Selection saved: $SelectionFile" -ForegroundColor Cyan
exit 0
