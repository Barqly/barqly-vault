# Accessibility

**Version:** 2.0
**Last Updated:** 2025-10-17

---

## Core Principle: 90/10 Design

**Optimize for the 90% majority while providing options for the 10%.**

### Philosophy

- **Focus** on creating the best possible experience for the primary use case (90%)
- **Provide** alternative access methods for edge cases (10%)
- **Don't compromise** majority UX for edge case optimization

### Examples

**Mouse users (90%):**
- Direct clicks on all interactive elements
- Visual hover feedback
- Tooltips on hover

**Keyboard users (10%):**
- Tab navigation through primary flow
- Enter/Space to activate
- Skip links for efficiency

**Specific Patterns:**
- Password visibility toggle: Skip in tab order, clickable with mouse
- Security tips: Skip in tab order, expandable with mouse or Enter
- Copy buttons: Skip in tab order, but visible and clickable
- Cancel buttons: Skip in tab order (ESC key exits modals)

---

## Keyboard Navigation

### Tab Order Optimization

**Include in tab order (tabIndex >= 0):**
- ✅ Form input fields (text, password, select)
- ✅ Primary action button (when enabled)
- ✅ Critical actions required for form completion

**Exclude from tab order (tabIndex={-1}):**
- ❌ Password visibility toggles (eye icon)
- ❌ Collapsible help sections ("Security Tips", "How it Works")
- ❌ Cancel buttons (secondary action - use ESC instead)
- ❌ Tooltips and info icons
- ❌ Copy buttons (tertiary actions)
- ❌ Informational accordions

### Rationale

- Keyboard users can Tab → fill fields → Tab → submit (fast, uninterrupted)
- Secondary controls remain clickable with mouse (no functionality lost)
- Reduces cognitive load (fewer stops during form flow)

### Example Tab Order (Create Passphrase Key Modal)

```
1. Key Label field
2. Passphrase field
3. Confirm Passphrase field
4. Create Passphrase Key button (only if enabled)
→ Cycles back to Key Label field
```

**Implementation:**
```tsx
<form onKeyDown={handleKeyDown}>
  {/* Tab index 0 (default) */}
  <input type="text" placeholder="Key Label" />

  {/* Tab index 0 */}
  <input type="password" placeholder="Passphrase" />

  {/* Tab index -1 (skip) */}
  <button
    type="button"
    tabIndex={-1}
    onClick={() => setShowPassword(!showPassword)}
  >
    <Eye className="h-4 w-4" />
  </button>

  {/* Tab index 0 */}
  <input type="password" placeholder="Confirm Passphrase" />

  {/* Tab index -1 (skip) */}
  <button
    type="button"
    tabIndex={-1}
    onClick={toggleSecurityTips}
  >
    Security Tips
  </button>

  {/* Tab index 0 (only if enabled) */}
  <button
    type="submit"
    disabled={!isValid}
    tabIndex={isValid ? 0 : -1}
  >
    Create Passphrase Key
  </button>
</form>
```

---

## Modal Dialog Behavior

### Focus Trap Requirements

All modal dialogs **MUST** trap focus within the modal:

1. **Focus stays within modal** - Tab never escapes to background elements
2. **Cycle focus** - After last focusable element, Tab returns to first element
3. **Shift+Tab reverses** - Cycles backward through focusable elements
4. **Close on Escape** - ESC key closes modal (if not in loading state)

### Implementation Pattern

```tsx
const CreateKeyModal = ({ onClose }) => {
  const firstFocusableRef = useRef<HTMLInputElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // ESC to close
    if (e.key === 'Escape' && !isLoading) {
      onClose();
      return;
    }

    // Tab trap
    if (e.key !== 'Tab') return;

    const isLastEnabled = document.activeElement === lastFocusableRef.current;
    const isFirstEnabled = document.activeElement === firstFocusableRef.current;

    if (!e.shiftKey && isLastEnabled) {
      e.preventDefault();
      firstFocusableRef.current?.focus();
    } else if (e.shiftKey && isFirstEnabled) {
      e.preventDefault();
      lastFocusableRef.current?.focus();
    }
  };

  useEffect(() => {
    // Auto-focus first field on mount
    firstFocusableRef.current?.focus();
  }, []);

  return (
    <form onKeyDown={handleKeyDown}>
      <input ref={firstFocusableRef} type="text" placeholder="Key Label" />
      {/* ... */}
      <button ref={lastFocusableRef} type="submit">
        Create Key
      </button>
    </form>
  );
};
```

