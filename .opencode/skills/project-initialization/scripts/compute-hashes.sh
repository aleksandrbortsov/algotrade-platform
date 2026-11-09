#!/bin/bash
#
# SYNOPSIS
#    Computes SHA-256 hashes for Core template files during project initialization.
#
# DESCRIPTION
#    This script reads the .opencode/rules/.core-version.json file and calculates
#    SHA-256 hashes for all files listed in the coreFiles section.
#    Outputs the results in a format suitable for updating the version file.
#
# EXAMPLE
#    ./compute-hashes.sh
#    Outputs hash values for all core files.
#
# NOTES
#    Part of NC AI Workplace template initialization process.
#    Run this during Phase 8 (Finalization) of project initialization.
#

set -eo pipefail

# Path to core version file (relative to project root)
VERSION_FILE=".opencode/rules/.core-version.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if version file exists
if [ ! -f "$VERSION_FILE" ]; then
    echo -e "${RED}Error: Core version file not found: $VERSION_FILE${NC}" >&2
    exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq not found. Falling back to basic parsing (limited functionality).${NC}"
    HAS_JQ=false
else
    HAS_JQ=true
fi

echo -e "${CYAN}Computing SHA-256 hashes for Core template files...${NC}"

# Count files
if [ "$HAS_JQ" = true ]; then
    FILE_COUNT=$(jq '.coreFiles | length' "$VERSION_FILE")
    echo -e "${CYAN}Found $FILE_COUNT files to process.${NC}"
else
    echo -e "${CYAN}Processing files (jq not available)...${NC}"
fi

echo ""

# Temporary file for results
RESULTS_FILE=$(mktemp)
trap "rm -f $RESULTS_FILE" EXIT

# Read file paths and process
PROCESSED=0
ERRORS=0

if [ "$HAS_JQ" = true ]; then
    # Emit "<path>|<optional>" so an entry flagged "optional": true can be reported as an
    # expected absence rather than a missing Core file. Consumer projects legitimately lack
    # the template's own docs/**; a genuinely lost Core file must still stand out.
    jq -r '.coreFiles | to_entries[] | "\(.key)|\(.value.optional // false)"' "$VERSION_FILE" | while IFS='|' read -r file_path is_optional; do
        if [ -f "$file_path" ]; then
            # Compute SHA-256 hash
            if command -v sha256sum &> /dev/null; then
                hash=$(sha256sum "$file_path" | awk '{print $1}')
            elif command -v shasum &> /dev/null; then
                hash=$(shasum -a 256 "$file_path" | awk '{print $1}')
            else
                hash="error"
                status="NO HASH TOOL"
                echo -e "${RED}$file_path : ERROR - No SHA-256 tool found${NC}"
            fi

            if [ "$hash" != "error" ]; then
                hash=$(echo "$hash" | tr '[:upper:]' '[:lower:]')
                echo -e "${GREEN}$file_path : $hash${NC}"
                echo "$file_path|$hash|OK|$is_optional" >> "$RESULTS_FILE"
            else
                echo "$file_path|error|$status|$is_optional" >> "$RESULTS_FILE"
            fi
        elif [ "$is_optional" = "true" ]; then
            echo "$file_path : missing (optional)"
            echo "$file_path|missing|OPTIONAL NOT PRESENT|true" >> "$RESULTS_FILE"
        else
            echo -e "${YELLOW}$file_path : MISSING${NC}"
            echo "$file_path|missing|FILE NOT FOUND|false" >> "$RESULTS_FILE"
        fi
    done
else
    # Basic mode: just compute hashes for common agent files
    # This is a fallback when jq is not available
    echo -e "${YELLOW}Basic mode: computing hashes for standard agent files only${NC}"

    # List of standard core files
    for file_path in \
        ".opencode/rules/orchestrator.md" \
        ".opencode/rules/development.md" \
        ".opencode/agents/initializer.md" \
        ".opencode/agents/project-updater.md" \
        ".opencode/skills/project-initialization/SKILL.md" \
        ".opencode/skills/project-update/SKILL.md"; do

        if [ -f "$file_path" ]; then
            if command -v sha256sum &> /dev/null; then
                hash=$(sha256sum "$file_path" | awk '{print $1}')
            elif command -v shasum &> /dev/null; then
                hash=$(shasum -a 256 "$file_path" | awk '{print $1}')
            else
                hash="error"
                echo -e "${RED}$file_path : ERROR${NC}"
                echo "$file_path|$hash|NO HASH TOOL|false" >> "$RESULTS_FILE"
                continue
            fi

            hash=$(echo "$hash" | tr '[:upper:]' '[:lower:]')
            echo -e "${GREEN}$file_path : $hash${NC}"
            echo "$file_path|$hash|OK|false" >> "$RESULTS_FILE"
        else
            echo -e "${YELLOW}$file_path : MISSING${NC}"
        fi
    done
fi

# Count results. Optional absences are counted separately — they are an expected state,
# not an error, and lumping them together is what forced blanket --allow-missing runs.
# `grep -c` prints 0 AND exits 1 when nothing matches, so `|| echo "0"` appended a SECOND
# line and every counter became the two-line string "0\n0" — which then broke the numeric
# `[ "$ERRORS" -gt 0 ]` tests. grep's own output is already correct; only the exit code
# needs neutralising.
OPTIONAL_MISSING=0
if [ -f "$RESULTS_FILE" ]; then
    PROCESSED=$(grep -cE '\|OK\|' "$RESULTS_FILE" 2>/dev/null; true)
    ERRORS=$(grep -cE '\|error\||\|missing\|FILE NOT FOUND\|' "$RESULTS_FILE" 2>/dev/null; true)
    OPTIONAL_MISSING=$(grep -cE '\|OPTIONAL NOT PRESENT\|' "$RESULTS_FILE" 2>/dev/null; true)
fi

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}Hash computation complete!${NC}"
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}Processed: $PROCESSED files${NC}"
echo "Optional:  $OPTIONAL_MISSING files absent (expected)"
if [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}Errors:    $ERRORS files${NC}"
else
    echo -e "${GREEN}Errors:    $ERRORS files${NC}"
fi
echo ""

# Output summary for easy copy-paste into .core-version.json
if [ -f "$RESULTS_FILE" ] && [ "$HAS_JQ" = true ]; then
    echo -e "${CYAN}--- Copy-paste ready JSON for coreFiles section ---${NC}"
    echo ""

    CURRENT_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # The "optional" flag is authored metadata, not computed state: an entry that loses it
    # becomes a REQUIRED core file, and the next `compute-hashes.ps1 -Apply` in a consumer
    # project (which legitimately has no docs/**) aborts on "REQUIRED core file(s) missing".
    # Re-emit it for every entry that carried it.
    while IFS='|' read -r file_path hash status is_optional; do
        # Escape path for JSON
        escaped_path=$(echo "$file_path" | sed 's/\\/\//g')

        echo -e "    \"${escaped_path}\": {"
        echo -e "      \"hash\": \"${hash}\","
        if [ "$is_optional" = "true" ]; then
            echo -e "      \"lastModified\": \"${CURRENT_DATE}\","
            echo -e "      \"optional\": true"
        else
            echo -e "      \"lastModified\": \"${CURRENT_DATE}\""
        fi
        echo -e "    },"
    done < "$RESULTS_FILE"

    echo ""
    echo -e "${CYAN}--- End of JSON output ---${NC}"
fi

# Return appropriate exit code
if [ "$ERRORS" -gt 0 ]; then
    exit 1
else
    exit 0
fi
