# Encrypt Screen Design Specification

> **Version**: 1.0  
> **Status**: Implementation Ready  
> **Designer**: UX Designer, ZenAI Team  
> **Last Updated**: January 2025  
> **Related**: Task 4.2.4.2 - Encrypt Page Implementation

## Executive Summary

The Encrypt screen transforms the complex process of file encryption into a confidence-inspiring journey that takes less than 90 seconds. Building on the trust established in the Setup screen, this interface delivers the core value proposition of Barqly Vault: transforming vulnerable Bitcoin custody documents into military-grade encrypted vaults. Every design decision prioritizes clarity, security visibility, and user confidence while maintaining the established Bitcoin-themed visual identity.

## Design Philosophy

### Core Principles

1. **Progressive Confidence Building**
   - Each step visually confirms progress toward secure encryption
   - Clear visual feedback eliminates uncertainty at every interaction
   - Success feels both professional and personally rewarding

2. **Visible Security Theater**
   - Security features are prominently displayed without being overwhelming
   - Trust indicators reinforce the military-grade protection being applied
   - Process transparency builds confidence in the encryption outcome

3. **Bitcoin-Optimized Experience**
   - Interface acknowledges the high-value nature of Bitcoin custody files
   - Visual language connects to the broader Bitcoin ecosystem
   - Design respects both technical users and family members

4. **Error Prevention Over Recovery**
   - Interface actively prevents mistakes through smart validation
   - Visual cues guide users toward successful completion
   - Clear warnings before any potentially confusing actions

## Visual Design System

### Color Palette (Consistent with Setup Page)

```css
/* Primary Colors - Bitcoin Trust Theme */
--bitcoin-orange: #F7931A;     /* Bitcoin brand accent */
--bitcoin-orange-hover: #E67E00;
--trust-blue: #2563EB;         /* Primary actions, security */
--trust-blue-hover: #1D4ED8;
--success-green: #059669;      /* Completion, validation */
--success-green-light: #10B981;

/* Semantic Colors */
--error-red: #EF4444;
--warning-amber: #F59E0B;
--info-blue: #3B82F6;
--shield-blue: #2563EB;        /* Security indicators */

/* Neutral Palette */
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

/* Special Purpose */
--drop-zone-blue: #EFF6FF;     /* Drag-drop areas */
--progress-gradient: linear-gradient(90deg, #2563EB 0%, #059669 100%);
```

### Typography System

```css
/* Font Stack */
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
               'Helvetica Neue', 'Arial', sans-serif;
--font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;

/* Scale */
--heading-xxl: 2rem;      /* 32px - Page title */
--heading-xl: 1.875rem;   /* 30px - Major sections */
--heading-lg: 1.5rem;     /* 24px - Step titles */
--heading-md: 1.25rem;    /* 20px - Card headers */
--heading-sm: 1.125rem;   /* 18px - Subsections */
--text-base: 1rem;        /* 16px - Body text */
--text-sm: 0.875rem;      /* 14px - Secondary text */
--text-xs: 0.75rem;       /* 12px - Captions, badges */

/* Weights */
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Spacing & Layout Grid

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
--content-max: 896px;
--form-max: 640px;
```

## Layout Architecture

### Viewport Distribution (1280x800 baseline)

```
┌────────────────────────────────────────────────────────┐
│ Header & Trust Bar                             10% (80px)│
├────────────────────────────────────────────────────────┤
│ File Selection Area                           30% (240px)│
├────────────────────────────────────────────────────────┤
│ Key Selection Area                            20% (160px)│
├────────────────────────────────────────────────────────┤
│ Output Configuration                          20% (160px)│
├────────────────────────────────────────────────────────┤
│ Action Area & Progress                        20% (160px)│
└────────────────────────────────────────────────────────┘
```

### Responsive Grid

- **Desktop (≥1280px)**: 12-column grid, 24px gutters
- **Tablet (768-1279px)**: 8-column grid, 16px gutters  
- **Mobile (<768px)**: Single column, 16px padding

## Component Specifications

### 1. Page Header with Trust Indicators

