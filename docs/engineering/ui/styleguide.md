# Barqly Vault UI Style Guide

**Version:** 1.0
**Date:** 2025-10-16
**Status:** Production-Ready
**Purpose:** Comprehensive visual design system for consistent UI implementation

---

## 🎨 Color System

### Key Type Visual Identity

Barqly Vault uses distinct color palettes to differentiate Passphrase (software) and YubiKey (hardware) keys.

#### Passphrase Keys (Software-Based)

**Primary Color:** Deep Teal
**Visual Intent:** Software-based security with premium, confident feel

| Element | Color | Usage |
|---------|-------|-------|
| Icon | `#0F766E` | Key icon in cards, filters, modals |
| Icon Background | `rgba(15, 118, 110, 0.1)` | Soft teal tint (10% opacity) |
| Icon Border | `#B7E1DD` | Soft teal border (20-25% tint) |
| Badge Background | `rgba(15, 118, 110, 0.1)` | Type badge background |
| Badge Text | `#0F766E` | Type badge text |
| Badge Border | `#B7E1DD` | Type badge border |

**Filter Button (Selected State):**
- Background: `#1A2238` (navy)
- Border: `#2C3E50` (lighter navy)
- Icon: `#0F766E` (deep teal)
- Hover Glow: `inset -3px 0 6px -2px rgba(15, 118, 110, 0.6)` (teal inner glow)

#### YubiKey Keys (Hardware-Based)

**Primary Color:** Dark Gold
**Visual Intent:** Hardware-based security with metallic, premium feel

| Element | Color | Usage |
|---------|-------|-------|
| Icon | `#A16207` | Fingerprint icon in cards, filters, modals |
| Icon Background | `rgba(197, 161, 0, 0.15)` | Soft gold tint (15% opacity) |
| Icon Border | `#E6D8AA` | Soft gold border (desaturated pale gold) |
| Badge Background | `rgba(197, 161, 0, 0.15)` | Type badge background |
| Badge Text | `#A16207` | Type badge text (darker gold) |
| Badge Border | `#E6D8AA` | Type badge border |

**Filter Button (Selected State):**
- Background: `#151515` (dark gray)
- Border: `#2C2C2C` (subtle gray)
- Icon: `#A16207` (darker gold)
- Hover Glow: `inset 3px 0 6px -2px rgba(161, 98, 7, 0.6)` (gold inner glow)

---

### Status Badge Colors

Status badges communicate key lifecycle states with distinct colors and icons.

#### Active Status

**When shown:** Key is attached to 1+ vaults

```css
background: rgba(15, 118, 110, 0.1)  /* Teal tint 10% */
color: #0F766E                       /* Deep teal */
border: 1px solid #99F6E4            /* Bright teal */
icon: none                           /* No icon for Active */
```

**Visual Intent:** Confident, stable state. Pairs with Passphrase theme.

#### New Status

**When shown:** Key in pre_activation state (never used)

```css
background: #F1F5F9                  /* Solid neutral slate */
color: #334155                       /* Slate-700 */
border: 1px solid #CBD5E1            /* Slate-300 */
icon: Sparkles (h-3 w-3)            /* ✨ New/fresh */
```

**Visual Intent:** Subtle, neutral, low-emphasis. Doesn't compete with primary states.

#### Inactive Status

**When shown:** Key is deactivated (30-day grace period)

```css
background: rgba(185, 28, 28, 0.1)   /* Red tint 10% */
color: #B91C1C                       /* Red-700 */
border: 1px solid #FCA5A5            /* Soft red */
icon: Clock (h-3 w-3)               /* ⏳ Time-limited */
```

**Visual Intent:** Attention-worthy, lifecycle ending. Clock icon signals countdown.

**Display format:** `Inactive 28d` (shows days remaining)

#### Compromised Status

**When shown:** Security breach detected (rare)

```css
background: rgba(185, 28, 28, 0.15)  /* Deeper red tint 15% */
color: #991B1B                       /* Red-800 */
border: 1px solid #FCA5A5            /* Soft red */
icon: AlertTriangle (h-3 w-3)       /* ⚠️ Critical warning */
```

**Visual Intent:** Critical alert. Deeper red than Inactive.

---

### Primary Action Color (Premium Blue)

