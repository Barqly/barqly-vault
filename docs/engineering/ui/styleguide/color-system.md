# Color System

**Version:** 2.0
**Last Updated:** 2025-10-17

---

## Design Principle: Brand vs. Functional Colors

**Use brand colors ONLY for:**
- Icons (key type identity, CTAs)
- Borders (dialog/card identity)
- Primary action buttons (CTAs)
- Brand-defining visual elements

**Keep all other UI elements on Tailwind defaults:**
- Form input focus rings (`blue-300`)
- Informational tooltips and collapsibles (`blue-600/700`)
- Help panels (`bg-blue-50 border-blue-200`)
- Validation states (green/red)
- Secondary informational elements

**Why:** This prevents brand color overload and maintains familiar, natural UX for functional elements while preserving strong brand identity where it matters.

---

## Brand Colors (Fixed Across Themes)

These colors remain constant in both light and dark modes:

### Primary Blue
```css
Premium Blue: #1D4ED8
Deeper Blue (Hover): #1E40AF
Light Blue (Hover bg): #dbeafe
```

**Usage:** Primary buttons, active navigation, primary CTAs

**Implementation:**
```tsx
<button
  style={{ backgroundColor: '#1D4ED8' }}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E40AF'}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
>
  Button Text
</button>
```

**Elements using premium blue:**
- Navigation active state
- "+ New Key" button
- Grid/List active toggle
- "Restore" button
- "Vault" button
- Link icons (Link2)

### Brand Teal (Passphrase Identity)
```css
Brighter Teal: #13897F
```

**Visual Intent:** Software-based security with vibrant, confident feel

**Why brighter teal:** Better visual weight balance with orange. More alive and vibrant while maintaining software-based security identity.

### Bitcoin Orange (YubiKey Identity)
```css
Softer Orange: #F98B1C      /* Light backgrounds */
Vibrant Orange: #ff8a00     /* Dark backgrounds only */
```

**Visual Intent:** Hardware-based security with vibrant, brand-consistent feel

