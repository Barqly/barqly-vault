#!/bin/bash

# Update Downloads Page Script
# Updates public-docs/downloads.md and downloads/index.html with latest release info

set -e

# Check if version is provided
if [ -z "$1" ]; then
    echo "❌ Error: Version number required"
    echo "Usage: $0 <version>"
    echo "Example: $0 0.1.0"
    exit 1
fi

VERSION="$1"
REPO="barqly/barqly-vault"

echo "🔄 Updating downloads page for version $VERSION"

# Get release information from GitHub API
echo "📋 Fetching release information..."
RELEASE_DATA=$(gh api repos/$REPO/releases/tags/v$VERSION 2>/dev/null || echo "{}")
if [ "$RELEASE_DATA" = "{}" ]; then
    echo "⚠️ Warning: Could not fetch release data from API, using defaults"
    RELEASE_URL="https://github.com/$REPO/releases/tag/v$VERSION"
    PUBLISHED_DATE=$(date +%Y-%m-%d)
else
    RELEASE_URL=$(echo "$RELEASE_DATA" | jq -r '.html_url // empty')
    PUBLISHED_DATE=$(echo "$RELEASE_DATA" | jq -r '.published_at // empty' | cut -d'T' -f1)
fi

# Create downloads table for this version
cat > /tmp/version_section.md << EOF
## Version $VERSION

**Released:** $PUBLISHED_DATE  
**Release Notes:** [View on GitHub]($RELEASE_URL)

