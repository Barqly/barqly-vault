# YubiKey Integration UX Design Specifications

_Comprehensive interface design and user experience flows for YubiKey hardware authentication integration_

**Created**: January 2025  
**Version**: 1.0  
**Status**: Design Specification  
**Author**: UX Designer

## Executive Summary

This document translates the Product Owner's user journey requirements into concrete, implementable interface designs that maintain Barqly Vault's signature simplicity while adding powerful YubiKey security capabilities. The design preserves the existing 90-second setup goal through progressive disclosure and smart defaults while ensuring WCAG 2.2 AA accessibility compliance.

**Key Design Principles**:
- **Security First**: Secure choices are default and visually prominent
- **Progressive Disclosure**: Simple by default, powerful when needed  
- **Stress Optimization**: Clear, unambiguous flows for high-pressure scenarios
- **Accessibility Excellence**: Full WCAG 2.2 AA compliance across all interfaces
- **Platform Consistency**: Maintain existing design system patterns

## Current Design System Analysis

### Existing UI Patterns Identified

**Page Structure Pattern**:
```
- UniversalHeader (title + icon + skip nav)
- ProgressBar (step indicator, compact variant)
- AppPrimaryContainer (main content wrapper)
  - Error display (conditional)
  - Main content cards (rounded-2xl, white bg)
  - CollapsibleHelp (expandable guidance)
```

**Design Token Analysis**:
- **Colors**: Primary/secondary with accessible contrast ratios
- **Typography**: Clear hierarchy with text-sm base, font-medium for emphasis
- **Spacing**: Consistent --space-* CSS custom properties (4px to 24px scale)
- **Components**: Shadcn/ui library with custom button variants
- **Layout**: Responsive grid with mobile-first approach

**Interaction Patterns**:
- **Progressive Cards**: Multi-step workflows with visual state progression
- **Animated Transitions**: Smooth state changes with AnimatedTransition component
- **Form Validation**: Real-time feedback with clear error/success states
- **Loading States**: Progress indicators with cancellation options

## 1. Protection Mode Selection Interface Design

### Core Decision Point Interface

The protection mode selection becomes the first decision point in the setup flow, positioned after the header but before key generation form.

```
┌─────────────────────────────────────────────────────────┐
│ [Shield] Create Your Vault Key                          │
├─────────────────────────────────────────────────────────┤
│ Progress: ●─○─○ Create Key                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ Choose Your Protection Method ───────────────────────┐ │
│ │                                                       │ │
│ │ ┌─ Passphrase Only ─────┐  ┌─ YubiKey + Passphrase ─┐│ │
│ │ │                       │  │        RECOMMENDED     ││ │
│ │ │ [Key Icon]            │  │ [Shield+Key Icon]      ││ │
│ │ │ Quick & Simple        │  │ Best of Both Worlds    ││ │
│ │ │                       │  │                        ││ │
│ │ │ ○ Select              │  │ ●️ Selected              ││ │
│ │ └───────────────────────┘  └────────────────────────┘│ │
│ │                                                       │ │
│ │ ┌─ YubiKey Only ──────────────────────────────────────┐│ │
│ │ │ [Hardware Icon]    Maximum Security                 ││ │
│ │ │ Hardware-only protection for institutional use     ││ │
│ │ │ ○ Select                                            ││ │
│ │ └─────────────────────────────────────────────────────┘│ │
│ │                                                       │ │
│ │ [i] Learn about protection methods                    │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                         │
│ [Continue] button enabled when selection made          │
└─────────────────────────────────────────────────────────┘
```

### Visual Design Specifications

**Protection Mode Cards**:
```tsx
// Component: ProtectionModeSelector
interface ProtectionModeOption {
  id: 'passphrase-only' | 'hybrid' | 'yubikey-only'
  title: string
  subtitle: string
  description: string
  icon: LucideIcon
  recommended?: boolean
  requiresYubiKey: boolean
}

const protectionModes: ProtectionModeOption[] = [
  {
    id: 'passphrase-only',
    title: 'Passphrase Only',
    subtitle: 'Quick & Simple',
    description: 'Traditional password protection like v0.1.0',
    icon: Key,
    requiresYubiKey: false
  },
  {
    id: 'hybrid', 
    title: 'YubiKey + Passphrase',
    subtitle: 'Best of Both Worlds',
    description: 'Redundant protection - unlock with either method',
    icon: ShieldCheck,
    recommended: true,
    requiresYubiKey: true
  },
  {
    id: 'yubikey-only',
    title: 'YubiKey Only', 
    subtitle: 'Maximum Security',
    description: 'Hardware-only protection for institutional use',
    icon: HardwareKeyIcon,
    requiresYubiKey: true
  }
]
```

