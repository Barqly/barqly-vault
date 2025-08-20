#!/bin/bash

# Fix test files to use tauri-safe mocks properly

find ~/projects/barqly-vault/src-ui/src/__tests__/hooks -name "*.test.ts" | while read file; do
  echo "Processing $file"
  
  # Create a temporary file
  temp_file="${file}.tmp"
  
  # Process the file
  awk '
    BEGIN { 
      in_mock_section = 0
      printed_mock = 0
      printed_imports = 0
    }
    
    # Skip duplicate mock statements
    /vi\.mock\(.*tauri-safe.*\)/ {
      if (!printed_mock) {
        print "// Mock the safe wrappers"
        print "vi.mock('\''../../lib/tauri-safe'\'', () => ({"
        print "  safeInvoke: vi.fn(),"
        print "  safeListen: vi.fn().mockResolvedValue(() => Promise.resolve()),"
        print "}));"
        print ""
        printed_mock = 1
      }
      next
    }
    
    # Skip old mock statements
    /vi\.mock\(.*@tauri-apps.*\)/ {
      if (!printed_mock) {
        print "// Mock the safe wrappers"
        print "vi.mock('\''../../lib/tauri-safe'\'', () => ({"
        print "  safeInvoke: vi.fn(),"
        print "  safeListen: vi.fn().mockResolvedValue(() => Promise.resolve()),"
        print "}));"
        print ""
        printed_mock = 1
      }
      next
    }
    
    # Replace mock imports
    /const mockInvoke.*@tauri-apps.*invoke/ {
      if (!printed_imports) {
        print "const mockSafeInvoke = vi.mocked(await import('\''../../lib/tauri-safe'\'')).safeInvoke;"
        printed_imports = 1
      }
      next
    }
    
    /const mockListen.*@tauri-apps.*listen/ {
      if (!printed_imports) {
        print "const mockSafeListen = vi.mocked(await import('\''../../lib/tauri-safe'\'')).safeListen;"
        printed_imports = 1
      } else {
        print "const mockSafeListen = vi.mocked(await import('\''../../lib/tauri-safe'\'')).safeListen;"
      }
      next
    }
    
    /const mockSafeInvoke.*tauri-safe/ {
      if (!printed_imports) {
        print $0
        printed_imports = 1
      }
      next
    }
    
    /const mockSafeListen.*tauri-safe/ {
      print $0
      next
    }
    
    # Print all other lines
    { print }
  ' "$file" > "$temp_file"
  
  # Replace the original file
  mv "$temp_file" "$file"
done

echo "Test mocks fixed!"