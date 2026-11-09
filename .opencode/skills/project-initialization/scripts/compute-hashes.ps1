#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Computes SHA-256 hashes for Core template files during project initialization.

.DESCRIPTION
    This script reads the .opencode/rules/.core-version.json file and calculates
    SHA-256 hashes for all files listed in the coreFiles section.
    Outputs the results in a format suitable for updating the version file.
    With -Apply, patches the version file directly using UTF-8 without BOM.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/compute-hashes.ps1
    Outputs hash values for all core files.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/compute-hashes.ps1 -Apply
    Computes hashes and updates .opencode/rules/.core-version.json in place.
    NEVER run -Apply inside the template repository itself: it stamps
    initializationStatus "active", which is Phase 8 finalization for a consumer
    project. Use a scratch copy for acceptance checks.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/compute-hashes.ps1 -Apply -AllowMissing
    Applies updates while recording absent optional Core files as "missing".

.NOTES
    Part of NC AI Workplace template initialization process.
    Run this during Phase 8 (Finalization) of project initialization.
#>

[CmdletBinding()]
param(
    [switch]$Apply,
    [switch]$AllowMissing
)

$ErrorActionPreference = "Stop"

# Path to core version file (relative to project root)
$versionFilePath = ".opencode/rules/.core-version.json"

# Check if version file exists
if (-not (Test-Path $versionFilePath)) {
    Write-Error "Core version file not found: $versionFilePath"
    exit 1
}

function Get-Utf8NoBomEncoding {
    return New-Object System.Text.UTF8Encoding $false
}

function Get-PreferredNewLine {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Content
    )

    if ($Content.Contains("`r`n")) {
        return "`r`n"
    }

    return "`n"
}

function Update-RootStringProperty {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Json,

        [Parameter(Mandatory = $true)]
        [string]$PropertyName,

        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $pattern = '(?m)^(\s*"' + [regex]::Escape($PropertyName) + '"\s*:\s*")[^"]*(")'
    $match = [regex]::Match($Json, $pattern)

    if (-not $match.Success) {
        throw "Could not find root property '$PropertyName' in $versionFilePath."
    }

    $replacement = $match.Groups[1].Value + $Value + $match.Groups[2].Value
    return $Json.Substring(0, $match.Index) + $replacement + $Json.Substring($match.Index + $match.Length)
}

function Update-CoreFileEntry {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Json,

        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [Parameter(Mandatory = $true)]
        [string]$Hash,

        [Parameter(Mandatory = $true)]
        [string]$LastModified,

        [Parameter(Mandatory = $true)]
        [string]$NewLine
    )

    $jsonPath = $FilePath -replace '\\', '/'
    # The entry body is matched as a whole so that an "optional": true member (or any other
    # future member) does not break the match. Nested objects are not expected inside a
    # coreFiles entry, so a non-greedy match up to the closing brace is sufficient.
    $pattern = '(?ms)^(?<indent>[ \t]*)"' + [regex]::Escape($jsonPath) + '"\s*:\s*\{(?<body>[^{}]*?)\}'
    $match = [regex]::Match($Json, $pattern)

    if (-not $match.Success) {
        throw "Could not find coreFiles entry for '$jsonPath' in $versionFilePath."
    }

    # Preserve the optional flag - it is authored metadata, not computed state.
    $isOptional = $match.Groups["body"].Value -match '"optional"\s*:\s*true'

    $indent = $match.Groups["indent"].Value
    $childIndent = $indent + "  "
    $replacement = $indent + '"' + $jsonPath + '": {' + $NewLine +
        $childIndent + '"hash": "' + $Hash + '",' + $NewLine +
        $childIndent + '"lastModified": "' + $LastModified + '"'
    if ($isOptional) {
        $replacement += ',' + $NewLine + $childIndent + '"optional": true'
    }
    $replacement += $NewLine + $indent + '}'

    return $Json.Substring(0, $match.Index) + $replacement + $Json.Substring($match.Index + $match.Length)
}

function Test-NoUtf8Bom {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $bytes = [System.IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        throw "$Path has a UTF-8 BOM. Rewrite as UTF-8 without BOM."
    }
}

$absoluteVersionFilePath = [System.IO.Path]::GetFullPath(
    [System.IO.Path]::Combine((Get-Location).Path, $versionFilePath)
)

$utf8NoBom = Get-Utf8NoBomEncoding

# Read and parse the version file. PowerShell 5.1's Get-Content defaults to
# ANSI, which corrupts UTF-8 em dashes in description/notes on round trips.
try {
    $versionJson = [System.IO.File]::ReadAllText($absoluteVersionFilePath, $utf8NoBom)
    $versionData = $versionJson | ConvertFrom-Json
} catch {
    Write-Error "Failed to parse core version file: $_"
    exit 1
}

# Get all core files from the version data
$coreFiles = $versionData.coreFiles
if (-not $coreFiles) {
    Write-Error "No coreFiles section found in version file"
    exit 1
}

Write-Host "Computing SHA-256 hashes for Core template files..." -ForegroundColor Cyan
$fileCount = ($coreFiles | Get-Member -MemberType NoteProperty).Count
Write-Host "Found $fileCount files to process." -ForegroundColor Gray
Write-Host ""

# Results collection - List<T> avoids O(n^2) array copying on each +=
$results = [System.Collections.Generic.List[PSCustomObject]]::new()
$processedCount = 0
$errorCount = 0
$missingCount = 0
$optionalMissingCount = 0