**Used for:** Primary buttons, active navigation, primary CTAs

```css
/* Default State */
background: #1D4ED8               /* Premium deep blue */
color: #ffffff                    /* White text */

/* Hover State */
background: #1E40AF               /* Even deeper blue */
```

**Elements using premium blue:**
- Navigation active state
- "+ New Key" button
- Grid/List active toggle
- "Restore" button
- "Vault" button
- Link icons (Link2)

**Implementation example:**
```tsx
<button
  style={{ backgroundColor: '#1D4ED8' }}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E40AF'}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
>
  Button Text
</button>
```

---

### Secondary Action Color (Neutral Gray)

**Used for:** Secondary buttons, destructive actions (Deactivate), Export

```css
/* Enabled State */
background: transparent or white
color: #64748b                    /* Slate-600 */
border: 1px solid #cbd5e0f        /* Slate-300 */

/* Hover State */
background: #f8fafc               /* Slate-50 */

/* Disabled State */
color: #94a3b8                    /* Slate-400 */
opacity: 0.5
cursor: not-allowed
```

**Elements using secondary style:**
- "Deactivate" button
- "Export" button
- Disabled states

---

## 🎯 Icons

### Icon Sizes

| Context | Size | Usage |
|---------|------|-------|
| PageHeader title icon | `h-5 w-5` | Icon before "Manage Keys" |
| Filter buttons | `h-4 w-4` | Key/Fingerprint in filter toggles |
| KeyCard icon (Row 1) | `h-4 w-4` | Key/Fingerprint in rounded container |
| KeyCard badges | `h-3 w-3` | Status badge icons (Clock, Sparkles, AlertTriangle) |
| Action button icons | `h-3 w-3` | Link2, FileText in footer buttons |
| Table icons | `h-4 w-4` (Row 1), `h-3 w-3` (actions) | Icons in table cells |
| Modal icons (large) | `h-12 w-12` | CreateKeyModal selection cards |

### Icon Colors

**PageHeader Title Icon:**
```css
color: #475569  /* Slate-600 - neutral, not distracting */
```

**Filter Buttons (Unselected):**
```css
color: #94a3b8  /* Slate-400 - muted gray */
```

**Copy/Paste Icons:**
```css
/* Default */
color: #94a3b8  /* Slate-400 */

/* Hover */
color: #64748b  /* Slate-600 */

/* Copied State */
color: #16a34a  /* Green-600 */
icon: Check (replaces Copy for 2 seconds)
```

---

## 📦 Badges

### Type Badges (Passphrase/YubiKey)

**Passphrase Badge:**
```css
background: rgba(15, 118, 110, 0.1)
color: #0F766E
border: 1px solid #B7E1DD
border-radius: 9999px  /* rounded-full */
padding: 0.125rem 0.5rem  /* py-0.5 px-2 */
font-size: 0.75rem  /* text-xs */
font-weight: 500  /* font-medium */
```

**YubiKey Badge:**
```css
background: rgba(197, 161, 0, 0.15)
color: #A16207
border: 1px solid #E6D8AA
border-radius: 9999px
padding: 0.125rem 0.5rem
font-size: 0.75rem
font-weight: 500
```

### Status Badges

All status badges use `rounded-full` shape and `text-xs font-medium`.

See "Status Badge Colors" section above for detailed color specifications.

**Common Structure:**
```tsx
<span
  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
  style={{
    backgroundColor: '...',
    color: '...',
    border: '1px solid ...',
  }}
>
  <IconComponent className="h-3 w-3" />
  Status Text
</span>
```

---

## 🔘 Buttons

### Primary Buttons (Premium Blue)

**Default State:**
```css
background: #1D4ED8
color: #ffffff
padding: 0.5rem 1rem  /* px-4 py-2 */
border-radius: 0.5rem  /* rounded-lg */
font-size: 0.875rem  /* text-sm */
font-weight: 500  /* font-medium */
transition: colors
```

**Hover State:**
```css
background: #1E40AF  /* Deeper blue */
```

**Implementation:**
```tsx
<button
  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
  style={{ backgroundColor: '#1D4ED8' }}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E40AF'}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
>
  Button Text
</button>
```

**Used in:**
- "+ New Key" button
- "Restore" button
- "Vault" button
- Navigation active state