**Accessibility Implementation**:
- **Radio Group Pattern**: Uses proper ARIA radio group semantics
- **Keyboard Navigation**: Arrow keys move between options, Space/Enter selects
- **Screen Reader**: Full descriptions read including recommendation status
- **Focus Management**: Clear focus indicators with 3px ring outline
- **High Contrast**: Maintains 4.5:1 contrast ratio for all text elements

### Progressive Disclosure Details

**Recommended Badge Design**:
```css
.recommended-badge {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  position: absolute;
  top: -8px;
  right: 12px;
}
```

**Information Disclosure Pattern**:
- **Primary View**: Cards show icon, title, subtitle only
- **Hover/Focus State**: Expands to show full description
- **Learn More Link**: Expands CollapsibleHelp with detailed explanations
- **YubiKey Detection**: Real-time status indicator for hardware availability

## 2. YubiKey Management Screen Flows

### YubiKey Detection Interface

When user selects YubiKey-enabled protection mode, system immediately begins hardware detection.

```
┌─────────────────────────────────────────────────────────┐
│ ┌─ Setting Up YubiKey Protection ──────────────────────┐ │
│ │                                                       │ │
│ │ Step 1: Connect Your YubiKey                         │ │
│ │ ┌─────────────────────────────────────────────────────┐│ │
│ │ │                                                     ││ │
│ │ │     [🔍 Searching...]  Detecting YubiKey...         ││ │
│ │ │                                                     ││ │
│ │ │     Please insert your YubiKey and we'll find it   ││ │
│ │ │     automatically                                   ││ │
│ │ │                                                     ││ │
│ │ └─────────────────────────────────────────────────────┘│ │
│ │                                                       │ │
│ │ [Skip and use Passphrase Only] [Retry Detection]     │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Success State - YubiKey Detected**:
```
┌─────────────────────────────────────────────────────────┐
│ ┌─ Setting Up YubiKey Protection ──────────────────────┐ │
│ │                                                       │ │
│ │ Step 1: YubiKey Detected ✓                           │ │
│ │ ┌─────────────────────────────────────────────────────┐│ │
│ │ │                                                     ││ │
│ │ │     [✓] YubiKey 5 NFC detected and ready           ││ │
│ │ │                                                     ││ │
│ │ │     Model: YubiKey 5 NFC                            ││ │
│ │ │     Serial: 12345678                                ││ │
│ │ │     Status: Ready for setup                         ││ │
│ │ │                                                     ││ │
│ │ └─────────────────────────────────────────────────────┘│ │
│ │                                                       │ │
│ │ [Continue with this YubiKey]                         │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### YubiKey Initialization Flow

**PIV PIN Setup Interface**:
```
┌─────────────────────────────────────────────────────────┐
│ ┌─ Setting Up YubiKey Protection ──────────────────────┐ │
│ │                                                       │ │
│ │ Step 2: Set Your YubiKey PIN                         │ │
│ │ ┌─────────────────────────────────────────────────────┐│ │
│ │ │                                                     ││ │
│ │ │ Your YubiKey needs a 6-8 digit PIN for security:   ││ │
│ │ │                                                     ││ │
│ │ │ PIN: [●●●●●●] (6-8 digits)                         ││ │
│ │ │                                                     ││ │
│ │ │ Confirm PIN: [●●●●●●]                              ││ │
│ │ │                                                     ││ │
│ │ │ [i] Your PIN protects access to the YubiKey        ││ │
│ │ │     Choose something memorable but secure           ││ │
│ │ │                                                     ││ │
│ │ └─────────────────────────────────────────────────────┘│ │
│ │                                                       │ │
│ │ [Previous]  [Continue - Generate Key]                │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Key Generation Progress Interface**:
```
┌─────────────────────────────────────────────────────────┐
│ ┌─ Setting Up YubiKey Protection ──────────────────────┐ │
│ │                                                       │ │
│ │ Step 3: Generating Hardware Key                      │ │
│ │ ┌─────────────────────────────────────────────────────┐│ │
│ │ │                                                     ││ │
│ │ │ [████████████────] 65% Complete                     ││ │
│ │ │                                                     ││ │
│ │ │ Generating hardware-bound encryption key...         ││ │
│ │ │                                                     ││ │
│ │ │ 💡 Touch your YubiKey when it blinks               ││ │
│ │ │                                                     ││ │
│ │ │    [YubiKey Animation: Pulsing light indicator]    ││ │
│ │ │                                                     ││ │
│ │ └─────────────────────────────────────────────────────┘│ │
│ │                                                       │ │
│ │ This process takes 15-30 seconds...                  │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Multiple YubiKey Support Interface

