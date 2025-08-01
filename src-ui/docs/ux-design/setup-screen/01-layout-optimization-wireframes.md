# Setup Screen Layout Optimization Wireframes

## Executive Summary

This document provides visual specifications for optimizing the Setup screen layout to achieve 85%+ form visibility on initial load while maintaining trust and professionalism.

## Current State Analysis

Based on the Product Owner's analysis and code review:

- **Header**: ~80px height (title + subtitle + borders)
- **Trust Indicators**: ~80px height (with margins)
- **Progress Context**: ~40px height
- **Form Section Header**: ~100px (title + subtitle + padding)
- **Total Static Content**: ~300px before form fields appear
- **Result**: Only 40-50% of form visible on initial load

## Optimized Layout Architecture

### Layout Hierarchy (Desktop - 1024px+ viewport)

```
┌─────────────────────────────────────────────────┐
│ Compact Header (40px)                           │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🛡️ Barqly Vault | Secure Bitcoin Legacy     │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ Main Content Area (calc(100vh - 40px))         │
│ ┌─────────────────────────────────────────────┐ │
│ │ Form Card (85% of viewport)                 │ │
│ │ ┌───────────────────────────────────────────┐ │
│ │ │ Form Title Bar (50px)                     │ │
│ │ │ "Create Your Encryption Identity"         │ │
│ │ │ [Trust badges inline: 🔒 Local • 📖 Open] │ │
│ │ ├───────────────────────────────────────────┤ │
│ │ │ Form Fields (immediate visibility)        │ │
│ │ │                                           │ │
│ │ │ Key Label: [___________________]         │ │
│ │ │                                           │ │
│ │ │ Passphrase: [___________________]        │ │
│ │ │ [Strength indicator]                     │ │
│ │ │                                           │ │
│ │ │ Confirm: [___________________]           │ │
│ │ │                                           │ │
│ │ │ [Clear] [Create Security Identity]       │ │
│ │ └───────────────────────────────────────────┘ │
│ │                                               │
│ │ Progressive Help (collapsed by default)      │
│ │ [ℹ️ Learn how this protects your Bitcoin ▼]   │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Mobile Layout (< 768px)

```
┌─────────────────────┐
│ Header (36px)       │
│ 🛡️ Barqly Vault     │
├─────────────────────┤
│ Form (100% - 36px)  │
│ ┌───────────────────┐
│ │ Create Identity   │
│ │ 🔒 Secure • Local │
│ ├───────────────────┤
│ │ Key Label:        │
│ │ [_____________]   │
│ │                   │
│ │ Passphrase:       │
│ │ [_____________]   │
│ │                   │
│ │ Confirm:          │
│ │ [_____________]   │
│ │                   │
│ │ [Create Identity] │
│ └───────────────────┘
└─────────────────────┘
```

## Component-Level Optimizations

### 1. Compact Header (40px total)

- **Before**: 80px with separate title/subtitle lines
- **After**: 40px single line with brand and tagline
- **Implementation**:
  ```
  Logo + "Barqly Vault" | "Secure Bitcoin Legacy"
  - Single horizontal line
  - Smaller font sizes (16px/14px)
  - Minimal padding (8px vertical)
  ```

### 2. Integrated Trust Indicators

- **Before**: Separate 80px block below header
- **After**: Inline badges in form title bar
- **Visual**: Small icons with text (🔒 Local • 📖 Open-source)
- **Hover**: Tooltip with extended information

### 3. Form-First Card Design

- **Card Styling**:
  - Subtle shadow for depth
  - White background
  - 85% viewport height
  - Centered with breathing room
- **Title Bar**:
  - Form title prominent
  - Trust badges right-aligned
  - Light gray background for separation

### 4. Progressive Disclosure Pattern

```
Collapsed State:
[ℹ️ Learn how this protects your Bitcoin ▼]

Expanded State (slides down):
┌─────────────────────────────────────┐
│ How Your Bitcoin Legacy Works       │
│                                     │
│ 1️⃣ Generate Keys → 2️⃣ Encrypt → 3️⃣ Store │
│                                     │
│ [Detailed explanation...]           │
└─────────────────────────────────────┘
```

## Space Allocation Comparison

### Current Layout (768px viewport height)

- Static content: 300px (39%)
- Form visible: 468px (61%)
- **Result**: Scroll required

### Optimized Layout (768px viewport height)

- Header: 40px (5%)
- Form card padding: 60px (8%)
- Form content: 668px (87%)
- **Result**: Full form visible, no scroll

## Interaction Specifications

### Focus Management

1. **Auto-focus**: Key Label field on page load
2. **Tab order**: Label → Pass → Confirm → Create button
3. **Visual focus**: Blue ring with 2px offset

### Micro-animations

1. **Form appearance**: Subtle fade-in (200ms)
2. **Field focus**: Scale transform (1.02) on wrapper
3. **Button hover**: Background color transition
4. **Help expand**: Smooth height animation (300ms)

### Responsive Behavior

- **1024px+**: Full desktop layout
- **768-1023px**: Compact spacing, same structure
- **<768px**: Mobile stack, 100% width components
- **<400px**: Further reduced padding, smaller fonts

## Visual Design Tokens

### Spacing Scale

- `space-xs`: 4px (tight element spacing)
- `space-sm`: 8px (form field gaps)
- `space-md`: 16px (section spacing)
- `space-lg`: 24px (card padding)

### Typography Scale

- `text-xs`: 12px (helper text, badges)
- `text-sm`: 14px (labels, secondary)
- `text-base`: 16px (inputs, body)
- `text-lg`: 18px (form title)
- `text-xl`: 20px (page title - desktop only)

### Color Palette

- **Primary**: `#2563EB` (Bitcoin-appropriate blue)
- **Success**: `#059669` (valid states)
- **Surface**: `#FFFFFF` (cards)
- **Background**: `#F9FAFB` (page)
- **Border**: `#E5E7EB` (subtle divisions)

## Implementation Priority

1. **Phase 1**: Header compaction + Trust indicator integration
2. **Phase 2**: Form card restructure with 85% height
3. **Phase 3**: Progressive help implementation
4. **Phase 4**: Micro-interactions and polish

## Success Metrics

- Form visibility on load: ≥85% (up from 40-50%)
- Time to first input: <500ms
- Zero scroll actions before form completion
- Trust indicator engagement via hover: >30%
- Help section expansion rate: 15-25% (curiosity without confusion)