---

### Secondary Buttons (Gray Outline)

**Default State:**
```css
background: transparent
color: #64748b  /* Slate-600 */
border: 1px solid #cbd5e0f  /* Slate-300 */
padding: 0.375rem 0.75rem  /* px-3 py-1.5 (KeyCard), px-4 py-2 (larger) */
border-radius: 0.375rem  /* rounded-md */
font-size: 0.75rem  /* text-xs (KeyCard) or text-sm */
font-weight: 500
transition: colors
```

**Hover State:**
```css
background: #f8fafc  /* Slate-50 */
```

**Disabled State:**
```css
color: #94a3b8  /* Slate-400 */
opacity: 0.5
cursor: not-allowed
```

**Used in:**
- "Deactivate" button
- "Export" button

---

### Toggle Buttons (Grid/List, Filters)

**Container:**
```css
border: 1px solid #e2e8f0  /* Slate-200 */
border-radius: 0.5rem  /* rounded-lg */
overflow: hidden
display: flex
```

**Grid/List Toggle:**

Active state:
```css
background: #1D4ED8  /* Premium blue */
color: #ffffff
padding: 0.5rem  /* p-2 */
```

Inactive state:
```css
background: #ffffff
color: #64748b  /* Slate-600 */
hover-background: #f8fafc  /* Slate-50 */
```

**Filter Toggle (Passphrase):**

Active state:
```css
background: #1A2238  /* Navy */
border: 1px solid #2C3E50  /* Lighter navy */
icon-color: #0F766E  /* Deep teal */
hover: inset -3px 0 6px -2px rgba(15, 118, 110, 0.6)  /* Teal glow right */
```

Inactive state:
```css
background: #ffffff
icon-color: #94a3b8  /* Slate-400 */
hover-background: #f8fafc
```

**Filter Toggle (YubiKey):**

Active state:
```css
background: #151515  /* Dark gray */
border: 1px solid #2C2C2C  /* Subtle gray */
icon-color: #A16207  /* Dark gold */
hover: inset 3px 0 6px -2px rgba(161, 98, 7, 0.6)  /* Gold glow left */
```

Inactive state:
```css
background: #ffffff
icon-color: #94a3b8  /* Slate-400 */
hover-background: #f8fafc
```

---

## 🖼️ Cards

### KeyCard Structure

**Card Container:**
```css
background: #ffffff
border: 1px solid #e2e8f0  /* Slate-200 */
border-radius: 0.5rem  /* rounded-lg */
box-shadow: 0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.08)  /* Subtle elevation */
transition: all
```

**Selected State:**
```css
border: 2px solid [key-type-color]  /* #A7F3D0 (Passphrase) or #C5A100 (YubiKey) */
box-shadow: 0 0 0 2px [key-type-color-alpha]  /* rgba with 0.5 opacity */
```

**Hover State:**
```css
box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)  /* Larger shadow */
```

### KeyCard Row Structure

**Row 1: Icon + Label**
```css
padding: 1.25rem 1.25rem 0.5rem 1.25rem  /* pt-5 px-5 pb-2 -> pt-3 px-5 pb-2 */
display: flex
align-items: center
gap: 0.75rem  /* gap-3 */
```

**Row 2: Type Badge + Status Badge**
```css
padding: 0.5rem 1.25rem  /* py-2 px-5 */
display: flex
align-items: center
justify-content: space-between
```

**Row 3: Attachment Status + Serial**
```css
padding: 0.5rem 1.25rem  /* pt-2 pb-2 px-5 */
display: flex
align-items: center
justify-content: space-between
```

**Row 4: Public Key**
```css
padding: 0 1.25rem 0.5rem 1.25rem  /* pt-0 pb-2 px-5 */
display: flex
align-items: center
```

**Footer: Action Buttons**
```css
padding: 0.75rem 1.25rem  /* py-3 px-5 */
border-top: 1px solid #f1f5f9  /* Slate-100 */
display: flex
align-items: center
justify-content: space-between
gap: 0.5rem  /* gap-2 */
```

---

## 🔲 Icon Containers

### KeyCard Icons (Row 1)

