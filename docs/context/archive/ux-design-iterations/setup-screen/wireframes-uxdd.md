# Setup Screen Wireframes & Visual Design

> **Purpose**: Visual representation of the enhanced Setup screen design  
> **Format**: ASCII wireframes with detailed annotations  
> **Status**: Ready for implementation

## Desktop Wireframe (1024px+)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Barqly Vault                                                     [−][□][×]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  🛡️  Secure Your Bitcoin Legacy                                 │     │
│  │      Create your encryption identity with military-grade         │     │
│  │      age encryption                                              │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  🔒 Your keys never leave your device  |  📖 Open-source audited │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  🕐 Quick Setup • Takes about 90 seconds                        │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                                                                   │     │
│  │  Create Your Encryption Identity                                 │     │
│  │  ───────────────────────────────────────────────────────────    │     │
│  │                                                                   │     │
│  │  Key Label *                                                     │     │
│  │  ┌─────────────────────────────────────────────────────────┐    │     │
│  │  │ My Bitcoin Vault                                        │    │     │
│  │  └─────────────────────────────────────────────────────────┘    │     │
│  │  A memorable name for this security identity                     │     │
│  │                                                                   │     │
│  │  Passphrase *                                    [👁️ Show]       │     │
│  │  ┌─────────────────────────────────────────────────────────┐    │     │
│  │  │ ••••••••••••••••••                                      │    │     │
│  │  └─────────────────────────────────────────────────────────┘    │     │
│  │  ┌─────────────────────────────────────────────────────────┐    │     │
│  │  │ Strength: ████████████░░░░ Strong                       │    │     │
│  │  └─────────────────────────────────────────────────────────┘    │     │
│  │  Use a phrase only you know, like a favorite quote              │     │
│  │                                                                   │     │
│  │  Confirm Passphrase *                                            │     │
│  │  ┌─────────────────────────────────────────────────────────┐    │     │
│  │  │ ••••••••••••••••••                         ✓ Match      │    │     │
│  │  └─────────────────────────────────────────────────────────┘    │     │
│  │                                                                   │     │
│  │  ┌──────────────┐  ┌──────────────────────────────────────┐     │     │
│  │  │    Clear     │  │   Create Security Identity   →       │     │     │
│  │  └──────────────┘  └──────────────────────────────────────┘     │     │
│  │                                                                   │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  ℹ️ Learn what happens next  ⌄                                   │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Mobile Wireframe (< 768px)

```
┌─────────────────────────┐
│ 🛡️ Secure Your Bitcoin  │
│    Legacy                │
│                          │
│ Create your encryption   │
│ identity with military-  │
│ grade age encryption     │
├─────────────────────────┤
│ 🔒 Keys stay on device   │
│ 📖 Open-source audited   │
├─────────────────────────┤
│ 🕐 Quick Setup           │
│    Takes ~90 seconds     │
├─────────────────────────┤
│                          │
│ Create Your Encryption   │
│ Identity                 │
│ ─────────────────────    │
│                          │
│ Key Label *              │
│ ┌─────────────────────┐  │
│ │ My Bitcoin Vault   │  │
│ └─────────────────────┘  │
│ A memorable name for     │
│ this security identity   │
│                          │
│ Passphrase *    [👁️]     │
│ ┌─────────────────────┐  │
│ │ ••••••••••••       │  │
│ └─────────────────────┘  │
│ ┌─────────────────────┐  │
│ │ Strength: ████░░    │  │
│ │ Strong              │  │
│ └─────────────────────┘  │
│ Use a phrase only you    │
│ know                     │
│                          │
│ Confirm Passphrase *     │
│ ┌─────────────────────┐  │
│ │ ••••••••••••  ✓    │  │
│ └─────────────────────┘  │
│                          │
│ ┌─────────────────────┐  │
│ │ Create Security     │  │
│ │ Identity →          │  │
│ └─────────────────────┘  │
│                          │
│ ┌─────────────────────┐  │
│ │      Clear          │  │
│ └─────────────────────┘  │
│                          │
│ ℹ️ Learn what happens    │
│    next ⌄                │
│                          │
└─────────────────────────┘
```

## Component States

### Input Field States
```
Default:
┌─────────────────────────┐
│                         │
└─────────────────────────┘

Hover:
┌─────────────────────────┐
│                         │ (border: darker)
└─────────────────────────┘

Focus:
┌═════════════════════════┐
║                         ║ (blue ring)
└═════════════════════════┘

Error:
┌─────────────────────────┐
│                         │ (red border, pink bg)
└─────────────────────────┘
❌ Error message here

Success:
┌─────────────────────────┐
│                    ✓    │ (green border)
└─────────────────────────┘
```

