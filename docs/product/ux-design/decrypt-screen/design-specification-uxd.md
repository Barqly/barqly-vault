# Decrypt Screen Design Specification

> **Version**: 1.0  
> **Status**: Implementation Ready  
> **Designer**: UX Designer, ZenAI Team  
> **Last Updated**: January 2025  
> **Related**: Task 4.2.4.3 - Decrypt Page Implementation

## Executive Summary

The Decrypt screen is the moment of truth for Barqly Vault—where users recover their Bitcoin custody data when it matters most. This interface transforms a potentially anxiety-inducing recovery process into a calm, guided experience that works flawlessly under pressure. Every design decision prioritizes clarity, emotional support, and successful recovery, recognizing that users may be accessing this screen during emergencies, inheritance events, or after years of storage.

## Design Philosophy

### Core Principles

1. **Anxiety Reduction Through Design**
   - Calming color palette and generous white space reduce stress
   - Clear progress indicators eliminate uncertainty at every step
   - Reassuring language acknowledges the emotional context
   - Visual hierarchy guides attention without overwhelming

2. **Recovery Confidence Building**
   - Each successful step reinforces trust in the process
   - Visual feedback confirms correct actions immediately
   - Multiple recovery paths prevent panic when issues arise
   - Success celebration appropriate to the gravity of the moment

3. **Universal Accessibility**
   - Interface works for grieving family members and technical experts alike
   - No Bitcoin or encryption knowledge required for success
   - Visual and textual cues work together for clarity
   - Mobile-optimized for emergency access on any device

4. **Fail-Safe Design**
   - Multiple validation checks prevent data loss
   - Clear error messages with actionable recovery steps
   - Non-destructive operations preserve original files
   - Graceful handling of partial failures

## Visual Design System

### Color Palette (Recovery-Optimized)

```css
/* Primary Colors - Calming & Professional */
--trust-blue: #2563EB;         /* Primary actions, security */
--trust-blue-hover: #1D4ED8;
--recovery-green: #059669;     /* Success, positive progress */
--recovery-green-light: #10B981;
--bitcoin-orange: #F7931A;     /* Bitcoin accent, used sparingly */

/* Semantic Colors - Clear Communication */
--success-green: #059669;
--success-green-bg: #F0FDF4;
--error-red: #DC2626;         /* Softened for less alarm */
--error-red-bg: #FEF2F2;
--warning-amber: #D97706;
--warning-amber-bg: #FFFBEB;
--info-blue: #2563EB;
--info-blue-bg: #EFF6FF;

/* Neutral Palette - Calming Foundation */
--gray-900: #111827;           /* Primary text */
--gray-800: #1F2937;           /* Headers */
--gray-700: #374151;           /* Secondary text */
--gray-600: #4B5563;           /* Tertiary text */
--gray-500: #6B7280;           /* Helper text */
--gray-400: #9CA3AF;           /* Disabled text */
--gray-300: #D1D5DB;           /* Borders */
--gray-200: #E5E7EB;           /* Dividers */
--gray-100: #F3F4F6;           /* Backgrounds */
--gray-50: #F9FAFB;            /* Subtle backgrounds */

/* Special Purpose - Recovery States */
--shield-green: #059669;       /* Security success */
--lock-open-blue: #2563EB;     /* Unlocking state */
--progress-gradient: linear-gradient(90deg, #2563EB 0%, #059669 100%);
--calm-gradient: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
```

### Typography System

```css
/* Font Stack - System Fonts for Reliability */
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
               'Helvetica Neue', 'Arial', sans-serif;
--font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;

/* Scale - Readable Under Stress */
--heading-xxl: 2rem;      /* 32px - Success messages */
--heading-xl: 1.875rem;   /* 30px - Page title */
--heading-lg: 1.5rem;     /* 24px - Section titles */
--heading-md: 1.25rem;    /* 20px - Subsections */
--heading-sm: 1.125rem;   /* 18px - Card headers */
--text-base: 1rem;        /* 16px - Body text */
--text-md: 0.9375rem;     /* 15px - Enhanced readability */
--text-sm: 0.875rem;      /* 14px - Secondary text */
--text-xs: 0.75rem;       /* 12px - Captions */

/* Weights - Clear Hierarchy */
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights - Comfortable Reading */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
--leading-loose: 2;
```

### Spacing & Layout

```css
/* 8-point Grid System */
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */

/* Container Constraints */
--container-max: 1280px;
--content-max: 768px;     /* Narrower for focused attention */
--form-max: 640px;
```

