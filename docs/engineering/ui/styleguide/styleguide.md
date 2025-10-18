# Barqly Vault UI Style Guide

**Version:** 2.0
**Date:** 2025-10-17
**Status:** Production-Ready

---

## Overview

This is the comprehensive visual design system for Barqly Vault. The styleguide ensures consistent UI implementation across the application with a premium, professional feel.

**What's New in v2.0:**
- Complete dark mode implementation with theme context
- RGB-based design token system
- Semantic utility classes for theme-aware styling
- Enhanced documentation structure (modular approach)

---

## Quick Navigation

### 🎨 [Color System](./color-system.md)
Complete color palette, brand colors, status colors, and semantic usage.

**Key Topics:**
- Brand vs. functional color philosophy
- Key type visual identity (Passphrase teal, YubiKey orange)
- Status badge colors (Active, New, Inactive, Compromised)
- Theme-aware neutral grays
- Color rationale and design principles

**Quick Reference:**
```css
/* Primary Actions */
#1D4ED8  /* Premium blue */
#1E40AF  /* Premium blue hover */

/* Passphrase */
#13897F  /* Brighter teal */

/* YubiKey */
#F98B1C  /* Softer orange */
```

---

### 🌓 [Dark Mode System](./dark-mode.md)
Theme implementation with light/dark/system modes.

**Key Topics:**
- Design tokens (`tokens.css`) and semantic utilities (`theme.css`)
- ThemeContext API (`useTheme`, `useThemeColors`)
- CSS variables and RGB format
- Migration patterns (bg-white → bg-card, text-slate-800 → text-main)
- Logo switching (light/dark SVG variants)
- Button hover pattern with inline styles

**Quick Start:**
```tsx
import { useTheme, useThemeColors } from '@/contexts/ThemeContext';

// Get theme state
const { theme, setTheme, effectiveTheme } = useTheme();

// Get theme-aware colors for inline styles
const colors = useThemeColors();
```

---

### 📝 [Typography](./typography.md)
Text sizes, weights, hierarchy, and truncation patterns.

**Key Topics:**
- Size scale (text-xs to text-2xl)
- Weight scale (font-normal to font-bold)
- Component typography (PageHeader, KeyCard, Badges, Buttons, Tables)
- Label truncation (24 character max)
- Theme-aware text colors
- Contrast ratios and accessibility

**Quick Reference:**
```tsx
/* Page Title */
<h1 className="text-2xl font-semibold text-heading">

/* Body Text */
<p className="text-sm text-main">

/* Labels */
<span className="text-xs font-medium text-secondary">
```

---

### 🧩 [Components](./components.md)
Button specs, badges, cards, modals, navigation, and interactive elements.

**Key Topics:**
- Button types (Primary, Secondary, Toggle)
- Badge styles (Type, Status)
- KeyCard structure (5-row layout with padding)
- Icon containers (small and large variants)
- Table structure
- Modal dialogs
- Navigation items
- Form elements
- Copy button pattern
- Tooltips

**Quick Start:**
```tsx
/* Primary Button */
<button
  style={{ backgroundColor: '#1D4ED8' }}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E40AF'}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
>

/* KeyCard */
<div className="bg-card border border-default rounded-lg shadow-sm">
```

---

### 📐 [Spacing & Layout](./spacing-layout.md)
Spacing rhythm, container widths, grid layouts, and padding patterns.

**Key Topics:**
- Spacing scale (0.25rem units)
- Container widths (AppPrimaryContainer, modals)
- KeyCard row padding (pt-3, py-2, py-3 pattern)
- Grid layouts (responsive columns)
- Section spacing
- Border radius standards
- Z-index layers
- Flexbox patterns

**Quick Reference:**
```tsx
/* KeyCard Padding Pattern */
Row 1: pt-3 px-5 pb-2
Row 2: py-2 px-5
Row 3: pt-2 pb-2 px-5
Row 4: pt-0 pb-2 px-5
Footer: py-3 px-5
```

---

### ♿ [Accessibility](./accessibility.md)
90/10 principle, focus trap, tab order, WCAG standards, and inclusive design.

**Key Topics:**
- 90/10 design principle (optimize for majority, provide for edge cases)
- Tab order optimization (primary flow only)
- Modal focus trap implementation
- ARIA labels and roles
- Color contrast requirements (WCAG AA)
- Keyboard navigation patterns
- Screen reader support
- Touch target sizes (44px × 44px minimum)
- Error handling and validation

