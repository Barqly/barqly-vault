# Download Page Template System Design

**Created**: 2025-08-30  
**Status**: Design Phase  
**Purpose**: Replace complex AWK-based download page updates with simple template system

## Problem Statement

### Current Issues (From Yesterday's Session)
- Complex AWK/Perl regex for HTML manipulation fails with multiline patterns
- Three separate scripts with fragile dependencies
- Temporary files not cleaned up (`index.html.tmp`, `index.html.new`, `index.html.bak`)
- Manual intervention required when scripts fail
- Inconsistent updates between `downloads.md` and `downloads/index.html`

### UI/UX Issues (From Current Screenshot)
- Inconsistent link colors (orange vs blue)
- Page width too narrow causing filename wrapping
- Missing file sizes for download estimation

## Solution Design

### Architecture Overview
```
Data Source (Single Truth) → Template Engine → Static Files
```

### File Structure
```
scripts/
├── ci/
│   ├── generate-release-notes.sh        # Existing
│   ├── update-downloads.sh              # Move from scripts/
│   ├── promote-beta.sh                  # Move from scripts/
│   ├── publish-production.sh            # Move from scripts/
│   └── generate-downloads.sh            # New: Template engine
public-docs/
├── downloads-data.yaml                  # Single source of truth
├── templates/
│   ├── downloads.html.template          # HTML template
│   └── downloads.md.template            # Markdown template
├── downloads.md                         # Generated from template
└── downloads/
    └── index.html                       # Generated from template
```

### Data File Structure (YAML)

```yaml
# downloads-data.yaml
metadata:
  updated: "2025-08-29T15:30:00Z"
  generated_by: "generate-downloads.sh v1.0"

latest:
  version: "0.1.7"
  release_date: "2025-08-29"
  github_release_url: "https://github.com/Barqly/barqly-vault/releases/tag/v0.1.7"
  
  downloads:
    - platform: "macOS (Apple Silicon)"
      type: "DMG" 
      filename: "barqly-vault-0.1.7-macos-arm64.dmg"
      download_url: "https://github.com/Barqly/barqly-vault/releases/download/v0.1.7/barqly-vault-0.1.7-macos-arm64.dmg"
      size_mb: "45.2 MB"
      size_bytes: 47431680
      sha256: "a1b2c3d4e5f6..."
      file_created: "2025-08-29T10:15:00Z"
    
    - platform: "macOS (Intel)"
      type: "DMG"
      filename: "barqly-vault-0.1.7-macos-x86_64.dmg"
      download_url: "https://github.com/Barqly/barqly-vault/releases/download/v0.1.7/barqly-vault-0.1.7-macos-x86_64.dmg"
      size_mb: "44.8 MB"
      size_bytes: 46971904
      sha256: "b2c3d4e5f6a7..."
      file_created: "2025-08-29T10:16:00Z"
    
    # ... continue for all platforms

  verification:
    checksums_url: "https://github.com/Barqly/barqly-vault/releases/download/v0.1.7/checksums.txt"
    # Future: gpg_signature, manifest_url, etc.

version_history:
  - version: "0.1.6"
    github_url: "https://github.com/Barqly/barqly-vault/releases/tag/v0.1.6"
  - version: "0.1.5" 
    github_url: "https://github.com/Barqly/barqly-vault/releases/tag/v0.1.5"
  # ... continue for all versions
```

### Template Engine (Simple Bash + yq)

```bash
#!/bin/bash
# scripts/ci/generate-downloads.sh
# Simple template engine using yq for YAML parsing and sed for substitution

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
DATA_FILE="$ROOT_DIR/public-docs/downloads-data.yaml"

# Parse data using yq
LATEST_VERSION=$(yq '.latest.version' "$DATA_FILE")
RELEASE_DATE=$(yq '.latest.release_date' "$DATA_FILE")
# ... extract all needed data

# Generate HTML from template
sed -e "s/{{LATEST_VERSION}}/$LATEST_VERSION/g" \
    -e "s/{{RELEASE_DATE}}/$RELEASE_DATE/g" \
    "$ROOT_DIR/public-docs/templates/downloads.html.template" > \
    "$ROOT_DIR/public-docs/downloads/index.html"

# Generate Markdown from template  
sed -e "s/{{LATEST_VERSION}}/$LATEST_VERSION/g" \
    -e "s/{{RELEASE_DATE}}/$RELEASE_DATE/g" \
    "$ROOT_DIR/public-docs/templates/downloads.md.template" > \
    "$ROOT_DIR/public-docs/downloads.md"
```