## Layout Architecture

### Viewport Distribution (1280x800 baseline)

```
┌────────────────────────────────────────────────────────┐
│ Header & Context                               8% (64px)│
├────────────────────────────────────────────────────────┤
│ Progress Indicator                             5% (40px)│
├────────────────────────────────────────────────────────┤
│ File Selection                                25% (200px)│
├────────────────────────────────────────────────────────┤
│ Passphrase Entry                               25% (200px)│
├────────────────────────────────────────────────────────┤
│ Destination Selection                          20% (160px)│
├────────────────────────────────────────────────────────┤
│ Action & Status                                17% (136px)│
└────────────────────────────────────────────────────────┘
```

### Responsive Behavior

- **Desktop (≥1024px)**: Centered 768px container with generous padding
- **Tablet (768-1023px)**: Full width with 32px padding
- **Mobile (<768px)**: Full width with 16px padding, stacked layout

## Component Specifications

### 1. Page Header with Trust Building

```
┌─────────────────────────────────────────────────────────────┐
│  🔓  Decrypt Your Vault                                      │
│      Recover your encrypted Bitcoin custody files            │
│  ─────────────────────────────────────────────────────────  │
│  🛡️ Military-grade  |  🔒 Local-only  |  ⏱️ Under 60 seconds │
│     decryption          recovery          typical            │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Container height: 64px (40px header + 24px trust bar)
- Background: White with subtle bottom shadow (0 1px 2px rgba(0,0,0,0.05))
- Icon: Unlock (24px, --trust-blue)
- Title: 24px, font-semibold, --gray-900
- Subtitle: 14px, font-regular, --gray-600
- Trust badges: 12px text with 14px icons, --gray-500
- Bottom border: 1px solid --gray-200

### 2. Recovery Progress Indicator

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Select Vault → Step 2: Enter Passphrase → Step 3:  │
│  Choose Destination → Ready to Decrypt                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░  40% Complete     │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Height: 40px
- Background: --gray-50
- Progress bar: 4px height, --progress-gradient fill
- Step text: 12px, --gray-600 (completed), --gray-900 (current), --gray-400 (pending)
- Percentage: 14px font-medium, --trust-blue
- Smooth transitions: 300ms ease-out

### 3. Vault File Selection

#### 3.1 File Input Area

```
┌─────────────────────────────────────────────────────────────┐
│  Select your encrypted vault file                            │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│                                                              │
│  │         🔐 Drop your encrypted vault here              │  │
│                                                              │
│  │                    - or -                              │  │
│                                                              │
│  │              [ Select Vault File ]                     │  │
│                                                              │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│  Looking for .age encrypted files                            │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Drop zone: 140px height
- Border: 2px dashed --gray-300 (default), --trust-blue (active)
- Background: --gray-50 (default), --info-blue-bg (active)
- Icon: 40px, --gray-400 (default), --trust-blue (active)
- Main text: 16px, --gray-700
- Button: 140px × 40px, white background, --trust-blue text, 1px border
- Helper text: 12px, --gray-500
- Hover state: Background transitions to --info-blue-bg
- Active drop: Solid border, pulse animation

#### 3.2 Selected File Display

```
┌─────────────────────────────────────────────────────────────┐
│  ✓ Vault file selected                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 family-bitcoin-backup-2024-01-15.age              │   │
│  │    Size: 2.4 MB · Created: January 15, 2024    [×]   │   │
│  │    ✓ Valid Age encryption format                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Container: --success-green-bg background, 1px --success-green border
- File icon: 20px
- Filename: 14px font-medium, --gray-900, monospace
- Metadata: 12px, --gray-500
- Validation: 12px, --success-green with 12px check icon
- Remove button: 16px × 16px, --gray-400, hover --error-red
- Border-radius: 6px
- Padding: 12px

### 4. Passphrase Entry Section

```
┌─────────────────────────────────────────────────────────────┐
│  Enter your vault passphrase                                 │
│  The passphrase you used when creating this vault            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ••••••••••••••••••••••••••••             [👁️ Show]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  💡 Memory hints:                                           │
│  • Vault created on January 15, 2024                        │
│  • You used the key: "My Bitcoin Vault"                     │
│  • Check your password manager or backup notes              │
│                                                              │
│  [ Need help recovering your passphrase? ]                  │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Label: 16px font-medium, --gray-900
- Helper text: 14px, --gray-600
- Input field: 48px height, 16px font, 1px --gray-300 border
- Show/hide toggle: 32px × 32px, --gray-500 icon
- Focus state: 2px --trust-blue ring
- Memory hints box: --info-blue-bg background, 12px text
- Hint icon: 14px, --info-blue
- Help link: 14px, --trust-blue, underline on hover
- Error state: --error-red border, --error-red-bg background