**Quick Start:**
```tsx
/* Focus Trap Pattern */
<form onKeyDown={handleKeyDown}>
  <input ref={firstFocusableRef} />
  {/* ... */}
  <button ref={lastFocusableRef}>Submit</button>
</form>

/* Accessible Button */
<button aria-label="Copy public key" tabIndex={-1}>
  <Copy className="h-3 w-3" />
</button>
```

---

## Core Design Principles

### 1. Brand vs. Functional Colors

**Use brand colors ONLY for:**
- Icons (key type identity, CTAs)
- Borders (dialog/card identity)
- Primary action buttons
- Brand-defining visual elements

**Keep all other UI on Tailwind defaults:**
- Form input focus rings (blue-300)
- Informational tooltips (blue-600/700)
- Help panels (bg-blue-50 border-blue-200)
- Validation states (green/red)

**Why:** Prevents brand color overload and maintains familiar UX.

---

### 2. Consistency Rules

**Icons match their context:**
- Passphrase = Key icon
- YubiKey = Fingerprint icon
- Same icons across filters, cards, tables, modals

**Colors carry meaning:**
- Teal = Passphrase (software)
- Orange = YubiKey (hardware)
- Blue = Primary actions
- Gray = Secondary actions
- Red = Critical/Warning states

**Borders are subtle:**
- Use tinted variants of main color
- 1px weight
- Almost invisible but elevates design

**Backgrounds are soft:**
- Use rgba() with low opacity (0.05-0.15)
- Tinted variants of main color
- Never pure colors

**Spacing is rhythmic:**
- Content rows: `pt-2` or `py-2`
- Headers/footers: `py-3`
- Consistent `px-5` horizontal padding

---

### 3. Visual Hierarchy

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

## Implementation Workflow

### Starting a New Component

1. **Read** relevant sections:
   - [Components](./components.md) for structure
   - [Color System](./color-system.md) for colors
   - [Spacing & Layout](./spacing-layout.md) for spacing
   - [Accessibility](./accessibility.md) for a11y requirements

2. **Use** theme-aware utilities:
   ```tsx
   <div className="bg-card text-main border-default">
   ```

3. **Test** in both light and dark modes

4. **Verify** accessibility (keyboard nav, contrast, ARIA)

---

### Adding Dark Mode Support

1. **Replace** hardcoded colors with semantic utilities:
   - `bg-white` → `bg-card`
   - `text-slate-800` → `text-main`
   - `border-slate-200` → `border-default`

2. **Use** `useThemeColors()` for inline styles with hover:
   ```tsx
   const colors = useThemeColors();

   <button
     style={{ borderColor: colors.border.default }}
     onMouseEnter={(e) => {
       e.currentTarget.style.backgroundColor = colors.surface.hover;
     }}
   ```

3. **Keep** brand colors unchanged (`#1D4ED8`, `#13897F`, `#F98B1C`)

4. **Test** both themes thoroughly

---

## Component Checklist

Before shipping a component:

- [ ] Uses theme-aware utilities (`bg-card`, `text-main`, `border-default`)
- [ ] Has proper hover states with transitions
- [ ] Icons are correct size for context
- [ ] Borders use tinted variants (not pure gray)
- [ ] Backgrounds use rgba() with low opacity
- [ ] Typography uses text-xs or text-sm consistently
- [ ] Spacing follows pt-2/py-2/py-3 pattern
- [ ] Loading states are handled
- [ ] Disabled states have proper styling
- [ ] Tooltips for truncated or disabled elements
- [ ] Keyboard accessible (tab order, focus trap)
- [ ] ARIA labels where needed
- [ ] Tested in light and dark modes
- [ ] Color contrast meets WCAG AA (4.5:1 for normal text)

---

## Design Tokens Quick Reference

### CSS Variables (tokens.css)

**Brand (Fixed):**
```css
--brand-blue: 29 78 216           /* #1D4ED8 */
--brand-teal: 19 137 127          /* #13897F */
--brand-orange: 249 139 28        /* #F98B1C */
--brand-gray: 86 85 85            /* #565555 */
```

**Surfaces (Theme-aware):**
```css
--surface-app                     /* White / Slate-900 */
--surface-card                    /* White / Slate-800 */
--surface-elevated                /* Slate-50 / Slate-700 */
--surface-hover                   /* Slate-100 / Slate-700 */
```