### Button States
```
Default:
┌──────────────────────────┐
│ Create Security Identity │
└──────────────────────────┘

Hover:
┌══════════════════════════┐
║ Create Security Identity ║ (elevated)
└══════════════════════════┘

Disabled:
┌──────────────────────────┐
│ Create Security Identity │ (50% opacity)
└──────────────────────────┘

Loading:
┌──────────────────────────┐
│ ⟳ Creating...           │
└──────────────────────────┘
```

## Success State Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ Your Bitcoin Legacy is Now Protected!                       │
│     Your encryption identity has been created and securely      │
│     stored.                                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Your Public Key                              [📋 Copy]   │   │
│  │ ┌───────────────────────────────────────────────────┐   │   │
│  │ │ age1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgp    │   │   │
│  │ │ qyqszqgpqyqszqgpqyqszqgpqyqszqgp                 │   │   │
│  │ └───────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Share this public key with family members who need to         │
│  encrypt files for you.                                       │
│                                                                 │
│                                             [Continue →]        │
└─────────────────────────────────────────────────────────────────┘
```

## Progress State Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  Generating Your Security Identity...                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ███████████████████████████░░░░░░░░░░░░  75%            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Creating encryption keypair...                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Expanded Help Section

```
┌─────────────────────────────────────────────────────────────────┐
│  ℹ️ Learn what happens next  ⌃                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│  │ 1️⃣ Key         │  │ 2️⃣ File        │  │ 3️⃣ Secure      │      │
│  │   Generation   │  │   Encryption   │  │   Storage      │      │
│  │               │  │               │  │               │      │
│  │ Your keypair  │  │ Use your key  │  │ Store files   │      │
│  │ is created    │  │ to encrypt    │  │ safely and    │      │
│  │ and securely  │  │ important     │  │ share public  │      │
│  │ stored        │  │ files         │  │ key           │      │
│  └───────────────┘  └───────────────┘  └───────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Color Specifications

### Primary Palette
```
┌─────────────────────────────────────────────────────────────────┐
│  Primary Blue     #2563EB  ████████  (Trust, CTAs)             │
│  Primary Green    #059669  ████████  (Success states)          │
│  Bitcoin Orange   #F59E0B  ████████  (Accent, optional)        │
└─────────────────────────────────────────────────────────────────┘
```

### Neutral Palette
```
┌─────────────────────────────────────────────────────────────────┐
│  Gray 900         #111827  ████████  (Primary text)            │
│  Gray 700         #374151  ████████  (Secondary text)          │
│  Gray 500         #6B7280  ████████  (Helper text)             │
│  Gray 300         #D1D5DB  ████████  (Borders)                 │
│  Gray 100         #F3F4F6  ████████  (Backgrounds)             │
└─────────────────────────────────────────────────────────────────┘
```

### Semantic Colors
```
┌─────────────────────────────────────────────────────────────────┐
│  Success          #10B981  ████████  (Success messages)        │
│  Error            #EF4444  ████████  (Error states)            │
│  Warning          #F59E0B  ████████  (Warnings)                │
│  Info             #3B82F6  ████████  (Information)             │
└─────────────────────────────────────────────────────────────────┘
```

## Spacing & Sizing Guide

### Component Spacing
```
Header to Trust Bar:     24px (1.5rem)
Trust Bar to Context:    24px (1.5rem)
Context to Form:         16px (1rem)
Form sections:           24px (1.5rem)
Input groups:            24px (1.5rem)
Label to input:          6px (0.375rem)
Input to helper:         4px (0.25rem)
```

### Component Heights
```
Header:                  80px max
Trust indicators:        48px
Progress context:        32px
Input fields:            48px
Primary button:          48px
Secondary button:        48px
Form container padding:  32px
```

### Border Radius
```
Cards:                   8px (0.5rem)
Inputs:                  6px (0.375rem)
Buttons:                 6px (0.375rem)
Small elements:          4px (0.25rem)
```

## Responsive Breakpoints

### Desktop (1024px+)
- Full layout as shown
- Side margins: 48px
- Max content width: 896px

### Tablet (768px - 1023px)
- Reduce side margins to 32px
- Stack trust indicators if needed
- Maintain button sizes

### Mobile (< 768px)
- Side margins: 16px
- Stack all elements vertically
- Full-width buttons
- Increase touch targets

## Animation Specifications

### Transitions
```
Default transition:      200ms ease-out
Collapsible sections:    300ms ease-out
Progress updates:        500ms ease-in-out
Success animation:       400ms spring
```

### Hover Effects
```
Buttons:                 translateY(-2px), shadow increase
Input focus:             ring expansion (200ms)
Links:                   color change (150ms)
```

## Implementation Notes

1. **Icons**: Use Lucide React for consistent iconography
2. **Fonts**: System font stack for performance
3. **CSS**: Use Tailwind classes with custom properties for theming
4. **Animations**: CSS-only for performance
5. **Images**: SVG icons only, no raster images
6. **Testing**: Verify all states and interactions

---

*These wireframes provide the visual blueprint for implementing the enhanced Setup screen. All measurements and specifications are designed for optimal user experience across devices.*