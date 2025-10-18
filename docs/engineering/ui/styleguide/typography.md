# Typography

**Version:** 2.0
**Last Updated:** 2025-10-17

---

## Text Sizes & Hierarchy

### Size Scale

| Element | Size | Tailwind Class | Weight | Usage |
|---------|------|---------------|--------|-------|
| Page Title | `1.5rem` (24px) | `text-2xl` | 600 (semibold) | PageHeader title |
| Section Heading | `1.25rem` (20px) | `text-xl` | 600 (semibold) | Section headers |
| Subheading | `1.125rem` (18px) | `text-lg` | 600 (semibold) | Card headings |
| Body Large | `1rem` (16px) | `text-base` | 400 (normal) | Primary content |
| Body Default | `0.875rem` (14px) | `text-sm` | 400 (normal) | Default body text |
| Body Small | `0.75rem` (12px) | `text-xs` | 500 (medium) | Labels, badges, secondary |
| Caption | `0.625rem` (10px) | `text-[10px]` | 400 (normal) | Metadata (rare) |

### Weight Scale

| Weight | Tailwind Class | Usage |
|--------|---------------|-------|
| 400 (normal) | `font-normal` | Body text, descriptions |
| 500 (medium) | `font-medium` | Buttons, labels, badges, emphasis |
| 600 (semibold) | `font-semibold` | Headings, key labels |
| 700 (bold) | `font-bold` | Strong emphasis (rare) |

---

## Component Typography

### PageHeader

**Title:**
```tsx
<h1 className="text-2xl font-semibold text-heading flex items-center gap-2">
  <IconComponent className="h-5 w-5 text-secondary" />
  Manage Keys
</h1>
```

**Specifications:**
- Size: `text-2xl` (24px)
- Weight: `font-semibold` (600)
- Color: `text-heading` (brand gray light mode, white dark mode)
- Icon: `h-5 w-5` at `text-secondary`

### KeyCard

**Label (Row 1):**
```tsx
<span className="text-base font-semibold text-main truncate">
  {keyRef.label}
</span>
```
- Size: `text-base` (16px)
- Weight: `font-semibold` (600)
- Color: `text-main` (slate-800 light, slate-50 dark)
- Truncation: Applied via `truncate` class

**Body Text (Rows 2-4):**
```tsx
<span className="text-xs font-medium text-secondary">
  2 vaults
</span>
```
- Size: `text-xs` (12px)
- Weight: `font-medium` (500)
- Color: `text-secondary` (slate-500 light, slate-400 dark)

### Badges

**Type Badge (Passphrase/YubiKey):**
```tsx
<span className="text-xs font-medium">
  Passphrase
</span>
```
- Size: `text-xs` (12px)
- Weight: `font-medium` (500)
- Color: Varies by type (teal/orange)

**Status Badge:**
```tsx
<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium">
  <Icon className="h-3 w-3" />
  Active
</span>
```
- Size: `text-xs` (12px)
- Weight: `font-medium` (500)
- Color: Varies by status

### Buttons

**Primary Button:**
```tsx
<button className="text-sm font-medium text-white">
  + New Key
</button>
```
- Size: `text-sm` (14px)
- Weight: `font-medium` (500)
- Color: `text-white`

**Secondary Button:**
```tsx
<button className="text-xs font-medium text-secondary">
  Export
</button>
```
- Size: `text-xs` (12px) for small buttons, `text-sm` for standard
- Weight: `font-medium` (500)
- Color: `text-secondary`

### Table

**Header:**
```tsx
<th className="text-xs font-medium text-secondary text-left">
  Key
</th>
```
- Size: `text-xs` (12px)
- Weight: `font-medium` (500)
- Color: `text-secondary`
- Alignment: Left for content, center for actions

**Cell:**
```tsx
<td className="text-xs font-medium text-main">
  My Passphrase Key
</td>
```
- Size: `text-xs` (12px)
- Weight: `font-medium` (500)
- Color: `text-main` for primary content, `text-secondary` for metadata

