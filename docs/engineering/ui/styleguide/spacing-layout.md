# Spacing & Layout

**Version:** 2.0
**Last Updated:** 2025-10-17

---

## Spacing Scale

Barqly Vault uses a consistent spacing rhythm based on Tailwind's spacing scale (0.25rem = 4px units).

### Base Units

| Value | Rem | Pixels | Tailwind Class | Common Usage |
|-------|-----|--------|---------------|--------------|
| 0 | 0 | 0 | `p-0`, `m-0` | Reset spacing |
| 0.5 | 0.125rem | 2px | `p-0.5`, `gap-0.5` | Micro spacing |
| 1 | 0.25rem | 4px | `p-1`, `gap-1` | Tiny gap |
| 1.5 | 0.375rem | 6px | `px-1.5`, `py-1.5` | Code snippets |
| 2 | 0.5rem | 8px | `p-2`, `gap-2` | Icon containers, small gaps |
| 3 | 0.75rem | 12px | `px-3`, `py-3` | Small buttons, footer padding |
| 4 | 1rem | 16px | `p-4`, `gap-4` | Card grid gap, standard padding |
| 5 | 1.25rem | 20px | `px-5`, `py-5` | KeyCard horizontal padding |
| 6 | 1.5rem | 24px | `p-6`, `mt-6` | Modal padding, section margins |
| 8 | 2rem | 32px | `p-8`, `mt-8` | Large section spacing |
| 12 | 3rem | 48px | `p-12` | Extra large spacing (rare) |

### Most Commonly Used

```css
gap-1     /* 4px - Tiny gaps */
gap-1.5   /* 6px - Small gaps */
gap-2     /* 8px - Icon gaps */
gap-3     /* 12px - Button gaps */
gap-4     /* 16px - Card grid gap */

px-2      /* 8px - Small horizontal padding */
px-3      /* 12px - Button horizontal padding */
px-4      /* 16px - Standard padding */
px-5      /* 20px - KeyCard horizontal padding */

py-1.5    /* 6px - Small button vertical padding */
py-2      /* 8px - Content row vertical padding */
py-3      /* 12px - Footer/header vertical padding */

mt-6      /* 24px - Section top margin */
mb-6      /* 24px - Section bottom margin */
```

---

## Container Widths

### App-Level Containers

**AppPrimaryContainer:**
```tsx
<div className="max-w-[960px] mx-auto">
  {/* Main content */}
</div>
```
- Max width: `960px`
- Centered: `mx-auto`

**Usage:** Primary content area for all pages

### Modal Containers

**Standard Modal:**
```tsx
<div className="max-w-2xl mx-auto">
  {/* Modal content */}
</div>
```
- Max width: `32rem` (512px)

**Wide Modal:**
```tsx
<div className="max-w-4xl mx-auto">
  {/* Wide modal content */}
</div>
```
- Max width: `56rem` (896px)

### Create Key Panel

```tsx
<div className="max-w-2xl mx-auto">
  <div className="grid grid-cols-2 gap-4">
    {/* Selection cards */}
  </div>
</div>
```
- Max width: `32rem` (512px)
- Grid: 2 columns
- Gap: `gap-4` (16px)

---

## Component Spacing

### KeyCard

**Row Padding Pattern:**
```tsx
<div className="bg-card border border-default rounded-lg">
  {/* Row 1: Icon + Label */}
  <div className="pt-3 px-5 pb-2">
    {/* Content */}
  </div>

  {/* Row 2: Type Badge + Status Badge */}
  <div className="py-2 px-5">
    {/* Content */}
  </div>

  {/* Row 3: Attachment + Serial */}
  <div className="pt-2 pb-2 px-5">
    {/* Content */}
  </div>

  {/* Row 4: Public Key */}
  <div className="pt-0 pb-2 px-5">
    {/* Content */}
  </div>

  {/* Footer: Action Buttons */}
  <div className="py-3 px-5 border-t border-subtle">
    {/* Buttons */}
  </div>
</div>
```

**Padding Summary:**
- **Horizontal:** Always `px-5` (20px) for alignment
- **Content rows:** `pt-2` or `py-2` (8px vertical)
- **First row:** `pt-3` (12px) for more breathing room at top
- **Footer:** `py-3` (12px) for symmetry with top

**Internal Gaps:**
- Icon to label: `gap-3` (12px)
- Between badges: `gap-2` (8px)
- Between footer buttons: `gap-2` (8px)

---

### PageHeader

```tsx
<header className="bg-card border-b border-default">
  <div className="px-2 h-16 flex items-center justify-between">
    <h1 className="flex items-center gap-2">
      <Icon className="h-5 w-5" />
      Title
    </h1>
    <div>{/* Actions */}</div>
  </div>
</header>
```

**Specifications:**
- Height: `h-16` (64px)
- Horizontal padding: `px-2` (8px)
- Icon to title gap: `gap-2` (8px)
- Layout: Space between

