# UI Capture Tool

Simple on-demand desktop screenshot capture tool for design consistency analysis of Barqly Vault.

## Overview

This tool provides a "capture what you see" approach to UI screenshot capture. You manually navigate your desktop app to any state you want to analyze, then press hotkeys to capture screenshots. The tool then generates structured analysis prompts for AI-powered design consistency review.

## Features

- **On-demand capture**: Press 'c' to capture current desktop state
- **Flexible workflow**: No predefined screens or navigation paths
- **Session management**: Organized screenshot sessions with metadata
- **AI analysis integration**: Generates structured prompts for Claude Code
- **Git-friendly**: Raw screenshots excluded, analysis results tracked

## Quick Start

### Setup

```bash
# Install dependencies (run once)
make ui-capture-setup
# or
npm run ui:capture:setup
```

### Basic Usage

```bash
# Start capture session
make ui-capture

# Generate analysis for latest session
make ui-analyze
```

## Interactive Workflow

1. **Start capture session**: `make ui-capture`
2. **Navigate your app**: Open Barqly Vault and navigate to states you want to analyze
3. **Capture screenshots**: Press 'c' + Enter when you see something interesting
4. **Add descriptions**: Optionally describe each capture for context
5. **Finish session**: Press 'q' + Enter when done
6. **Generate analysis**: Choose to generate AI analysis prompts

### Commands During Capture

- `c` - Capture current desktop screenshot
- `q` - Quit and finalize session
- `l` - List current captures in session
- `h` - Show help

## Example Session

```bash
make ui-capture

> 📸 UI Capture Mode Active
> Ready to capture. Press 'c' when you see something to screenshot...

c [Enter]
> ✅ Screenshot 1 captured
> 📝 Enter description: Setup screen - empty form

c [Enter]
> ✅ Screenshot 2 captured
> 📝 Enter description: Setup screen - validation errors

c [Enter]
> ✅ Screenshot 3 captured
> 📝 Enter description: Encrypt screen - files selected

q [Enter]
> 🎉 Captured 3 screenshots in session 2025-01-09_143022
> 🤖 Generate AI analysis? (y/n): y
> 📄 Analysis files saved to docs/ui-captures/analysis/2025-01-09_143022/
```

## Output Structure

```
docs/ui-captures/
├── sessions/                    # Gitignored - raw screenshots
│   └── 2025-01-09_143022/
│       ├── screenshots/
│       │   ├── capture-1.png
│       │   ├── capture-2.png
│       │   └── capture-3.png
│       └── session-manifest.json
├── analysis/                    # Git-tracked - analysis results
│   └── 2025-01-09_143022/
│       ├── analysis-prompt.md   # Ready-to-use Claude Code prompt
│       └── analysis-results.md  # Template for AI results
└── latest/                     # Symlink to most recent session
```

## Analysis Workflow

1. **Capture screenshots** using the tool
2. **Review generated prompt** in `docs/ui-captures/analysis/[session]/analysis-prompt.md`
3. **Copy prompt to Claude Code** and request analysis
4. **Save results** in `analysis-results.md` for future reference

The generated analysis prompt includes:

- Screenshot metadata and descriptions
- Structured analysis request for design consistency
- Specific focus areas (colors, typography, layout, UX)
- Prioritized recommendation format

## Advanced Usage

### Analysis Only

Generate analysis prompt for existing capture session:

```bash
make ui-analyze
npm run ui:analyze
```

### Custom Session Names (Future)

```bash
npm run ui:capture -- --session="error-states-audit"
```

### Auto-Analysis (Future)

Direct Claude Code integration:

```bash
npm run ui:capture -- --auto-analyze
```

## Use Cases

### Error State Documentation

1. Navigate to forms with various error states
2. Capture each error presentation
3. Analyze consistency of error styling

### Workflow State Analysis

1. Go through complete user workflows (setup → encrypt → decrypt)
2. Capture key states in each workflow
3. Analyze consistency across user journeys

### Component Consistency Audit

1. Find screens with similar components (buttons, forms, cards)
2. Capture variations of the same component types
3. Identify standardization opportunities

### Before/After Comparison

1. Capture current UI state
2. Make design changes
3. Capture updated state
4. Compare sessions for improvement validation

## Tips

- **Start your desktop app first** before running the capture tool
- **Navigate manually** - you control timing and state setup
- **Describe captures** for better analysis context
- **Capture error states** - these often reveal consistency issues
- **Use meaningful descriptions** - helps with analysis quality
- **Review analysis prompts** before sending to Claude Code

## Troubleshooting

### Permission Issues

If screenshot capture fails:

- Check system screenshot permissions for Terminal/Node
- Try running with `sudo` (not recommended for regular use)
- Verify no screen recording restrictions

### Dependencies

If tool fails to start:

```bash
cd scripts/ui-capture
npm install
```

### File System Issues

If directory creation fails:

- Verify write permissions in `docs/` directory
- Check available disk space
- Ensure `docs/ui-captures/` exists

## Integration

The tool integrates seamlessly with existing development workflow:

- **Package.json scripts**: `npm run ui:capture`, `npm run ui:analyze`
- **Makefile targets**: `make ui-capture`, `make ui-analyze`
- **Git strategy**: Screenshots excluded, analysis results tracked
- **Claude Code ready**: Generates structured prompts for AI analysis

## Future Enhancements

- Quick labeling shortcuts (e.g., `c setup` for fast descriptions)
- Session comparison utilities
- Automated analysis via Claude Code Task system
- Design system compliance checking
- Historical trend analysis

---

_Part of Barqly Vault development tools. See main project documentation for more information._