### 5. Destination Selection

```
┌─────────────────────────────────────────────────────────────┐
│  Choose where to save recovered files                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ~/Desktop/Barqly-Recovery-2025-01-15/         [📁]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ☑ Create new folder for recovered files                    │
│  ☐ Replace existing files if found                          │
│                                                              │
│  📊 Space required: ~1.8 MB · Available: 45.2 GB ✓          │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Path input: 48px height, 14px monospace font
- Browse button: 40px × 40px, integrated appearance
- Checkboxes: 16px × 16px, --trust-blue when checked
- Checkbox labels: 14px, --gray-700
- Space indicator: 12px, --gray-500 (normal), --success-green (sufficient)
- Warning if insufficient: --warning-amber with icon

### 6. Action Area

```
┌─────────────────────────────────────────────────────────────┐
│  Ready to decrypt your vault:                                │
│  ✓ Valid vault file selected (2.4 MB)                       │
│  ✓ Passphrase entered                                       │
│  ✓ Destination folder selected                              │
│                                                              │
│  [ Clear Form ]            [ 🔓 Begin Decryption → ]        │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Checklist: 14px with 14px --success-green checks
- Clear button: Secondary style, 120px × 44px
- Decrypt button: Primary style, 200px × 44px
- Primary button: --trust-blue background, white text, font-semibold
- Secondary button: White background, --gray-700 text, 1px border
- Hover animations: translateY(-1px) with shadow
- Disabled state: 50% opacity, cursor not-allowed

### 7. Decryption Progress

```
┌─────────────────────────────────────────────────────────────┐
│  Decrypting your vault...                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████░░░░░░░░░  75%          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  🔍 Verifying vault integrity...                            │
│  🔓 Decrypting files...                                     │
│  📂 Extracting to destination...                            │
│  ✓ Preserving folder structure...                           │
│                                                              │
│  Time remaining: ~15 seconds                                │
│  [ Cancel ]                                                  │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Progress bar: 12px height, rounded, --progress-gradient fill
- Percentage: 18px font-bold, --trust-blue
- Status messages: 14px, --gray-700
- Active step: Bold with spinning icon
- Completed steps: --success-green with check
- Time estimate: 12px, --gray-500
- Cancel button: Text style, --gray-600, available until 90%

### 8. Success State

```
┌─────────────────────────────────────────────────────────────┐
│       ✅  Vault Successfully Decrypted!                      │
│                                                              │
│  Your files have been recovered and are ready to use.       │
│                                                              │
│  📍 Files saved to:                                         │
│  ~/Desktop/Barqly-Recovery-2025-01-15/                      │
│  [ Open Folder ]  [ Copy Path ]                             │
│                                                              │
│  📊 Recovery Summary:                                       │
│  • 3 files recovered successfully                           │
│  • Total size: 1.8 MB                                      │
│  • Folder structure preserved                               │
│  • Decryption time: 12 seconds                             │
│                                                              │
│  Recovered files:                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 wallet-descriptor.json                           │   │
│  │ 📄 seed-phrase.txt                                  │   │
│  │ 📄 xpub-keys.txt                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [ Decrypt Another Vault ]  [ Close ]                       │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Success icon: 48px animated check, --success-green
- Title: 24px font-bold, --gray-900
- Success message: 16px, --gray-700
- Path display: 14px monospace, --gray-700
- Action buttons: 100px × 36px, secondary style
- Summary stats: 14px, --gray-600
- File list: Scrollable if >5 files, 13px, --gray-600
- Container: --success-green-bg with 1px border
- Subtle confetti animation: 2 seconds, professional

## Interaction States

### Input Field States

1. **Default**
   - Border: 1px solid --gray-300
   - Background: White
   
2. **Hover**
   - Border: 1px solid --gray-400
   - Cursor: pointer/text as appropriate
   
3. **Focus**
   - Border: 2px solid --trust-blue
   - Ring: 3px --trust-blue at 20% opacity
   
4. **Valid**
   - Border: 1px solid --success-green
   - Background: White
   - Icon: Green check
   
