# Dark Mode System

**Version:** 2.0
**Last Updated:** 2025-10-17

---

## Overview

Barqly Vault implements a comprehensive dark mode system using CSS custom properties (CSS variables) and React Context. The system supports three modes:
- **Light** - Traditional light theme
- **Dark** - Dark theme optimized for low-light environments
- **System** - Automatically follows OS preference

**Key Feature:** Brand colors (teal, orange, blue) remain fixed across themes, while surfaces, text, and borders adapt intelligently.

---

## Architecture

### 1. Design Tokens (`src-ui/src/styles/tokens.css`)

Defines all color values as RGB triplets in CSS custom properties:

```css
:root {
  /* Brand colors - FIXED across themes */
  --brand-blue: 29 78 216;           /* #1D4ED8 */
  --brand-teal: 19 137 127;          /* #13897F */
  --brand-orange: 249 139 28;        /* #F98B1C */
  --brand-gray: 86 85 85;            /* #565555 */

  /* Theme-aware surfaces */
  --surface-app: 255 255 255;        /* White in light mode */
  --surface-card: 255 255 255;
  --surface-elevated: 248 250 252;   /* Slate-50 */
  --surface-input: 255 255 255;
  --surface-hover: 241 245 249;      /* Slate-100 */

  /* Theme-aware text */
  --text-primary: 30 41 59;          /* Slate-800 */
  --text-secondary: 100 116 139;     /* Slate-500 */
  --text-muted: 148 163 184;         /* Slate-400 */
  --heading-primary: 86 85 85;       /* Brand gray */

  /* Theme-aware borders */
  --border-default: 226 232 240;     /* Slate-200 */
  --border-subtle: 241 245 249;      /* Slate-100 */
  --border-strong: 148 163 184;      /* Slate-400 */
}

[data-theme="dark"] {
  /* Dark mode overrides */
  --surface-app: 15 23 42;           /* Slate-900 */
  --surface-card: 30 41 59;          /* Slate-800 */
  --surface-elevated: 51 65 85;      /* Slate-700 */
  --surface-hover: 51 65 85;

  --text-primary: 248 250 252;       /* Slate-50 (white) */
  --text-secondary: 148 163 184;     /* Slate-400 */
  --text-muted: 100 116 139;         /* Slate-500 */
  --heading-primary: 248 250 252;    /* White for headings */

  --border-default: 71 85 105;       /* Slate-600 */
  --border-subtle: 51 65 85;         /* Slate-700 */
  --border-strong: 100 116 139;      /* Slate-500 */
}
```

**Why RGB format?** Allows using `rgb(var(--token))` or `rgba(var(--token) / 0.5)` for opacity control.

### 2. Semantic Utilities (`src-ui/src/styles/theme.css`)

Maps design tokens to component-friendly CSS classes:

```css
@layer utilities {
  /* Surfaces */
  .bg-app { background-color: rgb(var(--surface-app)); }
  .bg-card { background-color: rgb(var(--surface-card)); }
  .bg-elevated { background-color: rgb(var(--surface-elevated)); }
  .bg-hover { background-color: rgb(var(--surface-hover)); }

  /* Text */
  .text-main { color: rgb(var(--text-primary)); }
  .text-secondary { color: rgb(var(--text-secondary)); }
  .text-muted { color: rgb(var(--text-muted)); }
  .text-heading { color: rgb(var(--heading-primary)); }

  /* Borders */
  .border-default { border-color: rgb(var(--border-default)); }
  .border-subtle { border-color: rgb(var(--border-subtle)); }

  /* Brand colors (fixed) */
  .bg-brand-blue { background-color: rgb(var(--brand-blue)); }
  .text-brand-teal { color: rgb(var(--brand-teal)); }
  .text-brand-orange { color: rgb(var(--brand-orange)); }
}
```

### 3. Theme Context (`src-ui/src/contexts/ThemeContext.tsx`)

React context for theme state management:

```tsx
type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;                    // User's preference
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark'; // Resolved theme
}

// Usage
const { theme, setTheme, effectiveTheme } = useTheme();
```

**Features:**
- Persists preference to `localStorage` as `'barqly-theme'`
- Listens to OS preference changes when in 'system' mode
- Sets `data-theme="dark"` on `<html>` element
- Automatically applies on mount

---

## Theme-Aware Tokens

### Surfaces

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--surface-app` | `#ffffff` | `#0f172a` (slate-900) | Main app background |
| `--surface-card` | `#ffffff` | `#1e293b` (slate-800) | Cards, panels, tables |
| `--surface-elevated` | `#f8fafc` | `#334155` (slate-700) | Modals, popovers, dialogs |
| `--surface-input` | `#ffffff` | `#1e293b` (slate-800) | Form inputs |
| `--surface-hover` | `#f1f5f9` | `#334155` (slate-700) | Hover states |

**Usage:**
```tsx
<div className="bg-card border border-default">
  Card content
</div>
```