**Passphrase:**
```css
background: rgba(15, 118, 110, 0.1)
border: 1px solid #B7E1DD
border-radius: 0.5rem  /* rounded-lg */
padding: 0.5rem  /* p-2 */
icon-size: 1rem  /* h-4 w-4 */
icon-color: #0F766E
```

**YubiKey:**
```css
background: rgba(197, 161, 0, 0.15)
border: 1px solid #E6D8AA
border-radius: 0.5rem
padding: 0.5rem
icon-size: 1rem  /* h-4 w-4 */
icon-color: #A16207
icon-type: Fingerprint  /* Not Key */
```

### Modal/Empty State Icons (Large)

**Passphrase:**
```css
background: rgba(15, 118, 110, 0.1)
border: 1px solid #B7E1DD
border-radius: 0.5rem
padding: 0.75rem  /* p-3 */
icon-size: 3rem  /* h-12 w-12 */
icon-color: #0F766E
icon-type: Key
```

**YubiKey:**
```css
background: rgba(197, 161, 0, 0.15)
border: 1px solid #E6D8AA
border-radius: 0.5rem
padding: 0.75rem
icon-size: 3rem  /* h-12 w-12 */
icon-color: #A16207
icon-type: Fingerprint
```

---

## 📝 Typography

### Text Sizes

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| PageHeader title | `1.5rem` (text-2xl) | 600 (semibold) | `#565555` |
| PageHeader icon | `1.25rem` (h-5 w-5) | - | `#475569` (Slate-600) |
| KeyCard label | `1rem` (base) | 600 (semibold) | `#1e293b` (Slate-800) |
| KeyCard text | `0.75rem` (text-xs) | 500 (font-medium) | `#64748b` (Slate-600) |
| Badge text | `0.75rem` (text-xs) | 500 (font-medium) | Varies by type |
| Button text | `0.875rem` (text-sm) or `0.75rem` (text-xs) | 500 (font-medium) | White or Slate-600 |
| Table header | `0.75rem` (text-xs) | 500 (font-medium) | `#64748b` (Slate-600) |
| Table cell text | `0.75rem` (text-xs) | 500 (font-medium) | `#334155` (Slate-700) |

### Label Truncation

**Maximum length:** 24 characters (enforced by backend validation)

**Truncation rule:**
```tsx
const displayLabel = keyRef.label.length > 24
  ? keyRef.label.slice(0, 24) + '...'
  : keyRef.label;
```

**Tooltip:** Shows full label + S/N (YubiKey only) on hover

---

## 🎭 Interactive States

### Hover Effects

**Filter Buttons (Inner Glow):**
```css
/* Passphrase - Right edge glow */
box-shadow: inset -3px 0 6px -2px rgba(15, 118, 110, 0.6)

/* YubiKey - Left edge glow */
box-shadow: inset 3px 0 6px -2px rgba(161, 98, 7, 0.6)
```

**Copy Button (State Change):**
```tsx
/* Default */
<Copy className="h-3 w-3" style={{ color: '#94a3b8' }} />

/* Copied (2 seconds) */
<Check className="h-3 w-3" style={{ color: '#16a34a' }} />
```

**Card Hover:**
```css
box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)
```

**Table Row Hover:**
```css
background: #f8fafc  /* Slate-50 */
transition: colors
```

### Focus States

**Form Inputs:**
```css
outline: none
ring: 2px solid #3b82f6  /* Blue-500 */
```

**Buttons:**
```css
outline: none
ring: 2px solid #3b82f6
ring-offset: 2px
```

---

## 📐 Spacing & Layout

### Container Widths

| Container | Max Width |
|-----------|-----------|
| AppPrimaryContainer | `960px` (max-w-[960px]) |
| Modal content | `32rem` (max-w-2xl) for CreateKeyModal |
| Create Key panel | `32rem` (max-w-2xl) |

### Consistent Spacing Values

| Usage | Value | Class |
|-------|-------|-------|
| Section top margin | `1.5rem` | `mt-6` |
| Section bottom margin | `1.5rem` | `mb-6` |
| Card gap in grid | `1rem` | `gap-4` |
| Button gap | `0.75rem` | `gap-3` |
| Icon gap | `0.5rem` | `gap-2` |
| Small gap | `0.375rem` | `gap-1.5` |
| Tiny gap | `0.25rem` | `gap-1` |

