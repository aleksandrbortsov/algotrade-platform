#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Verifies that APM full-module activation actually happened, instead of trusting
    the activation marker.

.DESCRIPTION
    A module package's scripts/activate.{ps1,sh} resolves its own package root from
    the script location and copies the sibling runtime/ payload into the project.
    Nothing runs on session start on the opencode target (APM deploys no hooks there),
    so Phase 1.7-APM step 5.2 invokes the script directly - and a script that ran from
    the wrong directory, or failed after writing .workplace/activated/<pkg>.marker,
    still leaves a marker that later re-runs treat as "already done", because
    activation is idempotent on the marker.

    APM 0.28.0 materialises a monorepo package twice under apm_modules/ (under the
    <host>/<group>/<repo>/<path>/ tree and under the alias or path name); each package
    is verified once, from the shallowest copy. A package whose own manifest pins
    targets that do not overlap the project's apm.yml targets was skipped by APM at
    install time: it is reported as SKIPPED_BY_TARGET and never counted as broken.

    This script compares each module's declared runtime payload against what is
    actually present in the project, so activation is judged by artifacts rather than
    by the marker. With -Repair it removes false-positive markers and state entries
    and prints the correct re-run command, including the real (possibly nested)
    package path.

    Note: this file is intentionally ASCII-only. Windows PowerShell 5.1 reads a
    BOM-less .ps1 as ANSI, so non-ASCII punctuation corrupts string literals.

.PARAMETER ProjectRoot
    Project root to inspect. Defaults to the repository the script lives in.

.PARAMETER Repair
    Delete markers and state entries whose artifacts are missing, so the next
    activation run is not a no-op. Never runs activation itself.

.PARAMETER Json
    Emit the findings as JSON instead of a human-readable report.

.OUTPUTS
    Exit code 0 - every installed module is either fully activated, cleanly not
    activated, or skipped by APM for target incompatibility. Exit code 1 - at least one module is falsely or partially activated
    (after -Repair: at least one was repaired and needs a re-run). Exit code 2 -
    the project root could not be resolved.

.NOTES
    Invoke with `powershell -ExecutionPolicy Bypass -File ...`. Windows ships Windows
    PowerShell 5.1 as `powershell`; `pwsh` (PowerShell 7+) is a separate optional
    install and is absent on most Windows machines. This script runs under both.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/verify-apm-activation.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/verify-apm-activation.ps1 -Repair
#>

[CmdletBinding()]
param(
    [string]$ProjectRoot,
    [switch]$Repair,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'

# $PSVersionTable.Platform exists only on PowerShell 6+; Windows PowerShell 5.1 is
# Windows by definition, so its absence is the answer.
$IsPosixHost = ($PSVersionTable.PSObject.Properties.Name -contains 'Platform') -and ($PSVersionTable.Platform -eq 'Unix')

function Resolve-ProjectRoot {
    param([string]$Explicit)

    if ($Explicit) {
        if (-not (Test-Path -LiteralPath $Explicit)) {
            throw "ProjectRoot '$Explicit' does not exist."
        }
        return (Resolve-Path -LiteralPath $Explicit).Path
    }

    $dir = $PSScriptRoot
    while ($dir) {
        if (Test-Path -LiteralPath (Join-Path $dir '.opencode/rules')) { return $dir }
        $parent = Split-Path -Parent $dir
        if ($parent -eq $dir) { break }
        $dir = $parent
    }
    return $null
}

# Minimal apm.yml reader. A full YAML parser is not available on Windows PowerShell
# 5.1, and the three fields needed here are always flat scalars in Workplace manifests.
function Read-PackageManifest {
    param([string]$ManifestPath)

    $text = Get-Content -LiteralPath $ManifestPath -Raw

    $name = $null
    if ($text -match '(?m)^name:\s*["'']?([^"''\r\n]+)') { $name = $Matches[1].Trim() }

    $type = $null
    $movesRuntime = $false
    if ($text -match '(?ms)^x-workplace:\s*\r?\n(.*?)(?=^\S|\Z)') {
        $block = $Matches[1]
        if ($block -match '(?m)^\s+type:\s*["'']?([A-Za-z-]+)') { $type = $Matches[1] }
        if ($block -match '(?m)^\s+movesRuntimeFolder:\s*true\s*$') { $movesRuntime = $true }
    }

    # target:/targets: - inline list ([claude, copilot]) or block list (- claude). Empty = no pin.
    $targets = @()
    if ($text -match '(?m)^targets?:\s*\[([^\]]*)\]') {
        $targets = @($Matches[1] -split ',' | ForEach-Object { $_.Trim().Trim('"', "'") } | Where-Object { $_ })
    }
    elseif ($text -match '(?ms)^targets?:\s*\r?\n((?:[ \t]+-[^\r\n]*\r?\n?)+)') {
        $targets = @([regex]::Matches($Matches[1], '-\s*["'']?([A-Za-z-]+)') | ForEach-Object { $_.Groups[1].Value })
    }

    return [pscustomobject]@{
        Name               = $name
        Type               = $type
        MovesRuntimeFolder = $movesRuntime
        Targets            = $targets
    }
}

# Every top-level entry of runtime/ is a payload the activation script relocates:
# runtime/config.json lands in .workplace/<pkg>/, directories land in the project root.
function Get-ExpectedArtifacts {
    param([string]$PackageRoot, [string]$PackageName, [string]$Root)

    $runtime = Join-Path $PackageRoot 'runtime'
    if (-not (Test-Path -LiteralPath $runtime)) { return @() }

    $expected = @()
    foreach ($entry in Get-ChildItem -LiteralPath $runtime -Force) {
        if ($entry.PSIsContainer) {
            $expected += [pscustomobject]@{
                Source = "runtime/$($entry.Name)/"
                Target = Join-Path $Root $entry.Name
            }
        }
        elseif ($entry.Name -eq 'config.json') {
            $expected += [pscustomobject]@{
                Source = 'runtime/config.json'
                Target = Join-Path $Root ".workplace/$PackageName/config.json"
            }
        }
    }
    return $expected
}

# Windows PowerShell 5.1 decodes a BOM-less file with the system ANSI codepage, so
# Get-Content mangles every non-ASCII character in a correct UTF-8 file, and
# Set-Content -Encoding UTF8 writes a BOM that strict JSON parsers (jq, JSON.parse)
# reject. Both directions go through these two helpers instead.
function Read-TextFileUtf8 {
    param([string]$Path)

    $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $Path).Path)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $bytes = $bytes[3..($bytes.Length - 1)]
    }
    return [System.Text.Encoding]::UTF8.GetString($bytes)
}