### Text

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--text-primary` | `#1e293b` (slate-800) | `#f8fafc` (slate-50) | Body text |
| `--text-secondary` | `#64748b` (slate-500) | `#94a3b8` (slate-400) | Secondary text, labels |
| `--text-muted` | `#94a3b8` (slate-400) | `#64748b` (slate-500) | Placeholders, disabled |
| `--heading-primary` | `#565555` (brand gray) | `#f8fafc` (white) | Page headings |

**Usage:**
```tsx
<h1 className="text-heading">Manage Keys</h1>
<p className="text-main">Body text here</p>
<span className="text-secondary">Label</span>
```

### Borders

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--border-default` | `#e2e8f0` (slate-200) | `#475569` (slate-600) | Standard borders |
| `--border-subtle` | `#f1f5f9` (slate-100) | `#334155` (slate-700) | Very light dividers |
| `--border-strong` | `#94a3b8` (slate-400) | `#64748b` (slate-500) | Emphasis borders |

**Usage:**
```tsx
<div className="border border-default rounded-lg">
  Content
</div>
```

### Special Tokens

#### Heading Primary
```css
/* Light mode: Brand gray for premium feel */
--heading-primary: 86 85 85;  /* #565555 */

/* Dark mode: Bright white for contrast */
--heading-primary: 248 250 252;  /* #f8fafc */
```

**Usage:** Page titles, section headers

#### Logo Gray (SVG fills)
```css
/* Light mode: Brand gray */
--logo-gray: 86 85 85;  /* #565555 */

/* Dark mode: Light gray */
--logo-gray: 242 242 242;  /* #f2f2f2 */
```

**Usage:** Logo SVG fills via `.fill-heading` class

#### Info Panel Background
```css
/* Light mode: Blue-50 */
--info-panel-bg: 239 246 255;

/* Dark mode: Premium blue tint 8% */
--info-panel-bg: 29 78 216 / 0.08;
```

**Usage:** Security Tips panel, help sections

---

## Migration Patterns

### Before (Hardcoded Colors)
```tsx
// ❌ Old pattern - light mode only
<div className="bg-white text-slate-800 border-slate-200">
  Content
</div>
```

### After (Theme-Aware)
```tsx
// ✅ New pattern - adapts to theme
<div className="bg-card text-main border-default">
  Content
</div>
```

### Common Replacements

| Old Class | New Class | Notes |
|-----------|-----------|-------|
| `bg-white` | `bg-card` | Card/panel backgrounds |
| `bg-gray-50` | `bg-elevated` | Elevated surfaces (modals) |
| `bg-slate-50` | `bg-hover` | Hover states |
| `text-slate-800` | `text-main` | Primary text |
| `text-slate-600` | `text-secondary` | Labels, secondary text |
| `text-slate-400` | `text-muted` | Placeholders |
| `border-slate-200` | `border-default` | Standard borders |
| `border-slate-100` | `border-subtle` | Light dividers |

---

## Component Patterns

### 1. Cards & Panels
```tsx
<div className="bg-card border border-default rounded-lg shadow-sm">
  <div className="text-main">Card content</div>
</div>
```

### 2. Page Headers
```tsx
<header className="bg-card border-b border-default">
  <h1 className="text-heading">Page Title</h1>
</header>
```

### 3. Buttons with Hover (Inline Styles)

**Why inline styles?** Tailwind v4 hover classes have issues with CSS variables. Use `onMouseEnter`/`onMouseLeave` instead.

```tsx
import { useThemeColors } from '@/contexts/ThemeContext';

const SecondaryButton = () => {
  const colors = useThemeColors();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      className="px-4 py-2 rounded-md border text-secondary transition-colors"
      style={{
        backgroundColor: isHovered ? colors.surface.hover : 'transparent',
        borderColor: colors.border.default,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      Button Text
    </button>
  );
};
```

### 4. Table Rows
```tsx
<tr className="border-b border-subtle hover:bg-hover transition-colors">
  <td className="text-main">Cell content</td>
</tr>
```

### 5. Form Inputs
```tsx
<input
  className="bg-input text-main border-default focus:ring-2 focus:ring-blue-300"
  type="text"
/>
```

### 6. Modals
```tsx
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm">
  <div className="bg-elevated border border-default rounded-lg shadow-xl">
    <div className="p-6 border-b border-subtle">
      <h2 className="text-heading">Modal Title</h2>
    </div>
    <div className="p-6 text-main">
      Modal content
    </div>
  </div>
</div>
```

---

## useThemeColors Hook

For components requiring inline styles (buttons with hover, dynamic backgrounds):

```tsx
const colors = useThemeColors();

// Available color palettes
colors.surface.app        // #ffffff / #0f172a
colors.surface.card       // #ffffff / #1e293b
colors.surface.elevated   // #f8fafc / #334155
colors.surface.hover      // #f1f5f9 / #334155

colors.text.primary       // #1e293b / #f8fafc
colors.text.secondary     // #64748b / #94a3b8
colors.text.muted         // #94a3b8 / #64748b

colors.border.default     // #e2e8f0 / #475569
colors.border.subtle      // #f1f5f9 / #334155

// Brand colors (ALWAYS the same!)
colors.brand.blue         // #1D4ED8
colors.brand.blueHover    // #1E40AF
colors.brand.teal         // #13897F
colors.brand.orange       // #F98B1C
```

