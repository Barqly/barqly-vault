# Components

**Version:** 2.0
**Last Updated:** 2025-10-17

---

## Buttons

### Primary Buttons (Premium Blue)

**Usage:** Primary CTAs, main actions

**Specifications:**
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

**States:**
- **Default:** `#1D4ED8` background, white text
- **Hover:** `#1E40AF` background (deeper blue)
- **Disabled:** `opacity-50`, `cursor-not-allowed`

**Elements using primary style:**
- "+ New Key" button
- "Restore" button
- "Vault" button
- Modal submit buttons
- Navigation active state

**Why inline styles?** Tailwind v4 has issues with hover classes on CSS variables. Use `onMouseEnter`/`onMouseLeave` pattern.

---

### Secondary Buttons (Gray Outline)

**Usage:** Secondary actions, destructive actions, cancel

**Specifications:**
```tsx
import { useThemeColors } from '@/contexts/ThemeContext';

const SecondaryButton = () => {
  const colors = useThemeColors();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors"
      style={{
        backgroundColor: isHovered ? colors.surface.hover : 'transparent',
        borderColor: colors.border.default,
        color: colors.text.secondary,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isDisabled}
    >
      Button Text
    </button>
  );
};
```

**States:**
- **Default:** Transparent background, slate-600 text, slate-300 border
- **Hover:** Slate-50 background (light), slate-700 (dark)
- **Disabled:** Slate-400 text, `opacity-50`, `cursor-not-allowed`

**Elements using secondary style:**
- "Deactivate" button
- "Export" button
- "Cancel" buttons
- KeyCard action buttons

**Sizes:**
- Small: `px-3 py-1.5 text-xs` (KeyCard)
- Standard: `px-4 py-2 text-sm`

---

### Toggle Buttons

#### Grid/List Toggle

**Container:**
```tsx
<div className="flex border border-default rounded-lg overflow-hidden">
  <button>{/* Grid */}</button>
  <button>{/* List */}</button>
</div>
```

**Active State:**
```tsx
<button
  className="p-2 transition-colors"
  style={{ backgroundColor: '#1D4ED8' }}
>
  <Grid className="h-4 w-4" style={{ color: '#ffffff' }} />
</button>
```
- Background: `#1D4ED8` (premium blue)
- Icon: White

**Inactive State:**
```tsx
<button className="p-2 bg-card hover:bg-hover transition-colors">
  <List className="h-4 w-4 text-secondary" />
</button>
```
- Background: Card color
- Hover: Hover surface
- Icon: Secondary text color

---

#### Filter Toggles (Passphrase/YubiKey)

**Passphrase Filter (Active):**
```tsx
<button
  className="relative px-4 py-2 rounded-lg transition-all"
  style={{
    backgroundColor: '#1A2238',
    border: '1px solid #2C3E50',
    boxShadow: isHovered ? 'inset -3px 0 6px -2px rgba(15, 118, 110, 0.6)' : 'none',
  }}
>
  <Key className="h-4 w-4" style={{ color: '#13897F' }} />
</button>
```
- Background: `#1A2238` (navy)
- Border: `#2C3E50` (lighter navy)
- Icon: `#13897F` (teal)
- Hover glow: Right edge, teal

**YubiKey Filter (Active):**
```tsx
<button
  className="relative px-4 py-2 rounded-lg transition-all"
  style={{
    backgroundColor: '#1E1E1E',
    border: '1px solid #2C2C2C',
    boxShadow: isHovered ? 'inset 3px 0 6px -2px rgba(255, 138, 0, 0.6)' : 'none',
  }}
>
  <Fingerprint className="h-4 w-4" style={{ color: '#ff8a00' }} />
</button>
```
- Background: `#1E1E1E` (dark gray)
- Border: `#2C2C2C` (subtle gray)
- Icon: `#ff8a00` (vibrant orange - needed on dark bg)
- Hover glow: Left edge, orange

**Inactive State (Both):**
```tsx
<button className="px-4 py-2 bg-card hover:bg-hover rounded-lg border border-default transition-colors">
  <Icon className="h-4 w-4 text-muted" />
</button>
```

---

## Badges

### Type Badges (Passphrase/YubiKey)

**Passphrase:**
```tsx
<span
  className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
  style={{
    backgroundColor: 'rgba(15, 118, 110, 0.1)',
    color: '#13897F',
    border: '1px solid #B7E1DD',
  }}
>
  Passphrase
</span>
```

**YubiKey:**
```tsx
<span
  className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
  style={{
    backgroundColor: 'rgba(249, 139, 28, 0.08)',
    color: '#F98B1C',
    border: '1px solid #ffd4a3',
  }}
>
  YubiKey
</span>
```

**Common Structure:**
- Shape: `rounded-full`
- Padding: `px-2 py-0.5`
- Text: `text-xs font-medium`
- Border: 1px solid, tinted color