5. **Error**
   - Border: 1px solid --error-red
   - Background: --error-red-bg
   - Helper text: --error-red

### Button States

1. **Default**
   - As specified above
   
2. **Hover**
   - Transform: translateY(-1px)
   - Shadow: 0 4px 6px rgba(0,0,0,0.1)
   
3. **Active**
   - Transform: translateY(0)
   - Shadow: inset 0 1px 2px rgba(0,0,0,0.1)
   
4. **Disabled**
   - Opacity: 0.5
   - Cursor: not-allowed
   
5. **Loading**
   - Show spinner
   - Text: "Decrypting..."

## Animation Specifications

### Transitions

- All interactive elements: 200ms ease-out
- Progress bars: 300ms ease-in-out
- Success animations: 400ms spring
- Error shakes: 200ms × 3
- Page transitions: 300ms ease-out

### Micro-interactions

1. **File Drop**: Gentle bounce on drop (400ms)
2. **Progress Fill**: Smooth gradient animation
3. **Success Check**: Scale and rotate animation
4. **Error Shake**: Horizontal shake for attention
5. **Button Press**: Subtle depth effect

## Error Handling

### Wrong Passphrase

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Unable to decrypt - incorrect passphrase                │
│                                                              │
│  The passphrase doesn't match this vault.                   │
│  Passphrases are case-sensitive.                           │
│                                                              │
│  Attempts: 2 of unlimited                                   │
│                                                              │
│  [ Try Again ]  [ View Passphrase Tips ]  [ Get Help ]     │
└─────────────────────────────────────────────────────────────┘
```

### Corrupted File

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Vault file appears damaged                              │
│                                                              │
│  The file may have been corrupted during storage.           │
│  Try using a backup copy if available.                      │
│                                                              │
│  [ Select Different File ]  [ Attempt Partial Recovery ]    │
└─────────────────────────────────────────────────────────────┘
```

## Accessibility Requirements

### WCAG 2.2 AA Compliance

1. **Color Contrast**
   - Normal text: 4.5:1 minimum (verified)
   - Large text: 3:1 minimum (verified)
   - Interactive elements: 3:1 minimum (verified)
   
2. **Focus Management**
   - Visible focus indicators on all interactive elements
   - Logical tab order through form
   - Focus trapped in modals
   - Focus restoration after operations
   
3. **Screen Reader Support**
   - Semantic HTML structure
   - ARIA labels for all icons and controls
   - Live regions for progress updates
   - Error announcements
   - Success confirmations
   
4. **Keyboard Navigation**
   - Tab: Navigate forward
   - Shift+Tab: Navigate backward
   - Enter: Activate buttons/submit
   - Escape: Cancel operations
   - Space: Toggle checkboxes

## Mobile Optimization

### Touch Targets
- Minimum 44×44px for all interactive elements
- Adequate spacing between targets (8px minimum)
- Larger buttons on mobile (48px height)

### Responsive Layout
- Single column below 768px
- Full-width form elements
- Stacked buttons
- Collapsible help sections
- Simplified progress indicators

## Performance Targets

- **Page Load**: <150ms
- **File Validation**: <500ms
- **Passphrase Validation**: <1s
- **Progress Updates**: Every 100ms
- **Small Files (<10MB)**: <5s total
- **Medium Files (10-100MB)**: <30s total
- **Large Files (>100MB)**: Accurate time estimates

## Design Rationale

### Why This Design Works

1. **Reduces Anxiety**: Calming colors, clear progress, and reassuring language minimize stress during potentially emotional recovery scenarios

2. **Universal Usability**: Works for both technical users and family members with no cryptocurrency experience

3. **Error Prevention**: Multiple validation steps and clear feedback prevent mistakes before they happen

4. **Recovery Focused**: Every element guides toward successful file recovery rather than dwelling on problems

5. **Trust Through Transparency**: Users can see exactly what's happening at each step, building confidence in the process

### Key Design Decisions

1. **Three Clear Steps**: Unlike complex wizards, the three-step process is always visible, providing context and allowing easy correction

2. **Memory Aids**: Contextual hints help users remember passphrases without compromising security

3. **Professional Success**: The success state provides both emotional satisfaction and practical information needed for next steps

4. **Graceful Error Handling**: Errors are presented as solvable problems with clear next steps, not dead ends

---

*This specification provides complete design direction for implementing the Decrypt screen, optimized for high-stakes Bitcoin custody recovery scenarios while maintaining consistency with the Barqly Vault design system.*