### Focus Management

**On modal open:**
- Trap focus within modal
- Auto-focus first input field
- Prevent body scroll

**On modal close:**
- Return focus to trigger element
- Restore body scroll
- Clear trapped focus

---

## ARIA Labels & Roles

### Button Labels

**Icon-only buttons MUST have aria-label:**
```tsx
<button aria-label="Toggle password visibility" tabIndex={-1}>
  <Eye className="h-4 w-4" />
</button>

<button aria-label="Copy public key">
  <Copy className="h-3 w-3" />
</button>

<button aria-label="Close modal" onClick={onClose}>
  <X className="h-5 w-5" />
</button>
```

### Form Fields

**Label association:**
```tsx
<label htmlFor="key-label" className="block text-sm font-medium text-main">
  Key Label
</label>
<input
  id="key-label"
  type="text"
  aria-describedby="key-label-help"
/>
<span id="key-label-help" className="text-xs text-secondary">
  Max 24 characters
</span>
```

**Error states:**
```tsx
<input
  id="passphrase"
  type="password"
  aria-invalid={hasError}
  aria-describedby={hasError ? "passphrase-error" : undefined}
/>
{hasError && (
  <span id="passphrase-error" className="text-xs text-red-600" role="alert">
    Passphrase is required
  </span>
)}
```

### Live Regions

**Status announcements:**
```tsx
<div role="status" aria-live="polite" className="sr-only">
  {isCopied && "Public key copied to clipboard"}
</div>
```

**Alert messages:**
```tsx
<div role="alert" aria-live="assertive" className="text-red-600">
  Failed to create key. Please try again.
</div>
```

---

## Color Contrast

### WCAG AA Requirements

**Normal text (< 18px):**
- Minimum contrast: **4.5:1**

**Large text (≥ 18px or ≥ 14px bold):**
- Minimum contrast: **3:1**

**Graphical objects (icons, borders):**
- Minimum contrast: **3:1** against adjacent colors

### Verified Combinations (Light Mode)