| Platform | Type | Download |
|----------|------|----------|
| macOS (Apple Silicon) | DMG | [barqly-vault-$VERSION-macos-arm64.dmg](https://github.com/$REPO/releases/download/v$VERSION/barqly-vault-$VERSION-macos-arm64.dmg) |
| macOS (Intel) | DMG | [barqly-vault-$VERSION-macos-x86_64.dmg](https://github.com/$REPO/releases/download/v$VERSION/barqly-vault-$VERSION-macos-x86_64.dmg) |
| Windows | MSI Installer | [barqly-vault-$VERSION-x64.msi](https://github.com/$REPO/releases/download/v$VERSION/barqly-vault-$VERSION-x64.msi) |
| Windows | ZIP Archive | [barqly-vault-$VERSION-windows-x64.zip](https://github.com/$REPO/releases/download/v$VERSION/barqly-vault-$VERSION-windows-x64.zip) |
| Linux | DEB Package | [barqly-vault-$VERSION-1_amd64.deb](https://github.com/$REPO/releases/download/v$VERSION/barqly-vault-$VERSION-1_amd64.deb) |
| Linux | RPM Package | [barqly-vault-$VERSION-1.x86_64.rpm](https://github.com/$REPO/releases/download/v$VERSION/barqly-vault-$VERSION-1.x86_64.rpm) |
| Linux | AppImage | [barqly-vault-$VERSION-1_amd64.AppImage](https://github.com/$REPO/releases/download/v$VERSION/barqly-vault-$VERSION-1_amd64.AppImage) |
| Linux | TAR.GZ | [barqly-vault-$VERSION-x86_64.tar.gz](https://github.com/$REPO/releases/download/v$VERSION/barqly-vault-$VERSION-x86_64.tar.gz) |

**Checksums:** [checksums.txt](https://github.com/$REPO/releases/download/v$VERSION/checksums.txt)

---
EOF

# Update downloads.md
echo "📝 Updating public-docs/downloads.md"

# Create the new downloads.md content
cat > public-docs/downloads.md << 'EOF'
# Download Barqly Vault

**Get the latest stable version of Barqly Vault**

---

## Latest Release

EOF

# Add the latest version section
cat /tmp/version_section.md >> public-docs/downloads.md

# Add version history header
cat >> public-docs/downloads.md << 'EOF'

## Version History

EOF

# Get previous versions (limit to last 10 releases)
echo "📚 Adding version history..."
PREVIOUS_RELEASES=$(gh api repos/$REPO/releases --jq '.[] | select(.draft == false and .prerelease == false) | .tag_name' | head -10 | tail -n +2 || echo "")

if [ -n "$PREVIOUS_RELEASES" ]; then
    for tag in $PREVIOUS_RELEASES; do
        version=${tag#v}
        echo "- [Version $version](https://github.com/$REPO/releases/tag/$tag)" >> public-docs/downloads.md
    done
else
    echo "Version history will be available after multiple releases." >> public-docs/downloads.md
fi

# Add footer
cat >> public-docs/downloads.md << 'EOF'

## Installation Instructions

### macOS
- Download the `.dmg` file appropriate for your Mac:
  - **Apple Silicon** (M1/M2/M3): Use the `arm64` version
  - **Intel**: Use the `x86_64` version
- Open the `.dmg` file and drag Barqly Vault to Applications

### Windows
- **Installer (Recommended)**: Download the `.msi` file and run it
- **Portable**: Download the `.zip` file, extract, and run the executable

### Linux
- **AppImage (Universal)**: Download, make executable (`chmod +x`), and run
- **Debian/Ubuntu**: Download the `.deb` file and install with `dpkg -i`
- **RedHat/Fedora**: Download the `.rpm` file and install with `rpm -i`
- **Standalone**: Download the `.tar.gz` file and extract

---

## Checksums

For security verification, always check the SHA256 checksums against the `checksums.txt` file included with each release.

---

_Looking for beta releases or source code? Visit our [GitHub repository](https://github.com/barqly/barqly-vault)._
EOF

echo "✅ downloads.md updated successfully"

# Also update the HTML version if it exists
if [ -f "public-docs/downloads/index.html" ]; then
    echo "📝 Updating public-docs/downloads/index.html"
    
    # Create a backup
    cp public-docs/downloads/index.html public-docs/downloads/index.html.bak
    
    # First, update the Latest Release section
    # Use a temporary file to build the updated HTML
    awk '
    BEGIN { in_latest = 0; done_latest = 0 }
    /<div class="section">/ {
        if (!done_latest) {
            section_start = $0
            getline
            if ($0 ~ /<h2>Latest Release<\/h2>/) {
                in_latest = 1
                print "        <div class=\"section\">"
                print "          <h2>Latest Release</h2>"
                print "          <h3>Version '"$VERSION"'</h3>"
                print "          <p><strong>Released:</strong> '"$PUBLISHED_DATE"'</p>"
                print "          <p><strong>Release Notes:</strong> <a href=\"'"$RELEASE_URL"'\" target=\"_blank\">View on GitHub</a></p>"
                print "          "
                print "          <table class=\"download-table\">"
                print "            <thead>"
                print "              <tr>"
                print "                <th>Platform</th>"
                print "                <th>Type</th>"
                print "                <th>Download</th>"
                print "              </tr>"
                print "            </thead>"
                print "            <tbody>"
                print "              <tr>"
                print "                <td>macOS (Apple Silicon)</td>"
                print "                <td>DMG</td>"
                print "                <td><a href=\"https://github.com/'"$REPO"'/releases/download/v'"$VERSION"'/barqly-vault-'"$VERSION"'-macos-arm64.dmg\">barqly-vault-'"$VERSION"'-macos-arm64.dmg</a></td>"
                print "              </tr>"
                print "              <tr>"
                print "                <td>macOS (Intel)</td>"
                print "                <td>DMG</td>"
                print "                <td><a href=\"https://github.com/'"$REPO"'/releases/download/v'"$VERSION"'/barqly-vault-'"$VERSION"'-macos-x86_64.dmg\">barqly-vault-'"$VERSION"'-macos-x86_64.dmg</a></td>"
                print "              </tr>"
                print "              <tr>"
                print "                <td>Windows</td>"
                print "                <td>MSI Installer</td>"
                print "                <td><a href=\"https://github.com/'"$REPO"'/releases/download/v'"$VERSION"'/barqly-vault-'"$VERSION"'-x64.msi\">barqly-vault-'"$VERSION"'-x64.msi</a></td>"
                print "              </tr>"
                print "              <tr>"
                print "                <td>Windows</td>"
                print "                <td>ZIP Archive</td>"
                print "                <td><a href=\"https://github.com/'"$REPO"'/releases/download/v'"$VERSION"'/barqly-vault-'"$VERSION"'-windows-x64.zip\">barqly-vault-'"$VERSION"'-windows-x64.zip</a></td>"
                print "              </tr>"
                print "              <tr>"
                print "                <td>Linux</td>"
                print "                <td>DEB Package</td>"
                print "                <td><a href=\"https://github.com/'"$REPO"'/releases/download/v'"$VERSION"'/barqly-vault-'"$VERSION"'-1_amd64.deb\">barqly-vault-'"$VERSION"'-1_amd64.deb</a></td>"
                print "              </tr>"
                print "              <tr>"
                print "                <td>Linux</td>"
                print "                <td>RPM Package</td>"
                print "                <td><a href=\"https://github.com/'"$REPO"'/releases/download/v'"$VERSION"'/barqly-vault-'"$VERSION"'-1.x86_64.rpm\">barqly-vault-'"$VERSION"'-1.x86_64.rpm</a></td>"
                print "              </tr>"
                print "              <tr>"
                print "                <td>Linux</td>"
                print "                <td>AppImage</td>"
                print "                <td><a href=\"https://github.com/'"$REPO"'/releases/download/v'"$VERSION"'/barqly-vault-'"$VERSION"'-1_amd64.AppImage\">barqly-vault-'"$VERSION"'-1_amd64.AppImage</a></td>"
                print "              </tr>"
                print "              <tr>"
                print "                <td>Linux</td>"
                print "                <td>TAR.GZ</td>"
                print "                <td><a href=\"https://github.com/'"$REPO"'/releases/download/v'"$VERSION"'/barqly-vault-'"$VERSION"'-x86_64.tar.gz\">barqly-vault-'"$VERSION"'-x86_64.tar.gz</a></td>"
                print "              </tr>"
                print "            </tbody>"
                print "          </table>"
                print "          "
                print "          <p><strong>Checksums:</strong> <a href=\"https://github.com/'"$REPO"'/releases/download/v'"$VERSION"'/checksums.txt\">checksums.txt</a></p>"
                print "        </div>"
                done_latest = 1
            } else {
                print section_start
                print
            }
        } else {
            print
        }
    }
    /<\/div>/ && in_latest {
        in_latest = 0
        next
    }
    !in_latest { 
        if (!($0 ~ /<div class="section">/ && !done_latest)) {
            print
        }
    }
    ' public-docs/downloads/index.html > public-docs/downloads/index.html.tmp
    
    # Now update the Version History section
    # Get all production releases
    PREVIOUS_RELEASES=$(gh api repos/$REPO/releases --jq '.[] | select(.draft == false and .prerelease == false) | .tag_name' | head -10 || echo "")
    
    if [ -n "$PREVIOUS_RELEASES" ]; then
        # Build version history HTML
        VERSION_HISTORY=""
        FIRST=true
        for tag in $PREVIOUS_RELEASES; do
            version=${tag#v}
            if [ "$version" != "$VERSION" ] || [ "$FIRST" = false ]; then
                if [ -z "$VERSION_HISTORY" ]; then
                    VERSION_HISTORY="            <ul style=\"list-style: none; padding: 0; margin: 1rem 0;\">"
                else
                    VERSION_HISTORY="$VERSION_HISTORY
"
                fi
                VERSION_HISTORY="$VERSION_HISTORY              <li style=\"margin: 0.5rem 0;\"><a href=\"https://github.com/$REPO/releases/tag/$tag\">Version $version</a></li>"
            fi
            FIRST=false
        done
        if [ -n "$VERSION_HISTORY" ]; then
            VERSION_HISTORY="$VERSION_HISTORY
            </ul>"
        fi
        
        # Replace the Version History section
        awk -v history="$VERSION_HISTORY" '
        BEGIN { in_history = 0; done_history = 0 }
        /<div class="section">/ {
            if (!done_history) {
                section_start = $0
                getline
                if ($0 ~ /<h2>Version History<\/h2>/) {
                    in_history = 1
                    print "        <div class=\"section\">"
                    print "          <h2>Version History</h2>"
                    if (history != "") {
                        print history
                    } else {
                        print "          <div class=\"no-releases\">"
                        print "            <p>Release history will appear here once the first production release is available.</p>"
                        print "          </div>"
                    }
                    print "        </div>"
                    done_history = 1
                } else {
                    print section_start
                    print
                }
            } else {
                print
            }
        }
        /<\/div>/ && in_history {
            in_history = 0
            next
        }
        !in_history { 
            if (!($0 ~ /<div class="section">/ && !done_history)) {
                print
            }
        }
        ' public-docs/downloads/index.html.tmp > public-docs/downloads/index.html.new
    else
        mv public-docs/downloads/index.html.tmp public-docs/downloads/index.html.new
    fi
    
    # Replace the original file
    mv public-docs/downloads/index.html.new public-docs/downloads/index.html
    rm -f public-docs/downloads/index.html.tmp
    
    # Clean up backup if successful
    if [ -f "public-docs/downloads/index.html" ]; then
        rm public-docs/downloads/index.html.bak
        echo "✅ HTML downloads page updated successfully"
    else
        # Restore from backup if something went wrong
        mv public-docs/downloads/index.html.bak public-docs/downloads/index.html
        echo "⚠️ Error updating HTML, restored from backup"
    fi
fi

echo ""
echo "✅ Downloads pages updated locally"
echo ""
echo "📝 Next steps:"
echo "   1. Review the changes: git diff public-docs/"
echo "   2. Commit: git add public-docs/downloads.* && git commit -m \"docs: update downloads for v$VERSION\""
echo "   3. Push: git push"