---

### Status Badges

**Active:**
```tsx
<span
  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
  style={{
    backgroundColor: 'rgba(15, 118, 110, 0.1)',
    color: '#13897F',
    border: '1px solid #99F6E4',
  }}
>
  Active
</span>
```
- No icon
- Teal color (matches Passphrase)

**New:**
```tsx
<span
  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-elevated border border-subtle"
  style={{
    color: effectiveTheme === 'dark' ? '#CBD5E1' : '#334155',
  }}
>
  <Sparkles className="h-3 w-3" />
  New
</span>
```
- Sparkles icon (✨)
- Neutral gray (toned down in dark mode)

**Inactive:**
```tsx
<span
  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
  style={{
    backgroundColor: 'rgba(185, 28, 28, 0.1)',
    color: '#B91C1C',
    border: '1px solid #FCA5A5',
  }}
>
  <Clock className="h-3 w-3" />
  Inactive {daysRemaining}d
</span>
```
- Clock icon (⏳)
- Red color
- Shows days remaining

**Compromised:**
```tsx
<span
  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
  style={{
    backgroundColor: 'rgba(185, 28, 28, 0.15)',
    color: '#991B1B',
    border: '1px solid #FCA5A5',
  }}
>
  <AlertTriangle className="h-3 w-3" />
  Compromised
</span>
```
- Alert icon (⚠️)
- Darker red than Inactive

---

## Cards

### KeyCard Structure

**Container:**
```tsx
<div
  className="bg-card border border-default rounded-lg shadow-sm hover:shadow-lg transition-all"
  style={{
    border: isSelected ? `2px solid ${borderColor}` : undefined,
    boxShadow: isSelected ? `0 0 0 2px ${glowColor}` : undefined,
  }}
>
  {/* Rows */}
</div>
```

**Shadow States:**
- **Default:** `shadow-sm` (subtle elevation)
- **Hover:** `shadow-lg` (lifted feel)
- **Selected:** `shadow-lg` + colored ring

**Selected Border Colors:**
- Passphrase: `#A7F3D0` border, `rgba(167, 243, 208, 0.5)` glow
- YubiKey: `#C5A100` border, `rgba(197, 161, 0, 0.5)` glow

---

### KeyCard Rows

**Row 1: Icon + Label**
```tsx
<div className="pt-3 px-5 pb-2 flex items-center gap-3">
  <div
    className="rounded-lg p-2 flex-shrink-0"
    style={{
      backgroundColor: isPassphrase ? 'rgba(15, 118, 110, 0.1)' : 'rgba(249, 139, 28, 0.08)',
      border: isPassphrase ? '1px solid #B7E1DD' : '1px solid #ffd4a3',
    }}
  >
    <Icon className="h-4 w-4" style={{ color: iconColor }} />
  </div>
  <span className="text-base font-semibold text-main truncate">
    {keyRef.label}
  </span>
</div>
```
- Padding: `pt-3 px-5 pb-2`
- Icon: `h-4 w-4` in rounded container
- Label: `text-base font-semibold`

**Row 2: Type Badge + Status Badge**
```tsx
<div className="py-2 px-5 flex items-center justify-between">
  <TypeBadge />
  <StatusBadge />
</div>
```
- Padding: `py-2 px-5`
- Layout: Space between

**Row 3: Attachment Status + Serial**
```tsx
<div className="pt-2 pb-2 px-5 flex items-center justify-content-between">
  <span className="text-xs font-medium text-secondary">
    {vaultCount} {vaultCount === 1 ? 'vault' : 'vaults'}
  </span>
  {isYubiKey && (
    <span className="text-xs text-muted">S/N: {serial}</span>
  )}
</div>
```
- Padding: `pt-2 pb-2 px-5`

**Row 4: Public Key**
```tsx
<div className="pt-0 pb-2 px-5 flex items-center gap-1">
  <code className="font-mono text-xs text-secondary truncate">
    {truncatedPublicKey}
  </code>
  <CopyButton />
</div>
```
- Padding: `pt-0 pb-2 px-5`
- Monospace font for public key

**Footer: Action Buttons**
```tsx
<div className="py-3 px-5 border-t border-subtle flex items-center justify-between gap-2">
  <button>{/* Left action */}</button>
  <button>{/* Right action */}</button>
</div>
```
- Padding: `py-3 px-5`
- Border top: `border-subtle`
- Layout: Space between

---

### Card Hover Effects

**Basic Card:**
```css
box-shadow: 0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.08)  /* Default */
box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)  /* Hover */
```