**YubiKey Selection Interface**:
```
┌─────────────────────────────────────────────────────────┐
│ ┌─ Multiple YubiKeys Detected ─────────────────────────┐ │
│ │                                                       │ │
│ │ Choose which YubiKey to use for this vault:          │ │
│ │                                                       │ │
│ │ ○ YubiKey 5 NFC (Serial: 12345678)                   │ │
│ │   Status: Ready for setup                            │ │
│ │                                                       │ │
│ │ ● YubiKey 5C (Serial: 87654321)                      │ │
│ │   Status: Ready for setup                            │ │
│ │                                                       │ │
│ │ ○ YubiKey Bio (Serial: 11223344)                     │ │
│ │   Status: Already configured                         │ │
│ │                                                       │ │
│ │ [Continue with Selected YubiKey]                     │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 3. Smart Unlock Selection Interface (Decrypt Page)

### Enhanced Decrypt Page with Protection Mode Awareness

The existing DecryptPage gets enhanced to detect vault protection mode and offer intelligent unlock method selection.

```
┌─────────────────────────────────────────────────────────┐
│ [Unlock] Decrypt Your Vault                            │
├─────────────────────────────────────────────────────────┤
│ Progress: ●─●─○ Select Vault | Choose Key | Decrypt     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ Step 2: Choose Unlock Method ────────────────────────┐ │
│ │                                                       │ │
│ │ This vault supports: YubiKey + Passphrase            │ │
│ │                                                       │ │
│ │ ┌─ Smart Suggestion ───────────────────────────────────┐│ │
│ │ │                                                     ││ │
│ │ │ [✓ YubiKey] Detected - Use Hardware Key            ││ │
│ │ │                                                     ││ │
│ │ │ Your YubiKey is connected and ready                 ││ │
│ │ │                                                     ││ │
│ │ │ [Decrypt with YubiKey] ← Primary suggestion        ││ │
│ │ │                                                     ││ │
│ │ └─────────────────────────────────────────────────────┘│ │
│ │                                                       │ │
│ │ Alternative Method:                                   │ │
│ │ [Use Passphrase Instead]                             │ │
│ │                                                       │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### YubiKey Unlock Flow Interface

**PIN Entry Interface** (when required):
```
┌─────────────────────────────────────────────────────────┐
│ ┌─ YubiKey Authentication ─────────────────────────────┐ │
│ │                                                       │ │
│ │ Enter your YubiKey PIN:                              │ │
│ │                                                       │ │
│ │ PIN: [●●●●●●] (6-8 digits)                           │ │
│ │                                                       │ │
│ │ [i] This is the PIN you set when initializing        │ │
│ │     your YubiKey                                      │ │
│ │                                                       │ │
│ │ Attempts remaining: 3                                │ │
│ │                                                       │ │
│ │ [Cancel]  [Continue]                                 │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Touch Requirement Interface**:
```
┌─────────────────────────────────────────────────────────┐
│ ┌─ YubiKey Authentication ─────────────────────────────┐ │
│ │                                                       │ │
│ │ Touch Your YubiKey                                   │ │
│ │                                                       │ │
│ │    [YubiKey Pulsing Animation]                       │ │
│ │                                                       │ │
│ │ 👆 Touch the gold contact on your YubiKey           │ │
│ │                                                       │ │
│ │ Waiting for touch... (30 seconds remaining)         │ │
│ │                                                       │ │
│ │ [Cancel Authentication]                              │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Method Fallback Interface