---

### Buttons

**Primary Button:**
```tsx
<button className="flex items-center gap-2 px-4 py-2">
  <Icon className="h-4 w-4" />
  Button Text
</button>
```
- Padding: `px-4 py-2` (16px × 8px)
- Icon gap: `gap-2` (8px)

**Secondary Button (Small):**
```tsx
<button className="flex items-center gap-2 px-3 py-1.5">
  <Icon className="h-3 w-3" />
  Export
</button>
```
- Padding: `px-3 py-1.5` (12px × 6px)
- Icon gap: `gap-2` (8px)

**Button Group:**
```tsx
<div className="flex items-center gap-3">
  <button>{/* Button 1 */}</button>
  <button>{/* Button 2 */}</button>
</div>
```
- Gap between buttons: `gap-3` (12px)

---

### Badges

**Badge Internal Spacing:**
```tsx
<span className="inline-flex items-center gap-1 px-2 py-0.5">
  <Icon className="h-3 w-3" />
  Badge Text
</span>
```
- Padding: `px-2 py-0.5` (8px × 2px)
- Icon gap: `gap-1` (4px)

**Badge in Row:**
```tsx
<div className="flex items-center gap-2">
  <Badge />
  <Badge />
</div>
```
- Gap between badges: `gap-2` (8px)

---

### Tables

**Table Cell Padding:**
```tsx
<thead>
  <tr>
    <th className="py-3 px-4">Header</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td className="py-3 px-4">Cell</td>
  </tr>
</tbody>
```
- Padding: `py-3 px-4` (12px × 16px)

**Table Row Spacing:**
- No gaps between rows
- Border separators: `border-b border-subtle`

---

### Modals

**Modal Padding:**
```tsx
<div className="bg-elevated rounded-lg">
  {/* Header */}
  <div className="p-6 border-b border-subtle">
    <h2>Modal Title</h2>
  </div>

  {/* Body */}
  <div className="p-6">
    {/* Content */}
  </div>

  {/* Footer */}
  <div className="p-6 border-t border-subtle flex gap-3">
    <button>Cancel</button>
    <button>Submit</button>
  </div>
</div>
```
- All sections: `p-6` (24px)
- Footer button gap: `gap-3` (12px)

---

### Forms

**Form Field Spacing:**
```tsx
<div className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-main mb-1.5">
      Key Label
    </label>
    <input className="w-full px-3 py-2" />
  </div>

  <div>
    <label className="block text-sm font-medium text-main mb-1.5">
      Passphrase
    </label>
    <input className="w-full px-3 py-2" />
  </div>
</div>
```
- Between fields: `space-y-4` (16px)
- Label to input: `mb-1.5` (6px)
- Input padding: `px-3 py-2` (12px × 8px)

**Helper Text:**
```tsx
<div>
  <input className="w-full px-3 py-2" />
  <span className="text-xs text-secondary mt-1 block">
    Max 24 characters
  </span>
</div>
```
- Input to helper: `mt-1` (4px)

---

## Grid Layouts

### KeyCard Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <KeyCard />
  <KeyCard />
  <KeyCard />
</div>
```

**Breakpoints:**
- Mobile: 1 column
- Tablet (`md:`): 2 columns
- Desktop (`lg:`): 3 columns
- Gap: `gap-4` (16px)

---

### Create Key Selection Grid

```tsx
<div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
  <SelectionCard />
  <SelectionCard />
</div>
```
- Always 2 columns
- Gap: `gap-4` (16px)
- Max width: `max-w-2xl` (512px)
- Centered: `mx-auto`

---

## Section Spacing

### Page Sections

```tsx
<div className="mt-6 mb-6">
  <h2 className="text-xl font-semibold text-heading mb-4">
    Section Title
  </h2>
  {/* Section content */}
</div>
```
- Section top margin: `mt-6` (24px)
- Section bottom margin: `mb-6` (24px)
- Heading to content: `mb-4` (16px)

### Between Components

```tsx
<div className="space-y-6">
  <Component1 />
  <Component2 />
  <Component3 />
</div>
```
- Use `space-y-6` (24px) for major component spacing

---

## Responsive Spacing

### Padding Adjustments

**Desktop:**
```tsx
<div className="px-8 py-6">
  {/* Content */}
</div>
```

**Tablet:**
```tsx
<div className="px-6 py-4">
  {/* Content */}
</div>
```

**Mobile:**
```tsx
<div className="px-4 py-3">
  {/* Content */}
</div>
```

**Combined (Responsive):**
```tsx
<div className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-6">
  {/* Content */}