# Process each file
foreach ($fileEntry in $coreFiles.PSObject.Properties) {
    $filePath = $fileEntry.Name

    # An entry flagged "optional": true is expected to be absent in consumer projects
    # (the template's own docs/** are the canonical case). Recording it as "missing"
    # is the correct outcome, not a reason to block -Apply. Only unflagged entries
    # signal a genuinely lost Core file.
    # Read once, for BOTH branches: the flag is authored metadata and must survive on the
    # copy-paste block for a file that is PRESENT too, otherwise pasting that block turns
    # every optional entry back into a required one.
    $isOptional = $false
    try {
        $entryValue = $fileEntry.Value
        if ($null -ne $entryValue -and ($entryValue.PSObject.Properties.Name -contains 'optional')) {
            $isOptional = [bool]$entryValue.optional
        }
    } catch {
        $isOptional = $false
    }

    # Check if file exists
    if (Test-Path -LiteralPath $filePath) {
        try {
            # Compute SHA-256 hash
            $hashResult = Get-FileHash -LiteralPath $filePath -Algorithm SHA256
            $hash = $hashResult.Hash.ToLower()

            $results.Add([PSCustomObject]@{
                FilePath = $filePath
                Hash = $hash
                Status = "OK"
                Optional = $isOptional
            })

            Write-Host "$filePath : $hash" -ForegroundColor Green
            $processedCount++
        } catch {
            $results.Add([PSCustomObject]@{
                FilePath = $filePath
                Hash = "error"
                Status = "ERROR: $_"
                Optional = $isOptional
            })
            Write-Host "$filePath : ERROR - $_" -ForegroundColor Red
            $errorCount++
        }
    } else {
        $results.Add([PSCustomObject]@{
            FilePath = $filePath
            Hash = "missing"
            Status = if ($isOptional) { "OPTIONAL - NOT PRESENT" } else { "FILE NOT FOUND" }
            Optional = $isOptional
        })

        if ($isOptional) {
            Write-Host "$filePath : missing (optional)" -ForegroundColor DarkGray
            $optionalMissingCount++
        } else {
            Write-Host "$filePath : MISSING" -ForegroundColor Yellow
            $missingCount++
        }
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Hash computation complete!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Processed: $processedCount files" -ForegroundColor Green
Write-Host "Missing:   $missingCount files (required)" -ForegroundColor $(if ($missingCount -gt 0) { "Yellow" } else { "Green" })
Write-Host "Optional:  $optionalMissingCount files absent (expected)" -ForegroundColor Gray
Write-Host "Errors:    $errorCount files" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

# Output summary for easy copy-paste into .core-version.json
Write-Host "--- Copy-paste ready JSON for coreFiles section ---" -ForegroundColor Cyan
Write-Host ""

$lastModified = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

foreach ($result in $results) {
    $escapedPath = $result.FilePath -replace '\\', '/'

    Write-Host "    `"$escapedPath`": {" -ForegroundColor White
    Write-Host "      `"hash`": `"$($result.Hash)`"," -ForegroundColor Yellow
    if ($result.Optional) {
        Write-Host "      `"lastModified`": `"$lastModified`"," -ForegroundColor Gray
        Write-Host "      `"optional`": true" -ForegroundColor Gray
    } else {
        Write-Host "      `"lastModified`": `"$lastModified`"" -ForegroundColor Gray
    }
    Write-Host "    }," -ForegroundColor White
}

Write-Host ""
Write-Host "--- End of JSON output ---" -ForegroundColor Cyan

if ($Apply) {
    if ($errorCount -gt 0) {
        Write-Error "Not applying updates because one or more files failed to hash."
        exit 1
    }

    if ($missingCount -gt 0 -and (-not $AllowMissing)) {
        Write-Error "Not applying updates because $missingCount REQUIRED core file(s) are missing. Files flagged 'optional': true in coreFiles never trigger this. Restore the listed files, or - only if you have confirmed each one is expected to be gone - rerun with -Apply -AllowMissing."
        exit 1
    }

    if ($missingCount -gt 0 -and $AllowMissing) {
        Write-Warning "Missing files will be recorded as 'missing'. This is allowed for optional Core files."
    }

    try {
        $newLine = Get-PreferredNewLine -Content $versionJson
        $updatedJson = Update-RootStringProperty -Json $versionJson -PropertyName "initializationStatus" -Value "active"
        $updatedJson = Update-RootStringProperty -Json $updatedJson -PropertyName "lastUpdate" -Value $lastModified

        foreach ($result in $results) {
            $updatedJson = Update-CoreFileEntry `
                -Json $updatedJson `
                -FilePath $result.FilePath `
                -Hash $result.Hash `
                -LastModified $lastModified `
                -NewLine $newLine
        }

        [System.IO.File]::WriteAllText($absoluteVersionFilePath, $updatedJson, $utf8NoBom)
        Test-NoUtf8Bom -Path $absoluteVersionFilePath
        Write-Host ""
        Write-Host "Applied updates to $versionFilePath using UTF-8 without BOM." -ForegroundColor Green
    } catch {
        Write-Error "Failed to apply updates to core version file: $_"
        exit 1
    }
}

# Return appropriate exit code
if ($errorCount -gt 0 -or ($missingCount -gt 0 -and (-not ($Apply -and $AllowMissing)))) {
    exit 1
} else {
    exit 0
}