function Write-JsonNoBom {
    param([string]$Path, $InputObject)

    $json = ConvertTo-Json -InputObject $InputObject -Depth 10
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path -LiteralPath $Path).Path, $json, $utf8NoBom)
}

function Get-StateEntryNames {
    param([string]$StatePath)

    if (-not (Test-Path -LiteralPath $StatePath)) { return @() }
    try {
        $state = Read-TextFileUtf8 -Path $StatePath | ConvertFrom-Json
    }
    catch {
        Write-Warning "Could not parse $StatePath - treating it as empty."
        return @()
    }

    $names = @()
    # Two shapes are in the wild: a map keyed by package name, and a list of entries
    # carrying a name/package field. Accept both rather than guessing.
    if ($state -is [System.Collections.IEnumerable] -and -not ($state -is [string])) {
        foreach ($item in $state) {
            foreach ($key in @('name', 'package', 'packageName')) {
                if ($item.PSObject.Properties.Name -contains $key) { $names += [string]$item.$key }
            }
        }
    }
    elseif ($state) {
        foreach ($prop in $state.PSObject.Properties) {
            if ((@('packages', 'activated', 'modules') -contains $prop.Name) -and $prop.Value) {
                foreach ($sub in $prop.Value.PSObject.Properties) { $names += $sub.Name }
            }
            else {
                $names += $prop.Name
            }
        }
    }
    return @($names | Where-Object { $_ } | Select-Object -Unique)
}

function Remove-StateEntry {
    param([string]$StatePath, [string]$PackageName)

    if (-not (Test-Path -LiteralPath $StatePath)) { return $false }
    try {
        $state = Read-TextFileUtf8 -Path $StatePath | ConvertFrom-Json
    }
    catch {
        Write-Warning "Could not parse $StatePath - left untouched. Remove the '$PackageName' entry by hand."
        return $false
    }

    if ($state -is [System.Collections.IEnumerable] -and -not ($state -is [string])) {
        $kept = @($state | Where-Object {
                $entryName = $null
                foreach ($key in @('name', 'package', 'packageName')) {
                    if ($_.PSObject.Properties.Name -contains $key) { $entryName = [string]$_.$key }
                }
                $entryName -ne $PackageName
            })
        if ($kept.Count -eq @($state).Count) { return $false }
        Write-JsonNoBom -Path $StatePath -InputObject $kept
        return $true
    }

    $containers = @($state)
    foreach ($nested in @('packages', 'activated', 'modules')) {
        if (($state.PSObject.Properties.Name -contains $nested) -and $state.$nested) {
            $containers += $state.$nested
        }
    }

    foreach ($container in $containers) {
        if ($container -and ($container.PSObject.Properties.Name -contains $PackageName)) {
            $container.PSObject.Properties.Remove($PackageName)
            Write-JsonNoBom -Path $StatePath -InputObject $state
            return $true
        }
    }
    return $false
}

