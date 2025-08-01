# Progressive Disclosure Design Patterns

## Executive Summary

This document specifies the progressive disclosure patterns that reveal trust and help information on-demand, maintaining focus on the primary form while providing depth when users seek it.

## Progressive Disclosure Architecture

### Information Hierarchy

```
Level 0: Always Visible (Minimal)
  ↓ User Interest
Level 1: Hover/Focus (Contextual)
  ↓ User Engagement
Level 2: Click/Tap (Detailed)
  ↓ User Investment
Level 3: External Links (Comprehensive)
```

## Pattern Implementations

### 1. Trust Badge Hover Pattern

#### Visual Design

```
Default State:
┌─────────────┐ ┌─────────────┐
│ 🔒 Local    │ │ 📖 Open     │
└─────────────┘ └─────────────┘

Hover State:
┌─────────────────────────────────┐
│ 🔒 Local-only encryption        │
│ Your private keys never leave   │
│ this device or connect online   │
└─────────────────────────────────┘
```

#### Interaction Specifications

- **Trigger**: Hover (desktop) / Long-press (mobile)
- **Delay**: 200ms before showing
- **Animation**: Fade in with slight scale (0.95 → 1)
- **Position**: Below badge with arrow pointer
- **Dismissal**: Mouse leave or click outside

#### Implementation Code Structure

```typescript
interface BadgeTooltip {
  trigger: 'hover' | 'focus' | 'click';
  delay: number;
  content: ReactNode;
  position: 'top' | 'bottom' | 'auto';
  maxWidth: number;
}
```

### 2. Form Field Progressive Help

#### Three-Tier Field Assistance

```
Tier 1: Placeholder (Always visible)
"e.g., My Bitcoin Vault"

Tier 2: Focus Helper (On interaction)
"Choose a memorable name for this key"

Tier 3: Error Recovery (On validation fail)
"Names must be 3-50 characters. Try: 'Family Bitcoin Key'"
```

#### Passphrase Strength Progression

```
Empty:
[________________________]

Typing (Weak):
[********________________] Weak
Add numbers and symbols

Typing (Good):
[****************________] Good
Consider making it longer

Typing (Strong):
[************************] Strong ✓
Great passphrase!
```

### 3. Collapsible Help Section

#### Collapsed State Design

```
─────────────────────────────────────
[ℹ️ How does this work?          ▼]
─────────────────────────────────────
```

#### Expanded State Design

```
─────────────────────────────────────
[ℹ️ How does this work?          ▲]
┌───────────────────────────────────┐
│ Your Bitcoin Legacy in 3 Steps    │
│                                   │
│ 1️⃣ Create → 2️⃣ Encrypt → 3️⃣ Share  │
│                                   │
│ [Detailed content...]             │
│                                   │
│ [Learn more about age encryption] │
└───────────────────────────────────┘
─────────────────────────────────────
```

#### Animation Specifications

- **Type**: Height-based slide
- **Duration**: 300ms ease-out
- **Content**: Opacity fade 0→1 over last 100ms
- **Accessibility**: Announce state change

### 4. Smart Contextual Prompts

#### Time-Based Nudges

```
After 30 seconds of inactivity:
┌─────────────────────────────┐
│ 💡 Tip: Use 4+ random words │
│ Example: "correct horse..."  │
│ [Dismiss] [Learn why]       │
└─────────────────────────────┘
```

#### Error-Based Guidance

```
After passphrase mismatch:
┌─────────────────────────────┐
│ ⚠️ Passphrases don't match  │
│ [Show passphrases]          │
└─────────────────────────────┘
```

## Mobile-Specific Patterns

### Touch-Optimized Disclosure

#### Long-Press Information

```
Long-press on "🔒 Local":
┌─────────────────────────┐
│ What does "Local" mean? │
│                         │
│ Your encryption keys    │
│ stay on this device.    │
│ No cloud. No servers.   │
│                         │
│ [Got it]               │
└─────────────────────────┘
```

#### Swipe-Up Help Sheet

```
[ℹ️ Swipe up for help]

*User swipes up*

Bottom sheet appears (50% height):
┌─────────────────────────┐
│ ─                       │
│ Getting Started Guide   │
│                         │
│ • What is a key?        │
│ • Passphrase tips       │
│ • Security FAQ          │
│                         │
└─────────────────────────┘
```

## Progressive Disclosure Timing

### Immediate (0ms)

- Placeholders
- Basic labels
- Primary actions

### Quick (200-500ms)

- Hover tooltips
- Focus helpers
- Validation feedback

### Deliberate (>500ms)

- Help expansion
- Detailed guides
- Educational content

### Delayed (>30s)

- Inactivity prompts
- Gentle nudges
- Tips and tricks

## Accessibility Patterns

### Keyboard Navigation

```
Tab Order with Disclosure:
1. Key Label field
2. Key Label help (?) - Reveals on Tab
3. Passphrase field
4. Passphrase help (?)
5. Confirm field
6. Main help trigger
7. Create button
```

### Screen Reader Announcements

```
"Key Label, edit text, required.
Press Tab for help."

*User presses Tab*

"Help available. Press Enter to hear
tips for choosing a key name."
```

### High Contrast Mode

- Help triggers remain visible
- Tooltip borders increase to 2px
- Icons get explicit backgrounds

## Performance Optimization

### Lazy Loading Strategy

1. **Initial**: Core form only
2. **On hover**: Load tooltip content
3. **On expand**: Load help graphics
4. **On deep dive**: Load external resources

### Animation Performance

- Use CSS transforms only
- Will-change on interactive elements
- RequestAnimationFrame for JS animations
- Reduce motion respects user preference

## Implementation Components

### 1. `<ProgressiveTooltip>`

```typescript
interface Props {
  content: string | ReactNode;
  delay?: number;
  trigger?: 'hover' | 'focus' | 'both';
  position?: 'auto' | 'top' | 'bottom';
}
```

### 2. `<ContextualFieldHelp>`

```typescript
interface Props {
  fieldName: string;
  showOnFocus?: boolean;
  showOnError?: boolean;
  helpContent: HelpContent;
}
```

### 3. `<ExpandableGuide>`

```typescript
interface Props {
  triggerText: string;
  content: ReactNode;
  startExpanded?: boolean;
  onToggle?: (isOpen: boolean) => void;
}
```

## Success Metrics

### Engagement Metrics

- Badge hover rate: >40%
- Help expansion: 15-25%
- Tooltip interaction: >60%
- Error help usage: >80%

### Performance Metrics

- Tooltip appear: <200ms
- Help expand: <300ms
- No layout shift on disclosure
- <5% animation jank

### Usability Metrics

- Reduced support questions: 50%
- Improved completion rate: +15%
- Decreased time-to-complete: -20%
- Higher confidence scores: +25%