### Modal Dialog

**Title:**
```tsx
<h2 className="text-xl font-semibold text-heading">
  Create New Key
</h2>
```
- Size: `text-xl` (20px)
- Weight: `font-semibold` (600)
- Color: `text-heading`

**Body:**
```tsx
<p className="text-sm text-main">
  Choose the type of key you want to create.
</p>
```
- Size: `text-sm` (14px)
- Weight: `font-normal` (400)
- Color: `text-main`

### Form Labels

**Input Label:**
```tsx
<label className="text-sm font-medium text-main">
  Key Label
</label>
```
- Size: `text-sm` (14px)
- Weight: `font-medium` (500)
- Color: `text-main`

**Helper Text:**
```tsx
<span className="text-xs text-secondary">
  Max 24 characters
</span>
```
- Size: `text-xs` (12px)
- Weight: `font-normal` (400)
- Color: `text-secondary`

**Error Message:**
```tsx
<span className="text-xs text-red-600">
  This field is required
</span>
```
- Size: `text-xs` (12px)
- Weight: `font-normal` (400)
- Color: `text-red-600`

---

## Label Truncation

### Maximum Length
**Backend validation:** 24 characters max

### Truncation Rule
```tsx
const displayLabel = keyRef.label.length > 24
  ? keyRef.label.slice(0, 24) + '...'
  : keyRef.label;
```

### Tooltip Behavior

**KeyCard:**
```tsx
<div className="group relative">
  <span className="truncate">{displayLabel}</span>
  {keyRef.label.length > 24 && (
    <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block">
      <div className="bg-slate-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
        {keyRef.label}
        {isYubiKey && (
          <div className="text-slate-300 mt-0.5">S/N: {serial}</div>
        )}
      </div>
    </div>
  )}
</div>
```

**YubiKey Tooltip Format:**
```
Full Label Here That's Very Long
S/N: 12345678
```

**Tooltip Styling:**
- Background: `bg-slate-800` (dark in both themes)
- Text: `text-white`
- Padding: `px-2 py-1`
- Border radius: `rounded`
- Size: `text-xs`
- White space: `whitespace-nowrap`

---

## Line Height

### Default Line Heights (Tailwind)
```css
text-xs:   1rem (16px)    /* 1.5 ratio */
text-sm:   1.25rem (20px) /* ~1.43 ratio */
text-base: 1.5rem (24px)  /* 1.5 ratio */
text-lg:   1.75rem (28px) /* ~1.56 ratio */
text-xl:   1.75rem (28px) /* 1.4 ratio */
text-2xl:  2rem (32px)    /* ~1.33 ratio */
```

### Custom Line Heights (When Needed)

**Tight (headings):**
```tsx
<h1 className="leading-tight">
  Page Title
</h1>
```
- `leading-tight` = 1.25

**Normal (body):**
```tsx
<p className="leading-normal">
  Body text here.
</p>
```
- `leading-normal` = 1.5

**Relaxed (long-form):**
```tsx
<p className="leading-relaxed">
  Long description or help text.
</p>
```
- `leading-relaxed` = 1.625

---

## Text Colors (Theme-Aware)

### Hierarchy

1. **Primary Text** (`text-main`)
   - Body text, primary labels
   - Slate-800 (light mode), Slate-50 (dark mode)

2. **Secondary Text** (`text-secondary`)
   - Secondary labels, metadata
   - Slate-500 (light mode), Slate-400 (dark mode)

3. **Muted Text** (`text-muted`)
   - Placeholders, disabled states
   - Slate-400 (light mode), Slate-500 (dark mode)

4. **Heading Text** (`text-heading`)
   - Page titles, section headings
   - Brand gray #565555 (light mode), White (dark mode)

### Semantic Colors

**Link Text:**
```tsx
<a className="text-blue-700 hover:text-blue-800">
  View details
</a>
```

**Success Text:**
```tsx
<span className="text-teal-600">
  Key created successfully
</span>
```

