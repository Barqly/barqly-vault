#!/usr/bin/env python3
"""
Simple template system for download pages
Replace {{VARIABLES}} in template with actual values - that's it!
"""

import json
import sys
from pathlib import Path

def main():
    script_dir = Path(__file__).parent
    root_dir = script_dir.parent.parent
    
    # Templates and data now co-located with script
    data_file = script_dir / "downloads" / "data.json"
    html_template = script_dir / "downloads" / "downloads.html.template"
    md_template = script_dir / "downloads" / "downloads.md.template"
    
    # Output still goes to public-docs (generated files)
    output_html = root_dir / "public-docs" / "downloads" / "index.html"
    output_md = root_dir / "public-docs" / "downloads.md"
    
    print("🔄 Generating download pages from template...")
    
    # Load data
    try:
        with open(data_file) as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: Data file not found: {data_file}")
        sys.exit(1)
    
    # Basic variables for templates
    variables = {
        'LATEST_VERSION': data['latest']['version'],
        'RELEASE_DATE': data['latest']['release_date'],
        'GITHUB_RELEASE_URL': data['latest']['github_release_url'],
        'CHECKSUMS_URL': data['latest']['verification']['checksums_url']
    }
    
    print(f"📋 Processing version {variables['LATEST_VERSION']}")
    
    # Generate HTML
    print("🔨 Generating HTML...")
    html_content = generate_content(html_template, data, variables)
    with open(output_html, 'w') as f:
        f.write(html_content)
    
    # Generate Markdown
    print("🔨 Generating Markdown...")
    md_content = generate_content(md_template, data, variables) 
    with open(output_md, 'w') as f:
        f.write(md_content)
    
    print("")
    print("✅ Download pages generated successfully!")
    print(f"   - HTML: {output_html}")
    print(f"   - Markdown: {output_md}")

def generate_content(template_path, data, variables):
    """Generate content from template with data and variables"""
    with open(template_path) as f:
        content = f.read()
    
    # Replace basic variables
    for var, value in variables.items():
        content = content.replace(f'{{{{{var}}}}}', value)
    
    # Generate download table rows for HTML/Markdown
    if '{{DOWNLOAD_ROWS}}' in content:
        downloads = data['latest']['downloads']
        rows = []
        
        # Platform mapping for display
        platform_info = {
            'macos_arm64': ('macOS (Apple Silicon)', 'DMG'),
            'macos_x64': ('macOS (Intel)', 'DMG'),
            'windows_msi': ('Windows', 'MSI Installer'),
            'windows_zip': ('Windows', 'ZIP Archive'),
            'linux_deb': ('Linux', 'DEB Package'),
            'linux_rpm': ('Linux', 'RPM Package'), 
            'linux_appimage': ('Linux', 'AppImage'),
            'linux_tar': ('Linux', 'TAR.GZ')
        }
        
        for key, download in downloads.items():
            if key in platform_info:
                platform, _ = platform_info[key]  # We no longer need file_type
                filename = download['filename']
                size = download['size']
                
                if '.html' in str(template_path):
                    # HTML row format: Platform | Size | Download
                    row = f"""              <tr>
                <td>{platform}</td>
                <td>{size}</td>
                <td><a href="https://github.com/barqly/barqly-vault/releases/download/v{data['latest']['version']}/{filename}">{filename}</a></td>
              </tr>"""
                else:
                    # Markdown row format: Platform | Size | Download
                    row = f"| {platform} | {size} | [{filename}](https://github.com/barqly/barqly-vault/releases/download/v{data['latest']['version']}/{filename}) |"
                
                rows.append(row)
        
        content = content.replace('{{DOWNLOAD_ROWS}}', '\n'.join(rows))
    
    # Generate version history for HTML/Markdown
    if '{{VERSION_HISTORY}}' in content:
        archive = data.get('archive', [])
        if archive:
            history_items = []
            for version_info in archive:
                version = version_info['version']
                url = version_info['github_release_url']
                
                if '.html' in str(template_path):
                    # HTML format
                    item = f'              <div class="version-item"><a href="{url}">Version {version}</a></div>'
                else:
                    # Markdown format
                    item = f'- [Version {version}]({url})'
                
                history_items.append(item)
            
            if '.html' in str(template_path):
                history_content = f"""            <div class="version-history-grid">
{chr(10).join(history_items)}
            </div>"""
            else:
                history_content = '\n'.join(history_items)
        else:
            if '.html' in str(template_path):
                history_content = """            <div class="no-releases">
              <p>Release history will appear here once the first production release is available.</p>
            </div>"""
            else:
                history_content = "Version history will be available after multiple releases."
        
        content = content.replace('{{VERSION_HISTORY}}', history_content)
    
    return content

if __name__ == "__main__":
    main()