**YubiKey Not Available Scenario**:
```
┌─────────────────────────────────────────────────────────┐
│ ┌─ YubiKey Not Available ──────────────────────────────┐ │
│ │                                                       │ │
│ │ [⚠️] YubiKey not detected                             │ │
│ │                                                       │ │
│ │ This vault was protected with YubiKey + Passphrase   │ │
│ │                                                       │ │
│ │ You can still decrypt using your passphrase:        │ │
│ │                                                       │ │
│ │ [Decrypt with Passphrase]                           │ │
│ │                                                       │ │
│ │ Or connect your YubiKey and try again:              │ │
│ │ [Retry YubiKey Detection]                           │ │
│ │                                                       │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 4. Error Handling & Recovery UX Patterns

### YubiKey Hardware Error States

**Device Detection Errors**:
```
┌─────────────────────────────────────────────────────────┐
│ ┌─ YubiKey Issues ─────────────────────────────────────┐ │
│ │                                                       │ │
│ │ [❌] Issue Type: No YubiKey Found                     │ │
│ │                                                       │ │
│ │ We couldn't detect a YubiKey device.                 │ │
│ │                                                       │ │
│ │ Try these steps:                                      │ │
│ │ • Ensure YubiKey is properly inserted                │ │
│ │ • Try a different USB port                           │ │
│ │ • Disconnect and reconnect the device                │ │
│ │                                                       │ │
│ │ [Retry Detection] [Continue without YubiKey]        │ │
│ │                                                       │ │
│ │ [📚 Troubleshooting Guide] [💬 Contact Support]      │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**PIN Lockout Recovery Interface**:
```
┌─────────────────────────────────────────────────────────┐
│ ┌─ YubiKey PIN Locked ─────────────────────────────────┐ │
│ │                                                       │ │
│ │ [🔒] Your YubiKey PIN is temporarily locked          │ │
│ │                                                       │ │
│ │ After 3 incorrect attempts, the PIN is blocked       │ │
│ │ for security.                                         │ │
│ │                                                       │ │
│ │ Recovery Options:                                     │ │
│ │                                                       │ │
│ │ 1️⃣ Use PUK Code to Reset PIN                         │ │
│ │    [Guide: How to use PUK code]                      │ │
│ │                                                       │ │
│ │ 2️⃣ Use Passphrase Method (Hybrid vaults only)       │ │
│ │    [Decrypt with Passphrase]                         │ │
│ │                                                       │ │
│ │ 3️⃣ Reset YubiKey (DESTRUCTIVE - last resort)        │ │
│ │    [YubiKey Reset Guide]                             │ │
│ │                                                       │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Wrong YubiKey Error**:
```
┌─────────────────────────────────────────────────────────┐
│ ┌─ Wrong YubiKey ──────────────────────────────────────┐ │
│ │                                                       │ │
│ │ [⚠️] YubiKey Mismatch                                 │ │
│ │                                                       │ │
│ │ This YubiKey (Serial: 87654321) doesn't match        │ │
│ │ the one used to protect this vault.                  │ │
│ │                                                       │ │
│ │ Expected: YubiKey with serial 12345678               │ │
│ │ Connected: YubiKey with serial 87654321              │ │
│ │                                                       │ │
│ │ Please connect the correct YubiKey or use an         │ │
│ │ alternative unlock method.                           │ │
│ │                                                       │ │
│ │ [Try Different YubiKey] [Use Passphrase]            │ │
│ │                                                       │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Progressive Error Guidance System

**Error Escalation Pattern**:
1. **Inline Hints**: Brief contextual guidance within the interface
2. **Error Dialogs**: Detailed troubleshooting with specific steps
3. **Help Documentation**: Comprehensive guides and tutorials
4. **Support Escalation**: Direct contact options for complex issues

## 5. Accessibility & Inclusivity Design

### WCAG 2.2 AA Compliance Implementation

**Focus Management**:
- **Visible Focus**: 3px solid ring with sufficient contrast (4.5:1 minimum)
- **Logical Tab Order**: Sequential navigation through all interactive elements
- **Focus Trapping**: Modal dialogs trap focus within their boundaries
- **Skip Navigation**: Direct access to main content areas

**Screen Reader Support**:
```tsx
// Example: Protection Mode Selection Accessibility
<fieldset role="radiogroup" aria-labelledby="protection-mode-heading">
  <legend id="protection-mode-heading">Choose Your Protection Method</legend>
  
  {protectionModes.map((mode) => (
    <div key={mode.id} role="radio" 
         aria-checked={selectedMode === mode.id}
         aria-describedby={`${mode.id}-description`}
         tabIndex={selectedMode === mode.id ? 0 : -1}>
      
      <div className="sr-only" id={`${mode.id}-description`}>
        {mode.description}
        {mode.recommended && " Recommended for most users"}
        {mode.requiresYubiKey && " Requires YubiKey hardware"}
      </div>
    </div>
  ))}
</fieldset>
```