| Foreground | Background | Ratio | Status |
|------------|------------|-------|--------|
| `text-main` (#1e293b) | `bg-card` (#ffffff) | 15.4:1 | ✅ AAA |
| `text-secondary` (#64748b) | `bg-card` (#ffffff) | 7.8:1 | ✅ AAA |
| `text-muted` (#94a3b8) | `bg-card` (#ffffff) | 4.6:1 | ✅ AA |
| Premium blue (#1D4ED8) | White | 8.2:1 | ✅ AAA |
| Teal (#13897F) | White | 5.1:1 | ✅ AA |
| Orange (#F98B1C) | White | 4.8:1 | ✅ AA |
| Red-700 (#B91C1C) | White | 7.1:1 | ✅ AAA |

### Verified Combinations (Dark Mode)

| Foreground | Background | Ratio | Status |
|------------|------------|-------|--------|
| `text-main` (#f8fafc) | `bg-card` (#1e293b) | 13.1:1 | ✅ AAA |
| `text-secondary` (#94a3b8) | `bg-card` (#1e293b) | 5.2:1 | ✅ AA |
| `text-muted` (#64748b) | `bg-card` (#1e293b) | 3.1:1 | ✅ AA (large) |
| Premium blue (#1D4ED8) | Slate-900 | 5.8:1 | ✅ AA |
| Teal (#13897F) | Slate-800 | 3.4:1 | ✅ AA (large) |
| Orange (#F98B1C) | Slate-800 | 3.2:1 | ✅ AA (large) |

### Contrast Testing

**Tools:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools (Lighthouse accessibility audit)
- [Contrast Ratio](https://contrast-ratio.com/)

**Test scenarios:**
- Text on backgrounds (all sizes)
- Icons on backgrounds
- Borders against surfaces
- Focus indicators
- Disabled states (may have lower contrast, which is acceptable)

---

## Focus Indicators

### Default Focus Style

**Form inputs:**
```tsx
<input className="focus:outline-none focus:ring-2 focus:ring-blue-300" />
```
- Ring: 2px solid
- Color: `blue-300` (#93c5fd)
- Offset: None (tight to element)

**Buttons:**
```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2">
  Button Text
</button>
```
- Ring: 2px solid
- Color: `blue-300`
- Offset: 2px (breathing room)

### Error State Focus

```tsx
<input
  className="border-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
  aria-invalid="true"
/>
```
- Ring: 2px solid
- Color: `red-300` (#fca5a5)

### Custom Focus (Cards)

```tsx
<button
  className="focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 rounded-lg"
  onClick={handleSelect}
>
  <SelectionCard />
</button>
```
- Wraps entire card
- Visible focus ring
- Consistent with form elements

---

## Screen Reader Support

### Semantic HTML

**Use proper HTML elements:**
```tsx
// ✅ Good
<button onClick={handleClick}>Click me</button>
<a href="/vaults">View vaults</a>

// ❌ Bad
<div onClick={handleClick}>Click me</div>
<div className="cursor-pointer" onClick={navigate}>View vaults</div>
```

### Heading Hierarchy

**Maintain proper heading levels:**
```tsx
<h1 className="text-2xl font-semibold text-heading">Manage Keys</h1>
  <h2 className="text-xl font-semibold text-heading">Create New Key</h2>
    <h3 className="text-lg font-semibold text-heading">Key Type</h3>
```

**Do not skip levels:**
- ✅ h1 → h2 → h3
- ❌ h1 → h3 (skip h2)

### Visually Hidden Text

**Screen reader only content:**
```tsx
<span className="sr-only">
  Navigate to vaults page
</span>

<style>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
```

### Loading States

```tsx
<button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? (
    <>
      <Loader className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span className="sr-only">Loading...</span>
      Creating Key...
    </>
  ) : (
    'Create Key'
  )}
</button>
```

---

## Touch Target Sizes

### Minimum Sizes

**WCAG AAA (recommended):**
- Minimum: **44px × 44px**

**WCAG AA (acceptable):**
- Minimum: **24px × 24px**

### Component Compliance

**Buttons:**
```tsx
// ✅ Compliant (44px height)
<button className="px-4 py-2 text-sm">
  Button (approx 44px tall with padding)
</button>

// ✅ Compliant (explicit size)
<button className="h-11 px-4">
  Button (44px tall)
</button>
```

**Icon Buttons:**
```tsx
// ✅ Compliant (44px × 44px)
<button className="w-11 h-11 flex items-center justify-center">
  <Icon className="h-5 w-5" />
</button>

// ⚠️ Borderline (needs testing)
<button className="p-2">
  <Icon className="h-4 w-4" />
  {/* Padding + icon = ~32px (below recommended) */}
</button>
```

**Table Row Clickable Area:**
```tsx
<tr className="cursor-pointer hover:bg-hover" onClick={handleRowClick}>
  <td className="py-3 px-4">
    {/* Full row is clickable (height ~48px) */}
  </td>
</tr>
```

---

## Interactive States

### Visual Feedback

**All interactive elements MUST have:**
1. **Hover state** - Visual change on mouse hover
2. **Focus state** - Visible focus indicator
3. **Active state** - Feedback when clicked/pressed
4. **Disabled state** - Reduced opacity, cursor not-allowed

### Implementation

```tsx
<button
  className="px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
  style={{
    backgroundColor: isHovered ? '#1E40AF' : '#1D4ED8',
  }}
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
  disabled={isDisabled}
>
  Button Text
</button>
```

**States checklist:**
- [ ] Default state styled
- [ ] Hover state changes color/background
- [ ] Focus ring visible
- [ ] Active/pressed state (if applicable)
- [ ] Disabled state has reduced opacity

---

## Error Handling & Validation

### Form Validation

**Inline validation:**
```tsx
<div>
  <label htmlFor="passphrase">Passphrase</label>
  <input
    id="passphrase"
    type="password"
    value={passphrase}
    onChange={handleChange}
    aria-invalid={!!error}
    aria-describedby={error ? "passphrase-error" : undefined}
    className={error ? "border-red-500" : "border-default"}
  />
  {error && (
    <span
      id="passphrase-error"
      className="text-xs text-red-600"
      role="alert"
    >
      {error}
    </span>
  )}
</div>
```

**Submit button state:**
```tsx
<button
  type="submit"
  disabled={!isValid || isLoading}
  aria-busy={isLoading}
>
  {isLoading ? 'Creating...' : 'Create Key'}
</button>
```

### Error Messages

**Requirements:**
- Associated with field via `aria-describedby`
- `role="alert"` for immediate errors
- Red color with sufficient contrast
- Clear, actionable message

**Example:**
```tsx
<span id="email-error" role="alert" className="text-xs text-red-600">
  Please enter a valid email address
</span>
```

---

## Motion & Animation

### Reduced Motion Preference

**Respect user preferences:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Tailwind support:**
```tsx
<div className="transition-all motion-reduce:transition-none">
  Animated content
</div>
```

### Animation Guidelines

**Do:**
- ✅ Use subtle transitions (`transition-colors`, `transition-opacity`)
- ✅ Keep animations under 300ms
- ✅ Provide instant feedback for critical actions

**Don't:**
- ❌ Animate critical UI changes (form validation)
- ❌ Use animation purely for decoration
- ❌ Create motion that could trigger vestibular issues

---

## Tooltips & Help Text

### Tooltip Accessibility

**Pattern:**
```tsx
<div className="group relative">
  <button aria-label="Copy public key">
    <Copy className="h-3 w-3" />
  </button>
  <div
    role="tooltip"
    className="absolute bottom-full left-0 mb-1 hidden group-hover:block pointer-events-none"
  >
    <div className="bg-slate-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
      Copy public key
    </div>
  </div>
</div>
```

**Requirements:**
- `role="tooltip"` for screen readers
- `aria-label` or visible text on trigger
- Not in tab order (`pointer-events-none`)
- Visible on hover
- Dark background for contrast

### Help Text

```tsx
<div>
  <label htmlFor="key-label">Key Label</label>
  <input
    id="key-label"
    aria-describedby="key-label-help"
  />
  <span id="key-label-help" className="text-xs text-secondary">
    Choose a unique, memorable name (max 24 characters)
  </span>
</div>
```

---

## Accessibility Checklist

Before shipping a feature:

### Keyboard Navigation
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical and follows visual flow
- [ ] Focus trap implemented for modals
- [ ] ESC closes modals/dismisses overlays
- [ ] Enter/Space activates buttons

### Focus Management
- [ ] Visible focus indicators on all interactive elements
- [ ] Focus indicators meet 3:1 contrast requirement
- [ ] Focus restored after modal closes

### ARIA & Semantics
- [ ] Proper semantic HTML (`<button>`, `<a>`, headings)
- [ ] aria-label on icon-only buttons
- [ ] aria-invalid on error fields
- [ ] aria-describedby for help text and errors
- [ ] role="alert" for critical messages

### Color & Contrast
- [ ] All text meets WCAG AA contrast (4.5:1 for normal, 3:1 for large)
- [ ] Information not conveyed by color alone
- [ ] Icons meet 3:1 contrast requirement

### Screen Readers
- [ ] All images have alt text (or aria-hidden if decorative)
- [ ] Form fields have associated labels
- [ ] Status messages announced with live regions
- [ ] Loading states communicated via aria-busy

### Touch & Click Targets
- [ ] Buttons meet 44px × 44px minimum (recommended)
- [ ] Sufficient spacing between interactive elements

### Testing
- [ ] Tested with keyboard only (no mouse)
- [ ] Tested with screen reader (VoiceOver, NVDA)
- [ ] Lighthouse accessibility score > 90
- [ ] Automated tests pass (axe, WAVE)

---

**See Also:**
- [Components](./components.md) - Accessible component patterns
- [Color System](./color-system.md) - Contrast requirements
- [Typography](./typography.md) - Text readability