</div>
```

---

## Breakpoints

### Tailwind Breakpoints

```css
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Desktops */
xl: 1280px  /* Large desktops */
2xl: 1536px /* Extra large */
```

**Usage in Barqly Vault:**
- Most layouts use `md:` and `lg:` breakpoints
- KeyCard grid: 1 → 2 → 3 columns
- Responsive padding/spacing as needed

---

## Spacing Patterns by Context

### Icon Spacing

| Context | Size | Gap to Text | Example |
|---------|------|-------------|---------|
| PageHeader | `h-5 w-5` | `gap-2` | Title icon |
| Button | `h-4 w-4` | `gap-2` | Button icon |
| Badge | `h-3 w-3` | `gap-1` | Status badge icon |
| Link | `h-3 w-3` | `gap-1` | Vault count link |

### Vertical Rhythm

**Content Rows (Cards, Forms):**
- First row: `pt-3` (extra top padding)
- Middle rows: `py-2` (standard padding)
- Footer: `py-3` (match top padding)

**Sections:**
- Between sections: `mt-6 mb-6` (24px)
- Section title to content: `mb-4` (16px)
- Between components in section: `space-y-4` (16px)

---

## Border Radius

### Standard Radii

| Size | Value | Tailwind Class | Usage |
|------|-------|---------------|-------|
| Small | 0.25rem (4px) | `rounded` | Tooltips, small elements |
| Medium | 0.375rem (6px) | `rounded-md` | Buttons, inputs |
| Large | 0.5rem (8px) | `rounded-lg` | Cards, modals |
| Full | 9999px | `rounded-full` | Badges, pills |

### Component Usage

**Cards:**
```tsx
<div className="rounded-lg">
  Card content
</div>
```
- Border radius: `rounded-lg` (8px)

**Buttons:**
```tsx
<button className="rounded-lg">
  Primary Button
</button>
<button className="rounded-md">
  Secondary Button
</button>
```
- Primary: `rounded-lg` (8px)
- Secondary: `rounded-md` (6px)

**Badges:**
```tsx
<span className="rounded-full">
  Badge
</span>
```
- Border radius: `rounded-full` (pill shape)

**Inputs:**
```tsx
<input className="rounded-md" />
```
- Border radius: `rounded-md` (6px)

**Icon Containers:**
```tsx
<div className="rounded-lg p-2">
  <Icon />
</div>
```
- Border radius: `rounded-lg` (8px)

---

## Z-Index Layers

### Layer System

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Base | 0 | Default layer |
| Tooltips | 10 | Tooltips, popovers |
| Sticky Headers | 20 | Fixed/sticky elements |
| Overlay | 40 | Modal overlays |
| Modal | 50 | Modal dialogs |
| Notifications | 60 | Toast notifications |

### Implementation

**Tooltip:**
```tsx
<div className="z-10">
  Tooltip content
</div>
```

**Modal Overlay:**
```tsx
<div className="fixed inset-0 z-40 bg-black/50">
  {/* Overlay */}
</div>
```

**Modal Content:**
```tsx
<div className="z-50">
  {/* Modal dialog */}
</div>
```

---

## Flexbox Patterns

### Common Layouts

**Horizontal Stack:**
```tsx
<div className="flex items-center gap-2">
  <Item1 />
  <Item2 />
</div>
```

**Vertical Stack:**
```tsx
<div className="flex flex-col gap-4">
  <Item1 />
  <Item2 />
</div>
```

**Space Between:**
```tsx
<div className="flex items-center justify-between">
  <Left />
  <Right />
</div>
```

**Centered:**
```tsx
<div className="flex items-center justify-center">
  <Centered />
</div>
```

**Wrapping:**
```tsx
<div className="flex flex-wrap gap-2">
  <Badge />
  <Badge />
  <Badge />
</div>
```

---

## Best Practices

### DO
- ✅ Use consistent spacing scale (`gap-2`, `gap-3`, `gap-4`)
- ✅ Follow vertical rhythm (`pt-3`, `py-2`, `py-3`)
- ✅ Use `px-5` for KeyCard horizontal consistency
- ✅ Add `space-y-6` between major sections
- ✅ Use flexbox for component layout
- ✅ Apply responsive spacing (`px-4 md:px-6 lg:px-8`)

### DON'T
- ❌ Use arbitrary values unless absolutely necessary
- ❌ Mix different spacing patterns in similar contexts
- ❌ Forget responsive adjustments for mobile
- ❌ Use inline padding/margin styles (use Tailwind classes)
- ❌ Overcomplicate with excessive nesting

---

## Spacing Checklist

When spacing components:

- [ ] Follow vertical rhythm pattern (`pt-3`, `py-2`, `py-3`)
- [ ] Use consistent horizontal padding (`px-5` for cards)
- [ ] Apply appropriate gaps (`gap-2` for icons, `gap-3` for buttons)
- [ ] Add section margins (`mt-6 mb-6`)
- [ ] Test responsive behavior
- [ ] Verify alignment across components
- [ ] Check breathing room (not too tight, not too loose)

---

**See Also:**
- [Components](./components.md) - Component structure
- [Typography](./typography.md) - Text spacing
- [Accessibility](./accessibility.md) - Touch target sizes