**Keyboard Navigation Patterns**:
- **Arrow Keys**: Navigate between radio button options
- **Space/Enter**: Activate selected options
- **Escape**: Cancel modal dialogs and return focus
- **Tab/Shift+Tab**: Standard focus navigation

**Visual Accessibility**:
- **High Contrast Mode**: Support for Windows high contrast themes
- **Color Independence**: Information never conveyed through color alone
- **Text Scaling**: Interface remains functional at 200% zoom
- **Reduced Motion**: Respect prefers-reduced-motion settings

### Stress-Optimized Design for High-Pressure Scenarios

**Cognitive Load Reduction**:
- **Single Task Focus**: One primary action per screen
- **Clear Progress Indicators**: Users always know where they are
- **Plain Language**: Technical jargon replaced with user-friendly terms
- **Consistent Patterns**: Familiar interaction patterns across all flows

**Error Prevention**:
- **Input Validation**: Real-time feedback prevents submission errors
- **Confirmation Dialogs**: Critical actions require explicit confirmation
- **Reversible Actions**: Undo options where technically feasible
- **Clear Recovery Paths**: Always provide next steps for error scenarios

## 6. Component Library Extensions

### New Components Required

**YubiKeyStatusIndicator**:
```tsx
interface YubiKeyStatusProps {
  status: 'detecting' | 'connected' | 'ready' | 'locked' | 'error'
  device?: YubiKeyDevice
  onRetry?: () => void
}

// Visual states:
// detecting: Pulsing search animation
// connected: Green checkmark with device info
// ready: Solid green indicator
// locked: Warning icon with retry options
// error: Red error state with troubleshooting
```

**ProtectionModeSelector**:
```tsx
interface ProtectionModeProps {
  selectedMode: ProtectionMode
  onModeChange: (mode: ProtectionMode) => void
  yubiKeyAvailable: boolean
  showDetailedInfo?: boolean
}

// Responsive card layout with accessibility features
// Progressive disclosure for advanced information
// Smart enabling/disabling based on hardware availability
```

**UnlockMethodChooser**:
```tsx
interface UnlockMethodProps {
  vaultProtection: VaultProtectionMode
  availableMethods: UnlockMethod[]
  recommendedMethod: UnlockMethod
  onMethodSelect: (method: UnlockMethod) => void
}

// Smart suggestions based on hardware availability
// Clear explanations of why methods are/aren't available
// Fallback options clearly presented
```

### Enhanced Existing Components

**ProgressBar Component**:
- Add YubiKey-specific step indicators
- Support for hardware operation progress states
- Accessibility improvements for screen readers

**ErrorMessage Component**:
- YubiKey-specific error templates
- Progressive troubleshooting guidance
- Hardware-related recovery suggestions

## 7. Interaction Patterns & Micro-Interactions

### YubiKey Touch Animation

**Visual Feedback Pattern**:
```css
@keyframes yubikey-touch-pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

.yubikey-touch-indicator {
  animation: yubikey-touch-pulse 2s ease-in-out infinite;
  border: 2px solid var(--color-primary);
  border-radius: 8px;
}
```

**Progress Animation for Key Generation**:
- Smooth progress bar with completion estimates
- YubiKey visual representation with activity indicators
- Countdown timer for touch requirements
- Success animations for completion

### Smart Suggestion Highlighting

**Primary/Secondary Action Visual Hierarchy**:
- Primary suggestions use full-width, prominent styling
- Secondary options use outline buttons with subtle styling
- Disabled states clearly communicate why options aren't available
- Hover/focus states provide clear interactive feedback

## 8. Responsive Design Considerations

### Mobile/Tablet Adaptations

**Protection Mode Selection on Mobile**:
- Stacked card layout instead of side-by-side
- Touch-friendly tap targets (minimum 44px)
- Simplified descriptions to fit smaller screens
- Swipe navigation for method selection

**YubiKey Touch Instructions on Mobile**:
- Larger visual indicators for touch requirements
- Portrait/landscape layout adaptations
- Consideration for mobile YubiKey form factors (NFC, USB-C)

### Desktop Enhancements

**Multi-Column Layouts**:
- Side-by-side comparison views for protection modes
- Contextual help panels alongside main content
- Keyboard shortcuts for power users
- Window management considerations for Tauri desktop app

## 9. Implementation Specifications

### CSS Architecture

