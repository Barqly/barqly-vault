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
    
    # Simple variable replacement - no complex logic
    variables = {
        'LATEST_VERSION': data['latest']['version'],
        'RELEASE_DATE': data['latest']['release_date'],
        'GITHUB_RELEASE_URL': data['latest']['github_release_url'],
        'CHECKSUMS_URL': data['latest']['verification']['checksums_url']
    }
    
    print(f"📋 Processing version {variables['LATEST_VERSION']}")
    
    # Generate HTML
    print("🔨 Generating HTML...")
    with open(html_template) as f:
        html_content = f.read()
    
    for var, value in variables.items():
        html_content = html_content.replace(f'{{{{{var}}}}}', value)
    
    with open(output_html, 'w') as f:
        f.write(html_content)
    
    # Generate Markdown
    print("🔨 Generating Markdown...")
    with open(md_template) as f:
        md_content = f.read()
    
    for var, value in variables.items():
        md_content = md_content.replace(f'{{{{{var}}}}}', value)
    
    with open(output_md, 'w') as f:
        f.write(md_content)
    
    print("")
    print("✅ Download pages generated successfully!")
    print(f"   - HTML: {output_html}")
    print(f"   - Markdown: {output_md}")

if __name__ == "__main__":
    main()