### Row Padding (KeyCard)

```css
Row 1: pt-3 pb-2 px-5
Row 2: py-2 px-5
Row 3: pt-2 pb-2 px-5
Row 4: pt-0 pb-2 px-5
Footer: py-3 px-5
```

**Pattern:** Content rows have `pt-2`, footer has `py-3` for symmetry with top.

---

## 📋 Tables

### Table Structure

**Table Container:**
```css
background: #ffffff
border: 1px solid #e2e8f0  /* Slate-200 */
border-radius: 0.5rem  /* rounded-lg */
overflow: hidden
```

**Table Header:**
```css
background: #f8fafc  /* Slate-50 */
border-bottom: 1px solid #e2e8f0
padding: 0.75rem 1rem  /* py-3 px-4 */
font-size: 0.75rem  /* text-xs */
font-weight: 500  /* font-medium */
color: #64748b  /* Slate-600 */
```

**Table Rows:**
```css
border-bottom: 1px solid #f1f5f9  /* Slate-100 */
padding: 0.75rem 1rem  /* py-3 px-4 */

/* Hover */
background: #f8fafc  /* Slate-50 */
transition: colors
```

**Column Alignment:**
- Key: Left
- Public Key: Left
- Vaults: Left
- Status: Left
- Actions: Right (content), Center (header)

**No alternating row colors** - Clean, modern appearance

---

## 🎪 Modals & Dialogs

### Modal Overlay

```css
background: rgba(0, 0, 0, 0.5)  /* bg-black/50 */
backdrop-filter: blur(4px)  /* backdrop-blur-sm */
position: fixed
inset: 0
z-index: 40
```

### Modal Content

```css
background: #ffffff
border-radius: 0.5rem  /* rounded-lg */
box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)  /* shadow-xl */
max-width: varies by modal type
padding: 0
z-index: 50
```

**Modal Header:**
```css
padding: 1.5rem  /* p-6 */
border-bottom: 1px solid #e5e7eb  /* Gray-200 */
display: flex
justify-content: space-between
align-items: center
```

**Modal Body:**
```css
padding: 1.5rem  /* p-6 */
```

---

## 🎯 Navigation (Sidebar)

### Navigation Items

**Active State:**
```css
background: #1D4ED8  /* Premium blue */
color: #ffffff
icon-color: #ffffff
padding: 0.75rem  /* py-3 px-3 */
border-radius: 0.5rem  /* rounded-lg */
```

**Inactive State:**
```css
background: transparent
color: #64748b  /* Slate-500 */
icon-color: #94a3b8  /* Slate-400 */

/* Hover */
background: #f8fafc  /* Slate-50 */
color: #334155  /* Slate-700 */
```

**Badge (Active):**
```css
background: #1E40AF  /* Deeper blue */
color: #ffffff
padding: 0.125rem 0.5rem  /* px-2 py-0.5 */
border-radius: 9999px  /* rounded-full */
font-size: 0.75rem  /* text-xs */
```

---

## 🎨 Special Effects

### Glow Effects (Filter Buttons)

**Purpose:** Subtle micro-interaction on hover for premium feel

**Passphrase (Right edge):**
```css
box-shadow: inset -3px 0 6px -2px rgba(15, 118, 110, 0)  /* Default */
box-shadow: inset -3px 0 6px -2px rgba(15, 118, 110, 0.6)  /* Hover */
```

**YubiKey (Left edge):**
```css
box-shadow: inset 3px 0 6px -2px rgba(161, 98, 7, 0)  /* Default */
box-shadow: inset 3px 0 6px -2px rgba(161, 98, 7, 0.6)  /* Hover */
```

**Why inset:** Prevents clipping by parent `overflow-hidden`, creates inner glow effect.

### Card Shadows

**Default:**
```css
box-shadow: 0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.08)
```

**Hover:**
```css
box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)
```

**Selected:**
```css
box-shadow: 0 0 0 2px rgba(167, 243, 208, 0.5)  /* Passphrase */
box-shadow: 0 0 0 2px rgba(197, 161, 0, 0.5)  /* YubiKey */
```

---

## 🔗 Links & Interactive Elements

### Link Colors