**Component-Scoped Styling**:
```css
/* YubiKey-specific design tokens */
:root {
  --yubikey-primary: #324B4B;
  --yubikey-secondary: #8AB6A6;
  --yubikey-accent: #F4B942;
  --yubikey-success: #10B981;
  --yubikey-warning: #F59E0B;
  --yubikey-error: #EF4444;
}

/* Hardware status indicators */
.yubikey-status-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.yubikey-status-indicator--connected {
  background: var(--yubikey-success-bg);
  color: var(--yubikey-success-fg);
  border: 1px solid var(--yubikey-success);
}
```

### TypeScript Interface Definitions

```tsx
// Protection mode definitions
type ProtectionMode = 'passphrase-only' | 'hybrid' | 'yubikey-only'

interface YubiKeyDevice {
  serial: string
  model: string
  version: string
  status: 'ready' | 'locked' | 'error'
}

interface VaultMetadata {
  protectionMode: ProtectionMode
  yubiKeySerial?: string
  createdAt: string
  version: string
}

// Unlock method selection
type UnlockMethod = 'passphrase' | 'yubikey'

interface UnlockOption {
  method: UnlockMethod
  available: boolean
  recommended: boolean
  reason?: string // Why not available or why recommended
}
```

### Animation Timing & Easing

**Consistent Motion Design**:
- **Fast**: 150ms for micro-interactions (hover, focus)
- **Medium**: 300ms for component transitions (cards, modals)
- **Slow**: 500ms for page-level transitions
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` for all animations
- **Respect Reduced Motion**: Disable animations when `prefers-reduced-motion: reduce`

## 10. Testing & Validation Specifications

### Usability Testing Requirements

**Protection Mode Selection Testing**:
- 95% of users correctly understand each protection mode
- Average decision time under 60 seconds
- 90% choose hybrid mode when YubiKey available
- Zero users confused about hardware requirements

**YubiKey Setup Flow Testing**:
- 100% success rate for hardware detection
- Average setup time under 75 seconds
- PIN setup completion without errors
- Touch requirement understanding and completion

**Accessibility Testing Requirements**:
- Full screen reader navigation without assistance
- Keyboard-only operation testing with power users
- High contrast mode visual verification
- Color blindness simulation testing

### Performance Benchmarks

**Component Rendering Performance**:
- Protection mode selection: <50ms initial render
- YubiKey detection: <2 seconds maximum wait time
- Unlock method switching: <200ms transition time
- Error state recovery: <100ms feedback display

## 11. Success Metrics & KPIs

### User Experience Metrics

**Setup Flow Success**:
- **90-second setup goal**: Maintained across all protection modes
- **Setup completion rate**: 85% or higher for all modes
- **Error recovery success**: 90% of users successfully resolve issues
- **Protection mode satisfaction**: 4.5/5 average rating

**Daily Usage Metrics**:
- **Unlock method success rate**: 95% first-attempt success
- **Method switching frequency**: <10% users need to switch methods
- **Error frequency**: <2% of decrypt operations encounter errors
- **Performance satisfaction**: No degradation from v0.1.0 baseline

### Accessibility Compliance Verification

**WCAG 2.2 AA Requirements**:
- All color contrasts meet 4.5:1 minimum ratio
- All interactive elements keyboard accessible
- All content available to screen readers
- No animations cause vestibular issues
- Text remains readable at 200% zoom

## Conclusion

This UX design specification translates the Product Owner's user journey requirements into concrete, implementable interface designs that maintain Barqly Vault's core simplicity while adding powerful YubiKey capabilities. The design system extensions preserve existing patterns while introducing new components specifically for hardware authentication flows.

**Key Success Factors**:
- **Progressive Disclosure**: Complexity hidden behind smart defaults
- **Accessibility First**: WCAG 2.2 AA compliance throughout
- **Stress Optimization**: Clear paths during high-pressure scenarios
- **Platform Consistency**: Familiar patterns reduce cognitive load
- **Hardware Integration**: Seamless YubiKey detection and management

The design balances user needs across all personas while providing clear upgrade paths from v0.1.0 and maintaining the signature 90-second setup experience that defines Barqly Vault's competitive advantage.

---

**Next Steps for Implementation**:
1. Review design specifications with Sr Frontend Engineer
2. Create component prototypes for user testing validation
3. Validate accessibility implementation with assistive technology
4. Integrate designs with System Architect's technical specifications
5. Plan phased implementation approach with ZenMaster coordination