**Selection Card (CreateKeyModal):**
```tsx
<button
  className="border border-default rounded-lg p-6 hover:bg-elevated transition-all"
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
  style={{
    borderColor: isHovered ? (isPassphrase ? '#B7E1DD' : '#ffd4a3') : colors.border.default,
    backgroundColor: isHovered ? (isPassphrase ? 'rgba(15, 118, 110, 0.05)' : 'rgba(249, 139, 28, 0.05)') : 'transparent',
  }}
>
  {/* Content */}
</button>
```
- Border changes to tinted color
- Background gets subtle tint

---

## Icon Containers

### KeyCard Icons (Row 1)

**Passphrase:**
```tsx
<div
  className="rounded-lg p-2 flex-shrink-0"
  style={{
    backgroundColor: 'rgba(15, 118, 110, 0.1)',
    border: '1px solid #B7E1DD',
  }}
>
  <Key className="h-4 w-4" style={{ color: '#13897F' }} />
</div>
```

**YubiKey:**
```tsx
<div
  className="rounded-lg p-2 flex-shrink-0"
  style={{
    backgroundColor: 'rgba(249, 139, 28, 0.08)',
    border: '1px solid #ffd4a3',
  }}
>
  <Fingerprint className="h-4 w-4" style={{ color: '#F98B1C' }} />
</div>
```

**Specifications:**
- Border radius: `rounded-lg`
- Padding: `p-2`
- Icon size: `h-4 w-4`
- Background: 10% (Passphrase) or 8% (YubiKey) opacity
- Border: Tinted color

---

### Modal/Empty State Icons (Large)

**Passphrase:**
```tsx
<div
  className="rounded-lg p-3"
  style={{
    backgroundColor: 'rgba(15, 118, 110, 0.1)',
    border: '1px solid #B7E1DD',
  }}
>
  <Key className="h-12 w-12" style={{ color: '#13897F' }} />
</div>
```

**YubiKey:**
```tsx
<div
  className="rounded-lg p-3"
  style={{
    backgroundColor: 'rgba(249, 139, 28, 0.08)',
    border: '1px solid #ffd4a3',
  }}
>
  <Fingerprint className="h-12 w-12" style={{ color: '#F98B1C' }} />
</div>
```

**Specifications:**
- Padding: `p-3`
- Icon size: `h-12 w-12`
- Same colors as small variant

---

## Tables

### Table Structure

**Container:**
```tsx
<div className="bg-card border border-default rounded-lg overflow-hidden">
  <table className="w-full">
    {/* Content */}
  </table>
</div>
```

**Header:**
```tsx
<thead className="bg-elevated border-b border-default">
  <tr>
    <th className="py-3 px-4 text-xs font-medium text-secondary text-left">
      Key
    </th>
    {/* More headers */}
  </tr>
</thead>
```
- Background: `bg-elevated`
- Border bottom: `border-default`
- Padding: `py-3 px-4`
- Text: `text-xs font-medium text-secondary`

**Rows:**
```tsx
<tbody>
  <tr className="border-b border-subtle hover:bg-hover transition-colors">
    <td className="py-3 px-4 text-xs font-medium text-main">
      Cell content
    </td>
  </tr>
</tbody>
```
- Border bottom: `border-subtle`
- Hover: `bg-hover`
- Padding: `py-3 px-4`
- Text: `text-xs font-medium`

**Column Alignment:**
- Content columns: `text-left`
- Action column header: `text-center`
- Action column cells: Flex centered

**No alternating row colors** - Clean, modern appearance

---

## Modals & Dialogs

### Modal Overlay

```tsx
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40">
  {/* Modal content */}
</div>
```
- Background: Black at 50% opacity
- Backdrop blur: `backdrop-blur-sm`
- Z-index: 40

### Modal Content

```tsx
<div className="bg-elevated border border-default rounded-lg shadow-xl max-w-2xl z-50">
  {/* Header, Body, Footer */}
</div>
```
- Background: `bg-elevated`
- Border: `border-default`
- Border radius: `rounded-lg`
- Shadow: `shadow-xl`
- Z-index: 50

### Modal Header

```tsx
<div className="p-6 border-b border-subtle flex justify-between items-center">
  <h2 className="text-xl font-semibold text-heading">Modal Title</h2>
  <button className="text-secondary hover:text-main">
    <X className="h-5 w-5" />
  </button>
</div>
```
- Padding: `p-6`
- Border bottom: `border-subtle`
- Layout: Space between

### Modal Body

```tsx
<div className="p-6">
  {/* Content */}
</div>
```
- Padding: `p-6`

### Modal Footer

```tsx
<div className="p-6 border-t border-subtle flex justify-end gap-3">
  <button>{/* Cancel */}</button>
  <button>{/* Submit */}</button>
</div>
```
- Padding: `p-6`
- Border top: `border-subtle`
- Layout: Right-aligned with gap

---

## Navigation (Sidebar)

### Navigation Items