**Example:**
```tsx
const SecondaryButton = () => {
  const colors = useThemeColors();

  return (
    <button
      style={{
        backgroundColor: 'transparent',
        borderColor: colors.border.default,
        color: colors.text.secondary,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.surface.hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      Cancel
    </button>
  );
};
```

---

## Logo Switching

The app uses two logo variants:

```
src-ui/src/assets/barqly-vault-hdr-light.svg  (Light mode - gray text)
src-ui/src/assets/barqly-vault-hdr-dark.svg   (Dark mode - white text)
```

**Implementation:**
```tsx
import { useTheme } from '@/contexts/ThemeContext';
import LogoLight from '@/assets/barqly-vault-hdr-light.svg';
import LogoDark from '@/assets/barqly-vault-hdr-dark.svg';

const Logo = () => {
  const { effectiveTheme } = useTheme();

  return (
    <img
      src={effectiveTheme === 'dark' ? LogoDark : LogoLight}
      alt="Barqly Vault"
    />
  );
};
```

**Note:** Logo text color uses `--heading-primary` token (#565555 light, #f2f2f2 dark).

---

## Theme Toggle Component

```tsx
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setTheme('light')}
        className={theme === 'light' ? 'active' : ''}
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={theme === 'dark' ? 'active' : ''}
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={theme === 'system' ? 'active' : ''}
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  );
};
```

---

## Dark Mode Specific Adjustments

### New Badge (Toned Down)
```css
/* Light mode */
background: #F1F5F9 (slate-100)
color: #334155 (slate-700)
border: #CBD5E1 (slate-300)

/* Dark mode - toned down */
background: #334155 (slate-700)
color: #CBD5E1 (slate-300)
border: #475569 (slate-600)
```

### Security Tips Panel (Blue Tint)
```css
/* Light mode */
background: #eff6ff (blue-50)

/* Dark mode - subtle blue tint */
background: rgba(29, 78, 216, 0.08)  /* Premium blue at 8% */
```

### Passphrase Accents
```css
/* Light mode */
--passphrase-bg: 15 118 110 / 0.1       /* 10% */
--passphrase-border: 183 225 221         /* Light teal */

/* Dark mode */
--passphrase-bg: 15 118 110 / 0.15      /* 15% - slightly higher */
--passphrase-border: 31 91 84            /* Darker teal */
```

### YubiKey Accents
```css
/* Light mode */
--yubikey-bg: 249 139 28 / 0.08         /* 8% */
--yubikey-border: 255 212 163            /* Light orange */

/* Dark mode */
--yubikey-bg: 249 139 28 / 0.12         /* 12% - slightly higher */
--yubikey-border: 180 83 9               /* Darker orange */
```

---

## Implementation Checklist

When adding dark mode support to a component:

- [ ] Replace `bg-white` with `bg-card`
- [ ] Replace `text-slate-800` with `text-main`
- [ ] Replace `text-slate-600` with `text-secondary`
- [ ] Replace `border-slate-200` with `border-default`
- [ ] Replace hover backgrounds with `bg-hover`
- [ ] Use `useThemeColors()` for inline styles with hover
- [ ] Keep brand colors unchanged (`#1D4ED8`, `#13897F`, `#F98B1C`)
- [ ] Test in both light and dark modes
- [ ] Verify contrast ratios (WCAG AA minimum)

---

## Best Practices

### DO
- ✅ Use semantic utility classes (`bg-card`, `text-main`)
- ✅ Keep brand colors fixed across themes
- ✅ Use `useThemeColors()` for dynamic inline styles
- ✅ Test both themes during development
- ✅ Use `effectiveTheme` to conditionally render theme-specific elements

### DON'T
- ❌ Use hardcoded colors (`bg-white`, `text-slate-800`)
- ❌ Change brand colors between themes
- ❌ Use Tailwind hover classes with CSS variables (buggy in v4)
- ❌ Forget to update borders when updating backgrounds
- ❌ Use pure black (`#000000`) - use slate-900 instead

---

## Filter Logic Note

**Option A (Implemented):** At least one filter must be active
- Both selected = show all
- Both unselected = auto-select both (show all)
- One selected = show that type only

**Rationale:** Prevents empty state confusion. User always sees keys.

---

## Version History

### v2.0 (2025-10-17)
- Initial dark mode implementation
- Theme context with light/dark/system modes
- Design tokens in RGB format
- Semantic utility classes
- Logo switching
- 31 commits implementing dark mode across all Manage Keys components

---

**See Also:**
- [Color System](./color-system.md) - Color palette and usage
- [Components](./components.md) - Component-specific patterns
- [Typography](./typography.md) - Text styling