**Error Text:**
```tsx
<span className="text-red-600">
  Invalid input
</span>
```

**Warning Text:**
```tsx
<span className="text-yellow-600">
  Action required
</span>
```

---

## Text Alignment

### Standard Alignment

**Left (default):**
```tsx
<p className="text-left">
  Left-aligned text
</p>
```

**Center:**
```tsx
<h2 className="text-center">
  Centered heading
</h2>
```

**Right:**
```tsx
<div className="text-right">
  Right-aligned content
</div>
```

### Table Alignment

**Headers:**
- Content columns: `text-left`
- Action columns: `text-center`

**Cells:**
- Content: `text-left`
- Actions: Centered via flex containers

---

## Text Transform

**Uppercase (rare):**
```tsx
<span className="uppercase text-xs tracking-wide">
  Section Label
</span>
```
- Use sparingly for section labels
- Pair with `tracking-wide` (0.05em letter spacing)

**Capitalize:**
```tsx
<span className="capitalize">
  key label
</span>
```
- Capitalizes first letter of each word
- Useful for user input normalization

**Normal case (default):**
- Preserve user input as-is for key labels

---

## Special Typography Patterns

### Monospace (Public Keys, Serials)

```tsx
<code className="font-mono text-xs text-secondary bg-slate-100 px-1.5 py-0.5 rounded">
  npub1abc...xyz
</code>
```

**Specifications:**
- Font: `font-mono` (system monospace)
- Size: `text-xs` (12px)
- Color: `text-secondary`
- Background: `bg-slate-100` (light mode), `bg-slate-700` (dark mode)
- Padding: `px-1.5 py-0.5`
- Border radius: `rounded`

### Truncated Text with Ellipsis

**Single line:**
```tsx
<span className="truncate">
  Very long text that will be truncated
</span>
```

**Multi-line (3 lines):**
```tsx
<p className="line-clamp-3">
  Long description that will be clamped to 3 lines with an ellipsis at the end.
</p>
```

### Number Formatting

**Vault count:**
```tsx
<span className="text-xs font-medium text-secondary">
  {vaultCount} {vaultCount === 1 ? 'vault' : 'vaults'}
</span>
```

**Days remaining:**
```tsx
<span className="text-xs font-medium text-red-700">
  Inactive {daysRemaining}d
</span>
```

---

## Accessibility

### Contrast Ratios

All text must meet WCAG AA standards:

**Normal text (< 18px):**
- Minimum contrast: 4.5:1

**Large text (≥ 18px or ≥ 14px bold):**
- Minimum contrast: 3:1

### Verified Combinations

✅ **text-main on bg-card:** 15.4:1 (light), 13.1:1 (dark)
✅ **text-secondary on bg-card:** 7.8:1 (light), 5.2:1 (dark)
✅ **text-muted on bg-card:** 4.6:1 (light), 3.1:1 (dark, large only)
✅ **Premium blue on white:** 8.2:1
✅ **Teal on white:** 5.1:1
✅ **Orange on white:** 4.8:1

### Font Size Minimums

- **Never go below 12px** (`text-xs`) for body text
- **Use 14px** (`text-sm`) for primary content when possible
- **10px allowed only** for non-essential metadata (rare)

---

## Implementation Checklist

When styling text:

- [ ] Choose appropriate size from scale (`text-xs` to `text-2xl`)
- [ ] Set weight (`font-medium` for emphasis, `font-semibold` for headings)
- [ ] Use theme-aware color (`text-main`, `text-secondary`, `text-muted`)
- [ ] Add truncation if text may overflow (`truncate` or `line-clamp-N`)
- [ ] Include tooltip if truncated
- [ ] Verify contrast ratio (WCAG AA minimum)
- [ ] Test in both light and dark modes

---

**See Also:**
- [Color System](./color-system.md) - Text color tokens
- [Dark Mode](./dark-mode.md) - Theme-aware text colors
- [Accessibility](./accessibility.md) - Contrast requirements
- [Components](./components.md) - Component-specific typography