**Premium Blue Links:**
```css
color: #1D4ED8  /* Default */
color: #1E40AF  /* Hover */
text-decoration: none  /* Default */
text-decoration: underline  /* Hover (optional) */
```

**Used for:**
- Vault count link ("2 vaults")
- Link2 icons

### Copy Indicators

**Visual feedback pattern:**
```tsx
const [isCopied, setIsCopied] = useState(false);

onClick={() => {
  navigator.clipboard.writeText(text);
  setIsCopied(true);
  setTimeout(() => setIsCopied(false), 2000);
}}

// Icon changes from Copy to Check (green) for 2 seconds
```

---

## 📱 Responsive Behavior

### Breakpoints

```css
sm: 640px
md: 768px
lg: 1024px
```

### Grid Layouts

**KeyCard Grid:**
```css
grid-template-columns: 1fr  /* Mobile */
grid-template-columns: repeat(2, 1fr)  /* md: */
grid-template-columns: repeat(3, 1fr)  /* lg: */
gap: 1rem  /* gap-4 */
```

**Create Key Panel:**
```css
grid-template-columns: repeat(2, 1fr)
gap: 1rem  /* gap-4 */
max-width: 32rem  /* max-w-2xl */
margin: 0 auto  /* mx-auto */
```

---

## 🎪 Component-Specific Guidelines

### PageHeader

**Structure:**
```tsx
<header className="bg-white border-b border-slate-200">
  <div className="px-2 h-16 flex items-center justify-between">
    <h1> {/* Title + Icon */} </h1>
    <div> {/* Actions or Vault Badge */} </div>
  </div>
</header>
```

**Title Icon:**
```css
size: h-5 w-5
color: #475569  /* Slate-600 - neutral, not distracting */
```

**Actions Prop:**
Can pass custom React nodes (filters, toggles, buttons) to right side.

### CreateKeyModal

**Card Hover:**
```css
/* Passphrase */
border-color: #B7E1DD  /* Teal */
background: rgba(15, 118, 110, 0.05)  /* Subtle teal tint */

/* YubiKey */
border-color: #E6D8AA  /* Gold */
background: rgba(197, 161, 0, 0.05)  /* Subtle gold tint */
```

**Title Text:**
```css
color: #334155  /* Slate-700 - neutral, no color change on hover */
```

---

## 🎯 Accessibility

### Tooltips

**Style:**
```css
background: #1e293b  /* Slate-800 */
color: #ffffff
padding: 0.25rem 0.5rem  /* px-2 py-1 */
border-radius: 0.25rem  /* rounded */
font-size: 0.75rem  /* text-xs */
white-space: nowrap
z-index: 10
```

**Positioning:**
```css
position: absolute
left: 0
bottom: 100%  /* Above element */
margin-bottom: 0.25rem  /* mb-1 */
opacity: 0  /* Default hidden */
opacity: 100  /* group-hover:opacity-100 */
transition: opacity
pointer-events: none
```

**For YubiKey labels in table:**
Show serial below full label in lighter gray:
```tsx
<div>{keyRef.label}</div>
<div className="mt-0.5 text-slate-300">S/N: {serial}</div>
```

### Button States

**All buttons must have:**
- `disabled` state with reduced opacity (0.5)
- `cursor-not-allowed` when disabled
- Clear hover state (background or color change)
- Meaningful `title` attribute for tooltips

---

## 🎨 Design Principles

### Consistency Rules

1. **Icons match their context:**
   - Passphrase = Key icon
   - YubiKey = Fingerprint icon
   - Same icons across filters, cards, tables, modals

2. **Colors carry meaning:**
   - Teal = Passphrase (software)
   - Gold = YubiKey (hardware)
   - Blue = Primary actions
   - Gray = Secondary actions
   - Red = Critical/Warning states

3. **Borders are subtle:**
   - Use tinted variants of main color (not pure gray)
   - 1px weight
   - Almost invisible until you look closely

4. **Backgrounds are soft:**
   - Use rgba() with low opacity (0.05-0.15)
   - Tinted variants of main color
   - Never pure colors

5. **Spacing is rhythmic:**
   - Content rows: `pt-2` or `py-2`
   - Headers/footers: `py-3` (more breathing room)
   - Consistent `px-5` horizontal padding

### Visual Hierarchy