**Text (Theme-aware):**
```css
--text-primary                    /* Slate-800 / Slate-50 */
--text-secondary                  /* Slate-500 / Slate-400 */
--text-muted                      /* Slate-400 / Slate-500 */
--heading-primary                 /* Brand gray / White */
```

**Borders (Theme-aware):**
```css
--border-default                  /* Slate-200 / Slate-600 */
--border-subtle                   /* Slate-100 / Slate-700 */
--border-strong                   /* Slate-400 / Slate-500 */
```

### Utility Classes (theme.css)

**Surfaces:**
```css
.bg-app, .bg-card, .bg-elevated, .bg-hover
```

**Text:**
```css
.text-main, .text-secondary, .text-muted, .text-heading
```

**Borders:**
```css
.border-default, .border-subtle, .border-strong
```

**Brand:**
```css
.bg-brand-blue, .text-brand-teal, .text-brand-orange
```

---

## Common Patterns

### Primary Button
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

### Secondary Button (Theme-Aware)
```tsx
const colors = useThemeColors();
const [isHovered, setIsHovered] = useState(false);

<button
  className="px-3 py-1.5 text-xs font-medium rounded-md border transition-colors"
  style={{
    backgroundColor: isHovered ? colors.surface.hover : 'transparent',
    borderColor: colors.border.default,
    color: colors.text.secondary,
  }}
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  Export
</button>
```

### Type Badge
```tsx
<span
  className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
  style={{
    backgroundColor: isPassphrase ? 'rgba(15, 118, 110, 0.1)' : 'rgba(249, 139, 28, 0.08)',
    color: isPassphrase ? '#13897F' : '#F98B1C',
    border: `1px solid ${isPassphrase ? '#B7E1DD' : '#ffd4a3'}`,
  }}
>
  {isPassphrase ? 'Passphrase' : 'YubiKey'}
</span>
```

### Icon Container
```tsx
<div
  className="rounded-lg p-2 flex-shrink-0"
  style={{
    backgroundColor: isPassphrase ? 'rgba(15, 118, 110, 0.1)' : 'rgba(249, 139, 28, 0.08)',
    border: isPassphrase ? '1px solid #B7E1DD' : '1px solid #ffd4a3',
  }}
>
  {isPassphrase ? (
    <Key className="h-4 w-4" style={{ color: '#13897F' }} />
  ) : (
    <Fingerprint className="h-4 w-4" style={{ color: '#F98B1C' }} />
  )}
</div>
```

---

## Version History

### v2.0 (2025-10-17)
**Major Update - Dark Mode Implementation**

- Complete dark mode system with light/dark/system modes
- RGB-based design token system (`tokens.css`)
- Semantic utility classes (`theme.css`)
- ThemeContext API for React components
- Logo switching (light/dark variants)
- Enhanced documentation (modular structure)
- 31 commits implementing dark mode across Manage Keys
- New badge toned down in dark mode
- Security Tips panel uses blue tint in dark mode
- Button hover pattern updated for Tailwind v4 compatibility

### v1.1 (2025-10-16)
**Minor Update**

- Refined YubiKey orange background opacity (15% → 8%)
- Updated logo gray for better brand consistency

### v1.0 (2025-10-16)
**Initial Release**

- Premium teal/orange theme system
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

## Resources

### Design Tools
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/) (icon library)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WAVE Accessibility Evaluation Tool](https://wave.webaim.org/)

### Related Documentation
- `/docs/architecture/context.md` - Tech stack overview
- `/docs/engineering/context.md` - Engineering patterns
- `/docs/product/context.md` - UI/UX design principles

---

## Getting Help

**Questions about:**
- **Colors?** See [Color System](./color-system.md)
- **Dark mode?** See [Dark Mode System](./dark-mode.md)
- **Text styling?** See [Typography](./typography.md)
- **Component structure?** See [Components](./components.md)
- **Spacing?** See [Spacing & Layout](./spacing-layout.md)
- **Accessibility?** See [Accessibility](./accessibility.md)

**Still stuck?** Check the examples in each section or reference existing components in `src-ui/src/components/`.

---

_This style guide ensures visual consistency across the Barqly Vault application. All UI components should follow these specifications for a cohesive, professional appearance._