$root = Resolve-ProjectRoot -Explicit $ProjectRoot
if (-not $root) {
    Write-Error "Could not resolve the project root (no .opencode/rules/ found above '$PSScriptRoot'). Pass -ProjectRoot explicitly."
    exit 2
}

$modulesCache = Join-Path $root 'apm_modules'
$statePath = Join-Path $root '.workplace/state.json'
$markerDir = Join-Path $root '.workplace/activated'

$findings = @()
# No hook-side copies of the activation scripts exist on the opencode target (APM deploys no
# hooks there): the only copy is the one under apm_modules/, resolved by the manifest scan below.

if (-not (Test-Path -LiteralPath $modulesCache)) {
    if ($Json) {
        ConvertTo-Json -InputObject @{ projectRoot = $root; modules = @(); brokenCount = 0 } -Depth 6
    }
    else {
        Write-Host "No apm_modules/ in $root - nothing installed by APM yet, nothing to verify." -ForegroundColor Yellow
    }
    exit 0
}

# APM 0.28.0 materialises a monorepo package twice: under apm_modules/<host>/<group>/<repo>/<path>/
# and under apm_modules/<alias-or-path>/. Both copies carry the same manifest, so verify each
# package once, from the shallowest copy (the one the lock's virtual_path points at).
$manifestsByName = @{}
foreach ($candidate in Get-ChildItem -LiteralPath $modulesCache -Recurse -Force -Filter 'apm.yml' -ErrorAction SilentlyContinue) {
    $candMeta = Read-PackageManifest -ManifestPath $candidate.FullName
    if ($candMeta.Type -ne 'module' -or -not $candMeta.Name) { continue }
    $depth = @(($candidate.FullName.Substring($modulesCache.Length) -split '[\\/]') | Where-Object { $_ }).Count
    if (-not $manifestsByName.ContainsKey($candMeta.Name) -or $depth -lt $manifestsByName[$candMeta.Name].Depth) {
        $manifestsByName[$candMeta.Name] = [pscustomobject]@{ File = $candidate; Meta = $candMeta; Depth = $depth }
    }
}

# The project's own apm.yml pins the deploy target(s); a package whose manifest pins a
# non-overlapping set was skipped by APM at install time and has nothing to activate.
$projectTargets = @()
$projectManifest = Join-Path $root 'apm.yml'
if (Test-Path -LiteralPath $projectManifest) { $projectTargets = @((Read-PackageManifest -ManifestPath $projectManifest).Targets) }

