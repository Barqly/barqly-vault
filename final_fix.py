#!/usr/bin/env python3
import os
import re

def fix_println_in_file(file_path):
    """Fix println! statements in a single file"""
    with open(file_path, 'r') as f:
        content = f.read()

    # Skip if already has the imports
    has_imports = 'use crate::log_sensitive;' in content or 'use crate::prelude::*;' in content

    if not has_imports and 'println!' in content:
        # Add imports if needed
        import_added = False
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('use ') and not import_added:
                # Add after first use statement
                lines.insert(i+1, 'use crate::log_sensitive;')
                lines.insert(i+2, 'use crate::tracing_setup::debug;')
                import_added = True
                break

    # Replace println! statements - handle multiline ones too
    content = '\n'.join(lines) if 'lines' in locals() else content

    # Simple single-line println!
    content = re.sub(
        r'(\s*)println!\((.*?)\);',
        r'\1log_sensitive!(dev_only: {\n\1    debug!(\2);\n\1});',
        content
    )

    # Multiline println! (up to 4 lines)
    content = re.sub(
        r'(\s*)println!\(([\s\S]*?\n[\s\S]*?\n[\s\S]*?\n[\s\S]*?)\);',
        lambda m: f'{m.group(1)}log_sensitive!(dev_only: {{\n{m.group(1)}    debug!({m.group(2)});\n{m.group(1)}}});',
        content
    )

    with open(file_path, 'w') as f:
        f.write(content)

# Fix all rust files
for root, dirs, files in os.walk('/Users/nauman/projects/barqly-vault/src-tauri/src'):
    for file in files:
        if file.endswith('.rs'):
            file_path = os.path.join(root, file)
            fix_println_in_file(file_path)

print("Fixed all files")