```
┌─────────────────────────────────────────────────────────────┐
│  🔐  Encrypt Your Bitcoin Vault                              │
│      Transform sensitive files into military-grade encrypted │
│      archives · 90 seconds to complete                       │
│  ─────────────────────────────────────────────────────────  │
│  🛡️ Military-grade  |  🔒 Local-only  |  ⚡ Zero network    │
│     Age encryption      processing        access             │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Container height: 80px total (48px header + 32px trust bar)
- Background: White with subtle bottom shadow (0 1px 3px rgba(0,0,0,0.1))
- Title: 24px, font-bold, --gray-900
- Subtitle: 14px, font-regular, --gray-600
- Trust badges: 12px text with 16px icons, --gray-500
- Separator lines: 1px, --gray-200
- Time indicator: --bitcoin-orange accent

### 2. Progressive Step Indicator

```
┌─────────────────────────────────────────────────────────────┐
│  [1] Select Files  →  [2] Choose Key  →  [3] Set Destination │
│   ● Active            ○ Ready            ○ Disabled          │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Height: 48px
- Background: --gray-50
- Active step: --trust-blue background, white text, 14px font-medium
- Ready step: White background, --gray-700 text
- Disabled: --gray-100 background, --gray-400 text
- Arrow indicators: 20px, --gray-400
- Border-radius: 6px per step
- Transition: 300ms ease-out on step change

### 3. File Selection Interface

#### 3.1 Mode Toggle

```
┌─────────────────────────────────────────────────────────────┐
│  Select what to encrypt:                                     │
│  ┌─────────────┐  ┌─────────────┐                          │
│  │ 📄 Files    │  │ 📁 Folder   │                          │
│  └─────────────┘  └─────────────┘                          │
│  Select specific     Encrypt entire                          │
│  documents          folder structure                         │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Toggle buttons: 120px × 48px each
- Active: --trust-blue background, white text
- Inactive: White background, --gray-700 text, 1px --gray-300 border
- Icons: 20px, matching text color
- Description text: 12px, --gray-500
- Spacing between buttons: 16px
- Hover: Transform translateY(-2px), shadow increase

#### 3.2 Drag & Drop Zone

```
┌─────────────────────────────────────────────────────────────┐
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│                                                              │
│  │            🔐 Drop files here to encrypt              │  │
│                                                              │
│  │                      - or -                           │  │
│                                                              │
│  │         [ Browse Files ]    [ Browse Folder ]         │  │
│                                                              │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Drop zone: Min height 160px
- Border: 2px dashed --gray-300 (default), --trust-blue (active)
- Background: --drop-zone-blue (on hover/active)
- Icon: 48px, --gray-400 (default), --trust-blue (active)
- Text: 16px, --gray-600
- Browse buttons: 140px × 40px, white background, --trust-blue text
- Active drop state: Subtle pulse animation, border solid

#### 3.3 Selected Files Display

```
┌─────────────────────────────────────────────────────────────┐
│  Selected: 3 files, 2.4 MB                          [Clear] │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 wallet-descriptor.json                  1.2 MB ✕ │   │
│  │ 📄 seed-phrase.txt                         0.8 MB ✕ │   │
│  │ 📄 xpub-keys.txt                          0.4 MB ✕ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Container: --gray-50 background, 1px --gray-200 border
- Summary bar: 14px font-medium, --gray-700
- File list: Max height 120px with scroll
- File items: 14px, --gray-600, with 16px file icons
- Size display: 12px, --gray-500
- Remove buttons: 16px × 16px, hover shows --error-red
- Clear all: Text button, --gray-600

### 4. Key Selection Interface

```
┌─────────────────────────────────────────────────────────────┐
│  Choose encryption key:                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔑 My Bitcoin Vault Key              ▼              │   │
│  └─────────────────────────────────────────────────────┘   │
│  Created: Jan 15, 2025 · Last used: 2 days ago              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Public Key: age1qyq...7x8m                          │   │
│  │ Files encrypted with this key can only be decrypted │   │
│  │ by the matching private key.                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Dropdown: Full width, 48px height
- Background: White with 1px --gray-300 border
- Selected key: 16px font-medium, --gray-900
- Metadata: 12px, --gray-500
- Key preview box: --gray-50 background, monospace font
- Info text: 13px, --gray-600
- Focus ring: 2px --trust-blue

### 5. Output Configuration