### HTML Template Structure

```html
<!-- downloads.html.template -->
<!doctype html>
<html lang="en" data-theme="dark">
<head>
    <!-- ... existing head content ... -->
    <style>
        /* Fix: Increase page width */
        .container {
            max-width: 1000px; /* Increased from 800px */
            margin: 0 auto;
            padding: 2rem;
        }
        
        /* Fix: Consistent link colors */
        .download-table a,
        .release-notes-link,
        .version-history a {
            color: var(--bitcoin-orange);
            text-decoration: none;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .download-table a:hover,
        .release-notes-link:hover, 
        .version-history a:hover {
            text-decoration: underline;
            color: #FF7A00;
        }
    </style>
</head>
<body>
    <!-- ... existing structure ... -->
    
    <div class="section">
        <h2>Latest Release</h2>
        <h3>Version {{LATEST_VERSION}}</h3>
        <p><strong>Released:</strong> {{RELEASE_DATE}}</p>
        <p><strong>Release Notes:</strong> 
           <a href="{{GITHUB_RELEASE_URL}}" target="_blank" class="release-notes-link">View on GitHub</a>
        </p>
        
        <table class="download-table">
            <thead>
                <tr>
                    <th>Platform</th>
                    <th>Type</th>
                    <th>Size</th> <!-- New column -->
                    <th>Download</th>
                </tr>
            </thead>
            <tbody>
                {{#DOWNLOADS}}
                <tr>
                    <td>{{PLATFORM}}</td>
                    <td>{{TYPE}}</td>
                    <td>{{SIZE_MB}}</td> <!-- New data -->
                    <td><a href="{{DOWNLOAD_URL}}">{{FILENAME}}</a></td>
                </tr>
                {{/DOWNLOADS}}
            </tbody>
        </table>
    </div>
</body>
</html>
```

## Benefits of This Design

### Immediate Fixes
✅ **No more AWK nightmare** - Simple string substitution  
✅ **No temporary files** - Direct output generation  
✅ **Consistent updates** - Both files generated from same data  
✅ **File sizes included** - Easy to add to data file  
✅ **Consistent styling** - All links use brand orange  
✅ **Better layout** - Wider container prevents wrapping  

### Future Benefits
✅ **Easy to extend** - Add GPG signatures, more metadata  
✅ **Version controlled** - Data file changes are tracked  
✅ **Validation possible** - YAML schema validation  
✅ **Multi-format** - Can generate JSON, XML, etc. later  

### Maintenance Benefits
✅ **Single script** - Replace 3 complex scripts  
✅ **Clear separation** - Data vs presentation logic  
✅ **Testable** - Can validate generated output  
✅ **Documentation** - Self-documenting data structure  

## Implementation Plan

### Phase 1: Setup Template System
1. Move existing scripts to `scripts/ci/`
2. Create `downloads-data.yaml` with current v0.1.7 data
3. Create HTML and Markdown templates
4. Build `generate-downloads.sh` script
5. Update Makefile references

### Phase 2: Style Improvements  
1. Fix link color consistency
2. Increase page width 
3. Add file size column
4. Test responsive layout

### Phase 3: Integration
1. Update `publish-production.sh` to use new system
2. Remove old AWK-based update logic
3. Clean up temporary file references
4. Update documentation

### Phase 4: Data Enhancement
1. Add file metadata fetching from GitHub API
2. Include file sizes, hashes, timestamps
3. Prepare structure for future GPG signatures

## Migration Strategy

### Backward Compatibility
- Keep existing `make` commands working
- Gradual replacement of scripts
- Test with current v0.1.7 data first

### Rollback Plan
- Keep old scripts as `.backup` until new system proven
- Data file can be manually created if GitHub API fails
- Templates are simple enough to debug quickly

## Success Metrics

- ✅ No manual HTML editing required
- ✅ Both MD and HTML stay in sync
- ✅ No temporary files left behind
- ✅ File sizes displayed correctly
- ✅ Consistent link styling
- ✅ No filename wrapping on standard screens
- ✅ Single script replaces three complex ones

---

*This design eliminates the fragile AWK-based approach while providing a foundation for future enhancements like GPG signatures and automated verification.*