**Active State:**
```tsx
<button
  className="w-full flex items-center gap-3 py-3 px-3 rounded-lg transition-colors"
  style={{ backgroundColor: '#1D4ED8' }}
>
  <Icon className="h-5 w-5" style={{ color: '#ffffff' }} />
  <span className="text-sm font-medium" style={{ color: '#ffffff' }}>
    Manage Keys
  </span>
  <span
    className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full"
    style={{ backgroundColor: '#1E40AF', color: '#ffffff' }}
  >
    12
  </span>
</button>
```
- Background: `#1D4ED8` (premium blue)
- Icon & text: White
- Badge: `#1E40AF` background (deeper blue)

**Inactive State:**
```tsx
<button className="w-full flex items-center gap-3 py-3 px-3 rounded-lg bg-transparent hover:bg-hover transition-colors">
  <Icon className="h-5 w-5 text-muted" />
  <span className="text-sm font-medium text-secondary">
    Vaults
  </span>
</button>
```
- Background: Transparent
- Hover: `bg-hover`
- Icon: `text-muted`
- Text: `text-secondary`

---

## Form Elements

### Text Input

```tsx
<input
  className="w-full px-3 py-2 text-sm bg-input text-main border border-default rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
  type="text"
  placeholder="Enter key label"
/>
```
- Background: `bg-input`
- Text: `text-main`
- Border: `border-default`
- Focus ring: `focus:ring-2 focus:ring-blue-300`

### Password Input (with Toggle)

```tsx
<div className="relative">
  <input
    type={showPassword ? 'text' : 'password'}
    className="w-full px-3 py-2 pr-10 text-sm bg-input text-main border border-default rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
  />
  <button
    type="button"
    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
    tabIndex={-1}
    onClick={() => setShowPassword(!showPassword)}
  >
    <Eye className="h-4 w-4" />
  </button>
</div>
```
- Eye icon: `h-4 w-4`
- Position: Absolute right
- Tab index: -1 (skip in tab order)

### Select Dropdown

```tsx
<select className="w-full px-3 py-2 text-sm bg-input text-main border border-default rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

### Error State

```tsx
<input
  className="w-full px-3 py-2 text-sm bg-input text-main border-2 border-red-500 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300"
  aria-invalid="true"
  aria-describedby="error-message"
/>
<span id="error-message" className="text-xs text-red-600">
  This field is required
</span>
```
- Border: `border-2 border-red-500`
- Focus ring: `focus:ring-red-300`
- Error message: `text-xs text-red-600`

---

## Interactive Elements

### Copy Button

```tsx
const [isCopied, setIsCopied] = useState(false);

<button
  className="flex-shrink-0 hover:text-secondary transition-colors"
  style={{ color: isCopied ? '#16a34a' : '#94a3b8' }}
  onClick={() => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }}
>
  {isCopied ? (
    <Check className="h-3 w-3" />
  ) : (
    <Copy className="h-3 w-3" />
  )}
</button>
```
- Default: Slate-400 (#94a3b8)
- Hover: Slate-600 (#64748b)
- Copied: Green-600 (#16a34a)
- Icon changes from Copy to Check for 2 seconds

### Link Button

```tsx
<button
  className="flex items-center gap-1 text-xs font-medium hover:underline"
  style={{ color: '#1D4ED8' }}
>
  <Link2 className="h-3 w-3" />
  2 vaults
</button>
```
- Color: `#1D4ED8` (premium blue)
- Hover: Underline
- Icon: `h-3 w-3`

---

## Tooltips

### Tooltip Structure

```tsx
<div className="group relative">
  <button>Hover me</button>
  <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block pointer-events-none z-10">
    <div className="bg-slate-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
      Tooltip text
    </div>
  </div>
</div>
```

**Styling:**
- Background: `bg-slate-800` (dark in both themes)
- Text: `text-white`
- Padding: `px-2 py-1`
- Border radius: `rounded`
- Size: `text-xs`
- White space: `whitespace-nowrap`
- Z-index: 10

**Positioning:**
- Position: `absolute`
- Bottom: `100%` (above element)
- Margin: `mb-1`
- Hidden by default, shown on group hover

---

## Component Checklist

When creating components:

- [ ] Uses theme-aware utilities (`bg-card`, `text-main`, `border-default`)
- [ ] Has proper hover states
- [ ] Icons are correct size
- [ ] Loading states handled
- [ ] Disabled states styled properly
- [ ] Tooltips for truncated/disabled elements
- [ ] Keyboard accessible
- [ ] Tested in light and dark modes
- [ ] Follows spacing rhythm (see [Spacing & Layout](./spacing-layout.md))

---

**See Also:**
- [Color System](./color-system.md) - Color usage
- [Dark Mode](./dark-mode.md) - Theme implementation
- [Typography](./typography.md) - Text styling
- [Spacing & Layout](./spacing-layout.md) - Spacing patterns
- [Accessibility](./accessibility.md) - Accessible components