```
┌─────────────────────────────────────────────────────────────┐
│  Save encrypted vault to:                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ /Users/bitcoin/Documents/Barqly-Vaults/      [📁]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Archive name (optional):                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ family-bitcoin-backup                               │   │
│  └─────────────────────────────────────────────────────┘   │
│  Will be saved as: family-bitcoin-backup-2025-01-15.age     │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Path input: 48px height, 16px font
- Browse button: 40px × 40px, integrated appearance
- Archive name: Optional field with lighter border (--gray-200)
- Preview text: 12px, --gray-500, italic
- Auto-complete suggestions when typing paths

### 6. Action Area

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ 3 files selected (2.4 MB)                         │   │
│  │ ✓ Encryption key chosen                             │   │
│  │ ✓ Output location set                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [ Reset ]              [ 🔐 Create Encrypted Vault →]      │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Validation checklist: --success-green checks, 14px text
- Reset button: Secondary style, 120px × 48px
- Encrypt button: Primary style, 240px × 48px
- Primary button: --trust-blue background, white text, font-semibold
- Icon animation: Subtle lock rotation on hover
- Disabled state: 50% opacity, cursor not-allowed

### 7. Progress Indicator

```
┌─────────────────────────────────────────────────────────────┐
│  Creating your encrypted vault...                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ████████████████████░░░░░░░░░  65%                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  Applying military-grade encryption...                       │
│  Time remaining: ~15 seconds                                 │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Progress bar: 8px height, rounded ends
- Fill: --progress-gradient with subtle animation
- Status text: 14px, --gray-700
- Time estimate: 12px, --gray-500
- Cancel button appears until 90% complete

### 8. Success State

```
┌─────────────────────────────────────────────────────────────┐
│        ✅ Vault Successfully Created!                        │
│                                                              │
│  Your files are now protected with military-grade           │
│  encryption and ready for long-term storage.                │
│                                                              │
│  📍 Saved to:                                               │
│  /Users/bitcoin/Documents/Barqly-Vaults/                    │
│  family-bitcoin-backup-2025-01-15.age                       │
│  [Copy Path] [Open Folder]                                  │
│                                                              │
│  📊 Encryption Summary:                                     │
│  • 3 files encrypted (2.4 MB → 1.8 MB)                     │
│  • Encryption time: 12 seconds                              │
│  • Using: age1qyq...7x8m                                   │
│                                                              │
│  [ Encrypt More Files ]  [ View Decryption Guide ]          │
└─────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Success icon: 48px, animated check with --success-green
- Title: 24px, font-bold, --gray-900
- Path display: Monospace, --gray-700, with copy button
- Summary stats: 14px, --gray-600
- Action buttons: Equal width, secondary styling
- Confetti animation: Subtle, 2-second duration

## Interaction Design

### Micro-interactions

1. **File Drop Animation**
   - Files "fall" into place with subtle bounce
   - 400ms duration, ease-out-back easing

2. **Step Transitions**
   - Completed steps show check mark with scale animation
   - Next step highlights with glow effect
   - 300ms transitions between states

3. **Button Interactions**
   - Hover: translateY(-2px) with shadow increase
   - Active: translateY(0) with shadow decrease
   - Loading: Spinning lock icon for encrypt button

4. **Progress Animation**
   - Smooth fill with subtle gradient shift
   - Percentage counter with number animation
   - Stage messages fade in/out

### Keyboard Navigation

- **Tab Order**: Logical top-to-bottom, left-to-right flow
- **Enter Key**: Activates focused button, submits when ready
- **Escape Key**: Closes dropdowns, cancels operations
- **Arrow Keys**: Navigate dropdown options
- **Cmd/Ctrl+O**: Quick file selection
- **Cmd/Ctrl+E**: Quick encrypt when ready

### Touch Interactions

- **Touch Targets**: Minimum 44×44px for all interactive elements
- **Swipe**: Dismiss success messages
- **Long Press**: Show tooltips on mobile
- **Pinch**: Zoom file list if needed

## State Management

### Component States

1. **Initial State**
   - Empty file selection area prominent
   - Other sections visually de-emphasized
   - Clear call-to-action on file selection

2. **Files Selected**
   - File area shows selected items
   - Key selection becomes active
   - Output section remains disabled

3. **Key Selected**
   - Output configuration activates
   - Validation checklist updates
   - Encrypt button begins pulse animation

4. **Ready to Encrypt**
   - All sections show completion state
   - Encrypt button fully active
   - Validation shows all green checks

5. **Encrypting**
   - Progress overlay appears
   - Other controls disabled
   - Cancel option available

6. **Success**
   - Success message with details
   - Options for next actions
   - Original form hidden

### Error States

1. **File Access Error**
   ```
   ⚠️ Cannot read file: document.pdf
   The file may be open in another program.
   [Try Again] [Remove File]
   ```

2. **Insufficient Space**
   ```
   ⚠️ Not enough disk space
   Need 45 MB, only 12 MB available.
   [Choose Different Location]
   ```

3. **Permission Denied**
   ```
   ⚠️ Cannot write to this location
   Choose a folder where you have write permission.
   [Select Different Folder]
   ```

## Accessibility Specifications

### WCAG 2.2 AA Compliance

1. **Color Contrast**
   - Normal text: 4.5:1 minimum (verified)
   - Large text: 3:1 minimum (verified)
   - Interactive elements: 3:1 minimum (verified)
   - Focus indicators: 3:1 minimum (verified)

2. **Focus Management**
   - Visible focus rings (2px, --trust-blue)
   - Logical tab order maintained
   - Focus trapped in modals
   - Focus returned after operations

3. **Screen Reader Support**
   - Semantic HTML structure
   - ARIA labels for all icons
   - Live regions for progress updates
   - Status announcements for operations

4. **Reduced Motion**
   - Respect prefers-reduced-motion
   - Provide instant transitions option
   - Essential animations only

## Performance Specifications

### Target Metrics

- **Initial Load**: <200ms
- **File Dialog**: <500ms to open
- **Validation**: <100ms feedback
- **Encryption Start**: <1s after click
- **Progress Updates**: Every 100ms
- **Success Display**: <500ms

### Optimization Strategies

1. **Lazy Loading**
   - Help content loaded on demand
   - Large file lists virtualized
   - Success animations loaded after encryption

2. **Debouncing**
   - Path validation: 300ms debounce
   - Archive name validation: 200ms debounce

3. **Memory Management**
   - Clear file references after encryption
   - Limit file preview to first 100 items
   - Release drag-drop listeners when not needed

## Implementation Notes

### Required Assets

1. **Icons (24px SVG)**
   - Lock (filled and outline)
   - Shield with checkmark
   - File and folder icons
   - Bitcoin logo (optional accent)
   - Success checkmark
   - Warning triangle
   - Info circle

2. **Animations**
   - Lock rotation (CSS)
   - Progress gradient shift (CSS)
   - Success confetti (Lottie or CSS)
   - File drop bounce (CSS)

3. **Fonts**
   - System font stack (no custom fonts)
   - Monospace for keys and paths

### CSS Architecture

```css
/* Component Structure */
.encrypt-page {}
.encrypt-page__header {}
.encrypt-page__trust-bar {}
.encrypt-page__steps {}
.encrypt-page__content {}
.encrypt-page__file-selection {}
.encrypt-page__key-selection {}
.encrypt-page__output-config {}
.encrypt-page__actions {}
.encrypt-page__progress {}
.encrypt-page__success {}