**Brand Identity:** Based on Barqly logo color (#ff8a00). Softer variant (#F98B1C) used on light backgrounds for premium feel (less 'alert', more brand accent). Vibrant variant (#ff8a00) reserved for dark backgrounds where brightness is needed.

### Brand Gray
```css
Logo Gray: #565555
```

**Usage:** Page headings, logo text in light mode

---

## Key Type Visual Identity

### Passphrase Keys (Software-Based)

**Primary Color:** Brighter Teal (~7-10% brighter than original)

| Element | Color | Usage |
|---------|-------|-------|
| Icon | `#13897F` | Key icon in cards, filters, modals (brighter, more alive) |
| Icon Background | `rgba(15, 118, 110, 0.1)` | Soft teal tint (10% opacity) |
| Icon Border | `#B7E1DD` | Soft teal border (20-25% tint) |
| Badge Background | `rgba(15, 118, 110, 0.1)` | Type badge background |
| Badge Text | `#13897F` | Type badge text (brighter teal) |
| Badge Border | `#B7E1DD` | Type badge border |

**Filter Button (Selected State):**
- Background: `#1A2238` (navy)
- Border: `#2C3E50` (lighter navy)
- Icon: `#13897F` (brighter teal)
- Hover Glow: `inset -3px 0 6px -2px rgba(15, 118, 110, 0.6)` (teal inner glow)

### YubiKey Keys (Hardware-Based)

**Primary Color:** Bitcoin Orange (Brand Color - Softer Variant)

| Element | Color | Usage |
|---------|-------|-------|
| Icon (Light backgrounds) | `#F98B1C` | Fingerprint icon in cards, tables, modals (softer, premium) |
| Icon (Dark backgrounds) | `#ff8a00` | Fingerprint icon in filter button (vibrant on dark) |
| Icon Background | `rgba(249, 139, 28, 0.08)` | Subtle orange tint (8% opacity - refined) |
| Icon Border | `#ffd4a3` | Light orange tint border |
| Badge Background | `rgba(249, 139, 28, 0.08)` | Type badge background |
| Badge Text | `#F98B1C` | Type badge text (softer orange, less 'alert' feel) |
| Badge Border | `#ffd4a3` | Light orange tint border |

**Filter Button (Selected State):**
- Background: `#1E1E1E` (softer dark gray, not pure black)
- Border: `#2C2C2C` (subtle gray)
- Icon: `#ff8a00` (vibrant Bitcoin orange - needs brightness on dark bg)
- Hover Glow: `inset 3px 0 6px -2px rgba(255, 138, 0, 0.6)` (orange inner glow)

---

## Status Badge Colors

Status badges communicate key lifecycle states with distinct colors and icons.

### Active Status

**When shown:** Key is attached to 1+ vaults

```css
background: rgba(15, 118, 110, 0.1)  /* Teal tint 10% */
color: #13897F                       /* Brighter teal (matches Passphrase) */
border: 1px solid #99F6E4            /* Bright teal */
icon: none                           /* No icon for Active */
```

**Visual Intent:** Confident, stable state. Pairs with Passphrase theme. Brighter for better visibility.

### New Status

**When shown:** Key in pre_activation state (never used)

```css
background: #F1F5F9                  /* Solid neutral slate (light mode) */
color: #334155                       /* Slate-700 (light mode) */
border: 1px solid #CBD5E1            /* Slate-300 (light mode) */
icon: Sparkles (h-3 w-3)            /* ✨ New/fresh */
```

**Dark Mode:**
```css
background: #334155                  /* Slate-700 */
color: #CBD5E1                       /* Slate-300 - lighter text */
border: 1px solid #475569            /* Slate-600 */
```

**Visual Intent:** Subtle, neutral, low-emphasis. Doesn't compete with primary states. Toned down in dark mode.

### Inactive Status

**When shown:** Key is deactivated (30-day grace period)

```css
background: rgba(185, 28, 28, 0.1)   /* Red tint 10% */
color: #B91C1C                       /* Red-700 */
border: 1px solid #FCA5A5            /* Soft red */
icon: Clock (h-3 w-3)               /* ⏳ Time-limited */
```

**Visual Intent:** Attention-worthy, lifecycle ending. Clock icon signals countdown.

**Display format:** `Inactive 28d` (shows days remaining)

### Compromised Status

**When shown:** Security breach detected (rare)

```css
background: rgba(185, 28, 28, 0.15)  /* Deeper red tint 15% */
color: #991B1B                       /* Red-800 */
border: 1px solid #FCA5A5            /* Soft red */
icon: AlertTriangle (h-3 w-3)       /* ⚠️ Critical warning */
```

**Visual Intent:** Critical alert. Deeper red than Inactive.

---

## Neutral Grays (Theme-Aware)

### Light Mode
```css
Slate-50: #f8fafc     /* Hover backgrounds, elevated surfaces */
Slate-100: #f1f5f9    /* Subtle borders, dividers */
Slate-200: #e2e8f0    /* Standard borders */
Slate-300: #cbd5e0f   /* Secondary borders */
Slate-400: #94a3b8    /* Muted text, disabled */
Slate-500: #64748b    /* Secondary text */
Slate-600: #475569    /* Icons, labels */
Slate-700: #334155    /* Primary text in some contexts */
Slate-800: #1e293b    /* Body text, headings */
```

### Dark Mode
```css
Slate-900: #0f172a    /* App background */
Slate-800: #1e293b    /* Card surfaces */
Slate-700: #334155    /* Elevated surfaces, hover */
Slate-600: #475569    /* Borders */
Slate-500: #64748b    /* Muted text */
Slate-400: #94a3b8    /* Secondary text */
Slate-300: #cbd5e1    /* Borders */
Slate-50: #f8fafc     /* Primary text */
```

---

## Status & Semantic Colors

### Success (Teal)
```css
color: #13897F                       /* Matches Passphrase! */
background: rgba(15, 118, 110, 0.1)
border: #99F6E4
```

### Error/Warning (Red)
```css
Red-700: #B91C1C     /* Inactive text */
Red-800: #991B1B     /* Compromised text */
Red Tint 10%: rgba(185, 28, 28, 0.1)  /* Inactive bg */
Red Tint 15%: rgba(185, 28, 28, 0.15) /* Compromised bg */
Soft Red Border: #FCA5A5
Light Red Border: #FECACA
```

### Info (Yellow)
```css
Warning: #EAB308      /* yellow-600 */
```

### Info Panel (Blue)
```css
/* Light Mode */
background: #eff6ff   /* blue-50 */
border: #bfdbfe       /* blue-200 */

/* Dark Mode */
background: rgba(29, 78, 216, 0.08)  /* Premium blue tint 8% */
```

---

## Color Palette Quick Reference

### Most Commonly Used

```css
/* Primary Actions */
#1D4ED8  /* Premium blue */
#1E40AF  /* Premium blue hover */

/* Passphrase */
#13897F  /* Brighter teal */
#B7E1DD  /* Teal border */

/* YubiKey */
#F98B1C  /* Softer orange (light bg) */
#ff8a00  /* Vibrant orange (dark bg) */
#ffd4a3  /* Orange border */

/* Neutrals (Light Mode) */
#475569  /* Slate-600 (icons, text) */
#64748b  /* Slate-500 (secondary text) */
#94a3b8  /* Slate-400 (muted) */
#e2e8f0  /* Slate-200 (borders) */
#f8fafc  /* Slate-50 (hover backgrounds) */

/* Status */
#13897F  /* Active (teal) */
#334155  /* New (slate) */
#B91C1C  /* Inactive (red) */
#991B1B  /* Compromised (darker red) */
```

---

## Design Rationale

### Why These Colors?

**Teal for Passphrase:**
- Software-centric (mint/teal associated with digital)
- Distinct from hardware gold
- Premium feel (not default green)
- Excellent contrast on white

**Orange for YubiKey:**
- Evokes metallic touch point of real YubiKey device
- Premium, exclusive feeling
- Hardware-centric visual language
- Darker variant (#F98B1C) improves readability while maintaining brand connection

**Premium Blue (#1D4ED8):**
- Deeper than standard blue-600
- More premium, professional
- Distinct from teal/orange palette
- Strong CTA presence

### Why Subtle Borders?

- Adds dimension without heaviness
- Tinted borders feel cohesive (not generic)
- Almost invisible but elevates design
- Prevents "flat" appearance

### Why Icons in Status Badges?

- Better accessibility (not color-dependent)
- Adds visual hierarchy
- Icons communicate meaning (Clock = time-limited, Sparkles = new)
- Premium Apple/1Password-like feel
- Softens strong colors (especially red)

---

**See Also:**
- [Dark Mode System](./dark-mode.md) - Theme implementation details
- [Components](./components.md) - How colors are applied to components
- [Accessibility](./accessibility.md) - Color contrast requirements