**Primary → Secondary → Tertiary:**
1. **Primary:** Premium blue buttons (Restore, Vault, + New Key)
2. **Secondary:** Gray outlined buttons (Deactivate, Export)
3. **Tertiary:** Link icons, copy buttons

**Status Priority:**
1. **Critical:** Compromised (red with icon)
2. **Attention:** Inactive (red with clock)
3. **Positive:** Active (teal, no icon)
4. **Neutral:** New (gray with sparkles)

---

## 🚀 Implementation Patterns

### Conditional Rendering

**Show/hide based on key type:**
```tsx
{isPassphrase && <PassphraseOnlyElement />}
{isYubiKey && <YubiKeyOnlyElement />}
```

**Ternary for different values:**
```tsx
style={{
  backgroundColor: isPassphrase ? '#rgba(15, 118, 110, 0.1)' : 'rgba(197, 161, 0, 0.15)'
}}
```

### State Management

**Loading states:**
```tsx
{isLoading ? 'Loading...' : 'Action Text'}
disabled={isLoading}
```

**Copied feedback:**
```tsx
const [isCopied, setIsCopied] = useState(false);
// Show Check icon for 2 seconds, then revert
```

**Filter multi-select:**
```tsx
// Both selected or both unselected = show all
const bothSelected = showPassphraseKeys && showYubiKeyKeys;
const noneSelected = !showPassphraseKeys && !showYubiKeyKeys;
```

---

## 🎨 Color Palette Reference

### Teal (Passphrase)

```css
Deep Teal (Icon/Text): #0F766E
Teal Tint (Background): rgba(15, 118, 110, 0.1)
Light Mint (Border): #B7E1DD
Bright Teal (Active badge border): #99F6E4
Mint (Filter icon - not used): #A7F3D0
```

### Gold (YubiKey)

```css
Dark Gold (Icon/Text): #A16207
Gold Tint (Background): rgba(197, 161, 0, 0.15)
Pale Gold (Border): #E6D8AA
Light Gold (Filter icon - not used): #C5A100
```

### Blue (Primary Actions)

```css
Premium Blue: #1D4ED8
Deeper Blue (Hover): #1E40AF
Light Blue (Hover bg): #dbeafe
```

### Gray (Neutrals)

```css
Slate-50: #f8fafc
Slate-100: #f1f5f9
Slate-200: #e2e8f0
Slate-300: #cbd5e0f
Slate-400: #94a3b8
Slate-500: #64748b
Slate-600: #475569
Slate-700: #334155
Slate-800: #1e293b
```

### Red (Warning/Critical)

```css
Red-700: #B91C1C (Inactive text)
Red-800: #991B1B (Compromised text)
Red Tint 10%: rgba(185, 28, 28, 0.1) (Inactive bg)
Red Tint 15%: rgba(185, 28, 28, 0.15) (Compromised bg)
Soft Red Border: #FCA5A5
Light Red Border: #FECACA
```

---

## 📚 Component Checklist

When creating new components, ensure:

- [ ] Uses correct key type colors (teal for Passphrase, gold for YubiKey)
- [ ] Uses premium blue (#1D4ED8) for primary actions
- [ ] Has proper hover states with color transitions
- [ ] Icons are correct size for context
- [ ] Borders use tinted variants (not pure gray)
- [ ] Backgrounds use rgba() with low opacity
- [ ] Typography uses text-xs or text-sm consistently
- [ ] Spacing follows pt-2/py-2/py-3 pattern
- [ ] Loading states are handled
- [ ] Disabled states have proper styling
- [ ] Tooltips for truncated or disabled elements
- [ ] Accessible (keyboard navigation, ARIA labels)

---

## 🎓 Examples

### Example: Premium Blue Button

```tsx
<button
  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
  style={{ backgroundColor: '#1D4ED8' }}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E40AF'}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
  disabled={isLoading}
>
  {isLoading ? 'Loading...' : 'Button Text'}
</button>
```

### Example: Type Badge

```tsx
<span
  className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
  style={{
    backgroundColor: isPassphrase ? 'rgba(15, 118, 110, 0.1)' : 'rgba(197, 161, 0, 0.15)',
    color: isPassphrase ? '#0F766E' : '#A16207',
    border: `1px solid ${isPassphrase ? '#B7E1DD' : '#E6D8AA'}`,
  }}
>
  {isPassphrase ? 'Passphrase' : 'YubiKey'}
</span>
```

### Example: Icon Container

```tsx
<div
  className="rounded-lg p-2 flex-shrink-0"
  style={{
    backgroundColor: isPassphrase ? 'rgba(15, 118, 110, 0.1)' : 'rgba(197, 161, 0, 0.15)',
    border: isPassphrase ? '1px solid #B7E1DD' : '1px solid #E6D8AA',
  }}
>
  {isPassphrase ? (
    <Key className="h-4 w-4" style={{ color: '#0F766E' }} />
  ) : (
    <Fingerprint className="h-4 w-4" style={{ color: '#A16207' }} />
  )}
</div>
```

---

## 🌓 Dark Mode Considerations

**Current design is dark-mode ready:**

- Deep teal (#0F766E) and dark gold (#A16207) maintain contrast on both light and dark backgrounds
- Navy (#1A2238) and dark gray (#151515) filter buttons work in dark mode
- Avoid pure black (#000000) - use #151515 or darker grays
- All borders use tinted colors (visible in both modes)
- Premium blue (#1D4ED8) has sufficient contrast

**When implementing dark mode:**
- Reverse card backgrounds (dark cards on darker background)
- Keep icon/badge colors the same (they're already dark-mode compatible)
- Adjust borders to lighter variants for visibility
- Use same hover glow effects

---

## 📝 Notes & Rationale

### Why These Colors?

**Teal for Passphrase:**
- Software-centric (mint/teal associated with digital)
- Distinct from hardware gold
- Premium feel (not default green)
- Excellent contrast on white

**Gold for YubiKey:**
- Evokes metallic touch point of real YubiKey device
- Premium, exclusive feeling
- Hardware-centric visual language
- Darker variant (#A16207) improves readability

**Premium Blue (#1D4ED8):**
- Deeper than standard blue-600
- More premium, professional
- Distinct from teal/gold palette
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

## 🎯 Quick Reference

### Most Commonly Used Colors

```css
/* Primary Actions */
#1D4ED8  /* Premium blue */
#1E40AF  /* Premium blue hover */

/* Passphrase */
#0F766E  /* Deep teal */
#B7E1DD  /* Teal border */

/* YubiKey */
#A16207  /* Dark gold */
#E6D8AA  /* Gold border */

/* Neutrals */
#475569  /* Slate-600 (icons, text) */
#64748b  /* Slate-500 (secondary text) */
#94a3b8  /* Slate-400 (muted) */
#e2e8f0  /* Slate-200 (borders) */
#f8fafc  /* Slate-50 (hover backgrounds) */

/* Status */
#0F766E  /* Active (teal) */
#334155  /* New (slate) */
#B91C1C  /* Inactive (red) */
#991B1B  /* Compromised (darker red) */
```

---

## 📋 Implementation Checklist

Before shipping a new feature, verify:

- [ ] **Colors:** Uses premium blue, teal/gold palette
- [ ] **Icons:** Correct icon type and size
- [ ] **Spacing:** Follows pt-2/py-2/py-3 pattern
- [ ] **Borders:** Tinted variants (not pure gray)
- [ ] **Hover states:** Smooth transitions with color changes
- [ ] **Status badges:** Correct colors with icons where appropriate
- [ ] **Typography:** text-xs or text-sm, font-medium
- [ ] **Buttons:** Premium blue (primary) or gray (secondary)
- [ ] **Tooltips:** For truncated or disabled elements
- [ ] **Loading states:** Show feedback during async operations
- [ ] **Accessibility:** ARIA labels, keyboard navigation
- [ ] **Responsive:** Works on mobile, tablet, desktop

---

## 🔄 Version History

### v1.0 (2025-10-16)

**Initial release with:**
- Premium teal/gold theme system
- Status badge colors and icons
- Premium blue for primary actions
- KeyCard redesign (5-row layout)
- KeyTable implementation
- Filter icon toggles
- Deactivation/restore functionality
- Comprehensive color palette
- Hover glow effects
- Consistent spacing system

---

_This style guide ensures visual consistency across the Barqly Vault application. All UI components should follow these specifications for a cohesive, professional appearance._