/* State Modifiers */
.encrypt-page--loading {}
.encrypt-page--success {}
.encrypt-page--error {}
.encrypt-page__step--active {}
.encrypt-page__step--complete {}
.encrypt-page__step--disabled {}
```

### Component Dependencies

- FileSelectionButton (existing)
- KeySelectionDropdown (existing)
- ProgressBar (existing)
- ErrorMessage (existing)
- SuccessMessage (existing)
- LoadingSpinner (existing)

## Testing Checklist

### Visual Testing
- [ ] All states render correctly
- [ ] Animations perform smoothly
- [ ] Colors match specification
- [ ] Typography hierarchy clear
- [ ] Icons display properly

### Interaction Testing
- [ ] File selection works (files and folders)
- [ ] Drag and drop functions
- [ ] Key selection updates properly
- [ ] Path validation provides feedback
- [ ] Progress updates smoothly

### Accessibility Testing
- [ ] Keyboard navigation complete
- [ ] Screen reader announces all states
- [ ] Focus indicators visible
- [ ] Color contrast passes
- [ ] Touch targets adequate size

### Performance Testing
- [ ] Page loads under 200ms
- [ ] No janky animations
- [ ] Memory usage stable
- [ ] Large file lists handled
- [ ] Progress updates don't block UI

## Design Rationale

### Why This Design Works

1. **Builds on Setup Success**: Maintains visual consistency with the Setup page while evolving the experience for the encryption task

2. **Progressive Disclosure**: Shows only what's needed at each step, reducing cognitive load while maintaining visibility of the full process

3. **Trust Through Transparency**: Every security feature is visible but not overwhelming, building confidence without creating anxiety

4. **Bitcoin-Optimized**: Acknowledges the high-stakes nature of Bitcoin custody while remaining approachable for family members

5. **Error Prevention**: The design actively guides users toward success rather than relying on error recovery

### Design Decisions

1. **All Controls Visible**: Unlike many wizards, all three steps remain visible to provide context and allow easy correction

2. **Drag-and-Drop Primary**: While buttons are available, drag-and-drop is promoted as the primary interaction for its intuitiveness

3. **Real-time Validation**: Immediate feedback on all inputs prevents users from proceeding with invalid configurations

4. **Success Celebration**: The completion state provides both functional information and emotional satisfaction

---

*This specification provides complete design direction for implementing the Encrypt screen. It maintains consistency with the Setup page while delivering an optimized experience for the core encryption workflow.*