foreach ($entry in @($manifestsByName.Values | Sort-Object { $_.Meta.Name })) {
    $manifest = $entry.File
    $meta = $entry.Meta

    $packageRoot = $manifest.Directory.FullName
    $relPackageRoot = $packageRoot.Substring($root.Length).TrimStart('\', '/').Replace('\', '/')
    $activatePs1 = Join-Path $packageRoot 'scripts/activate.ps1'
    $activateSh = Join-Path $packageRoot 'scripts/activate.sh'
    $hasRuntime = Test-Path -LiteralPath (Join-Path $packageRoot 'runtime')

    $marker = Join-Path $markerDir "$($meta.Name).marker"
    $markerExists = Test-Path -LiteralPath $marker
    $inState = (Get-StateEntryNames -StatePath $statePath) -contains $meta.Name

    $expected = Get-ExpectedArtifacts -PackageRoot $packageRoot -PackageName $meta.Name -Root $root
    $missing = @($expected | Where-Object { -not (Test-Path -LiteralPath $_.Target) })
    $present = @($expected | Where-Object { Test-Path -LiteralPath $_.Target })

    $skippedByTarget = $false
    if ($projectTargets.Count -gt 0 -and @($meta.Targets).Count -gt 0) {
        $overlap = @($meta.Targets | Where-Object { $projectTargets -contains $_ })
        if ($overlap.Count -eq 0) { $skippedByTarget = $true }
    }

    if ($skippedByTarget) {
        $status = 'SKIPPED_BY_TARGET'
    }
    elseif ($meta.MovesRuntimeFolder -and -not $hasRuntime) {
        $status = 'PACKAGE_INCOMPLETE'
    }
    elseif (-not $markerExists -and $present.Count -eq 0) {
        $status = 'NOT_ACTIVATED'
    }
    elseif (@($expected).Count -gt 0 -and $present.Count -eq 0) {
        $status = 'FALSE_POSITIVE'
    }
    elseif ($missing.Count -gt 0) {
        $status = 'PARTIAL'
    }
    elseif (-not $markerExists) {
        $status = 'ARTIFACTS_WITHOUT_MARKER'
    }
    else {
        $status = 'OK'
    }

    $repaired = $false
    if ($Repair -and (@('FALSE_POSITIVE', 'PARTIAL') -contains $status)) {
        if ($markerExists) {
            Remove-Item -LiteralPath $marker -Force
            $repaired = $true
        }
        if (Remove-StateEntry -StatePath $statePath -PackageName $meta.Name) { $repaired = $true }
    }

    # Activation-bearing packages ship activate, activate.ps1 AND activate.sh, so
    # "whichever exists" always picked the .ps1 - a command with no interpreter on
    # macOS/Linux, which migration v4.5.1 then runs verbatim. Choose by host instead.
    $activateCommand = $null
    if ($IsPosixHost) {
        if (Test-Path -LiteralPath $activateSh)       { $activateCommand = "bash `"$relPackageRoot/scripts/activate.sh`"" }
        elseif (Test-Path -LiteralPath $activatePs1)  { $activateCommand = "pwsh -File `"$relPackageRoot/scripts/activate.ps1`"" }
    }
    else {
        if (Test-Path -LiteralPath $activatePs1)      { $activateCommand = "powershell -ExecutionPolicy Bypass -File `"$relPackageRoot/scripts/activate.ps1`"" }
        elseif (Test-Path -LiteralPath $activateSh)   { $activateCommand = "bash `"$relPackageRoot/scripts/activate.sh`"" }
    }

    $findings += [pscustomobject]@{
        Package          = $meta.Name
        Status           = $status
        PackageRoot      = $relPackageRoot
        PackageTargets   = @($meta.Targets)
        MarkerPresent    = $markerExists
        StateActive      = $inState
        ExpectedCount    = @($expected).Count
        MissingArtifacts = @($missing | ForEach-Object { $_.Source })
        ActivateCommand  = $activateCommand
        Repaired         = $repaired
    }
}

$broken = @($findings | Where-Object { @('FALSE_POSITIVE', 'PARTIAL') -contains $_.Status })
$exitCode = 0
if ($broken.Count -gt 0) { $exitCode = 1 }

if ($Json) {
    ConvertTo-Json -InputObject @{
        projectRoot  = $root
        modules      = $findings
        brokenCount  = $broken.Count
    } -Depth 6
    exit $exitCode
}

Write-Host ""
Write-Host "APM module activation check - $root"
Write-Host ""

if ($findings.Count -eq 0) {
    Write-Host 'No "type: module" packages found under apm_modules/. Nothing to verify.' -ForegroundColor Yellow
}
else {
    $findings |
        Select-Object Package, Status, MarkerPresent, StateActive, @{ n = 'Missing'; e = { $_.MissingArtifacts -join ', ' } } |
        Format-Table -AutoSize |
        Out-String |
        Write-Host
}

foreach ($f in $findings) {
    switch ($f.Status) {
        'FALSE_POSITIVE' {
            Write-Host "[$($f.Package)] FALSE POSITIVE - marked activated, but none of its $($f.ExpectedCount) runtime artifacts landed." -ForegroundColor Red
            Write-Host "    Cause: the activation script ran from a directory without a sibling runtime/ (wrong package root), or it failed after writing the marker."
            if ($f.Repaired) {
                Write-Host "    Repaired: marker and state entry removed. Now run:" -ForegroundColor Green
            }
            else {
                Write-Host "    Fix: re-run this script with -Repair, then run:"
            }
            if ($f.ActivateCommand) { Write-Host "      $($f.ActivateCommand)" }
        }
        'PARTIAL' {
            Write-Host "[$($f.Package)] PARTIAL - missing: $($f.MissingArtifacts -join ', ')" -ForegroundColor Yellow
            if ($f.Repaired) { Write-Host "    Repaired: marker cleared. Re-run: $($f.ActivateCommand)" -ForegroundColor Green }
        }
        'PACKAGE_INCOMPLETE' {
            Write-Host "[$($f.Package)] PACKAGE INCOMPLETE - declares movesRuntimeFolder: true but ships no runtime/ at $($f.PackageRoot)." -ForegroundColor Red
            Write-Host '    Re-install the package (node .opencode/skills/project-initialization/scripts/apm-install-preserving.js); if it persists, the published package is broken.'
        }
        'ARTIFACTS_WITHOUT_MARKER' {
            Write-Host "[$($f.Package)] Artifacts present but no marker - activation succeeded and the marker was later deleted. Harmless." -ForegroundColor Yellow
        }
        'SKIPPED_BY_TARGET' {
            Write-Host "[$($f.Package)] Skipped by APM at install time - its manifest pins targets [$($f.PackageTargets -join ', ')], which do not overlap the project's [$($projectTargets -join ', ')]. None of its primitives is installed and there is nothing to activate: remove it from apm.yml or record an Open Gap." -ForegroundColor DarkYellow
        }
        'NOT_ACTIVATED' {
            Write-Host "[$($f.Package)] Not activated yet. Run: $($f.ActivateCommand)" -ForegroundColor Cyan
        }
    }
}

Write-Host ""
exit $exitCode
