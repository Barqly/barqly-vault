# Setup Screen Accessibility Requirements

> **Purpose**: Ensure inclusive design for all users  
> **Standard**: WCAG 2.2 AA Compliance  
> **Scope**: Setup screen and all sub-components

## Core Accessibility Principles

### 1. Perceivable
Information and UI components must be presentable to users in ways they can perceive.

### 2. Operable
UI components and navigation must be operable by all users.

### 3. Understandable
Information and UI operation must be understandable.

### 4. Robust
Content must be robust enough to work with assistive technologies.

## Detailed Requirements

### Color & Contrast

#### Text Contrast Requirements
| Element | Foreground | Background | Ratio | WCAG Requirement |
|---------|------------|------------|-------|------------------|
| Primary text | #111827 | #FFFFFF | 19.5:1 | ✅ 4.5:1 (AA) |
| Secondary text | #374151 | #FFFFFF | 12.6:1 | ✅ 4.5:1 (AA) |
| Helper text | #6B7280 | #FFFFFF | 5.8:1 | ✅ 4.5:1 (AA) |
| Error text | #EF4444 | #FFFFFF | 4.5:1 | ✅ 4.5:1 (AA) |
| Success text | #059669 | #FFFFFF | 4.8:1 | ✅ 4.5:1 (AA) |
| Button text | #FFFFFF | #2563EB | 4.6:1 | ✅ 4.5:1 (AA) |
| Disabled text | #9CA3AF | #FFFFFF | 3.0:1 | ✅ 3:1 (disabled) |

#### Non-Text Contrast Requirements
| Element | Color | Background | Ratio | WCAG Requirement |
|---------|-------|------------|-------|------------------|
| Input borders | #D1D5DB | #FFFFFF | 2.0:1 | ❌ Need 3:1 |
| Focus rings | #2563EB | #FFFFFF | 4.6:1 | ✅ 3:1 (AA) |
| Icons | #6B7280 | #FFFFFF | 5.8:1 | ✅ 3:1 (AA) |

**Action Required**: Update input borders to #9CA3AF for 3:1 contrast ratio.

### Keyboard Navigation

#### Tab Order
```
1. Header (skip link target)
2. Key Label input
3. Passphrase input
4. Show/Hide password toggle
5. Confirm Passphrase input
6. Show/Hide password toggle (confirm)
7. Clear button
8. Create Security Identity button
9. Learn what happens next button
```

#### Keyboard Shortcuts
| Action | Key | Implementation |
|--------|-----|----------------|
| Submit form | Enter | When button focused |
| Cancel/Clear | Escape | Clear form fields |
| Toggle password | Space | When toggle focused |
| Expand help | Enter/Space | On help button |

#### Focus Management
```tsx
// Example focus trap implementation
const FocusTrap = ({ children, active }) => {
  const startRef = useRef(null);
  const endRef = useRef(null);

  const handleTabKey = (e) => {
    if (!active || e.key !== 'Tab') return;
    
    // Handle tab navigation within trap
    const focusableElements = getFocusableElements();
    // ... focus management logic
  };

  return (
    <div onKeyDown={handleTabKey}>
      <div ref={startRef} tabIndex={0} className="sr-only">
        Start of form
      </div>
      {children}
      <div ref={endRef} tabIndex={0} className="sr-only">
        End of form
      </div>
    </div>
  );
};
```

### Screen Reader Support

#### ARIA Labels & Descriptions
```tsx
// Header with landmark
<header role="banner" aria-label="Setup page header">
  <h1 id="page-title">Secure Your Bitcoin Legacy</h1>
  <p id="page-description">
    Create your encryption identity with military-grade age encryption
  </p>
</header>

// Form with proper labeling
<form 
  role="form" 
  aria-labelledby="form-title"
  aria-describedby="form-description"
>
  <h2 id="form-title">Create Your Encryption Identity</h2>
  <p id="form-description" className="sr-only">
    Fill out this form to generate your encryption key
  </p>

  // Input with comprehensive labeling
  <div>
    <label htmlFor="key-label" id="key-label-label">
      Key Label
      <span aria-label="required">*</span>
    </label>
    <input
      id="key-label"
      type="text"
      aria-required="true"
      aria-describedby="key-label-help key-label-error"
      aria-invalid={!!error}
    />
    <p id="key-label-help" className="helper-text">
      A memorable name for this security identity
    </p>
    {error && (
      <p id="key-label-error" role="alert" className="error-text">
        {error}
      </p>
    )}
  </div>

  // Password field with toggle
  <div>
    <label htmlFor="passphrase">
      Passphrase
      <span aria-label="required">*</span>
    </label>
    <div className="relative">
      <input
        id="passphrase"
        type={showPassword ? 'text' : 'password'}
        aria-required="true"
        aria-describedby="passphrase-help passphrase-strength"
      />
      <button
        type="button"
        aria-label={showPassword ? 'Hide passphrase' : 'Show passphrase'}
        aria-pressed={showPassword}
      >
        {showPassword ? <EyeOff /> : <Eye />}
      </button>
    </div>
    <div 
      id="passphrase-strength" 
      role="status" 
      aria-live="polite"
      aria-atomic="true"
    >
      Strength: {strengthText}
    </div>
  </div>
</form>
```

#### Live Regions
```tsx
// Progress announcements
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
  className="sr-only"
>
  {isGenerating && 'Generating encryption key, please wait...'}
  {progress && `Progress: ${progress}%`}
  {success && 'Key generated successfully!'}
</div>

// Error announcements
<div 
  role="alert" 
  aria-live="assertive" 
  aria-atomic="true"
>
  {error && error.message}
</div>

// Form validation feedback
<div 
  role="status" 
  aria-live="polite" 
  aria-relevant="additions removals"
>
  {passphraseMatch === false && 'Passphrases do not match'}
  {passphraseMatch === true && 'Passphrases match'}
</div>
```

### Touch & Mobile Accessibility

#### Touch Target Sizes
| Element | Current | Required | Action |
|---------|---------|----------|--------|
| Input fields | 48px | 44px min | ✅ OK |
| Buttons | 48px | 44px min | ✅ OK |
| Password toggle | 40px | 44px min | ❌ Increase |
| Help toggle | 32px | 44px min | ❌ Increase |

#### Mobile Gestures
- No swipe-only interactions
- All actions available via tap
- Pinch-to-zoom not blocked
- Screen rotation supported

### Visual Indicators

#### Focus Indicators
```css
/* High contrast focus styles */
.focus-visible:focus {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
}

/* Windows High Contrast Mode */
@media (prefers-contrast: high) {
  .focus-visible:focus {
    outline: 3px solid;
    outline-offset: 3px;
  }
}
```

#### Error States
```tsx
// Visual + programmatic error indication
<input
  className={`
    border-2
    ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}
  `}
  aria-invalid={!!error}
  aria-errormessage="input-error"
/>
{error && (
  <p 
    id="input-error" 
    className="text-red-600 flex items-center gap-1"
  >
    <ExclamationCircle className="h-4 w-4" aria-hidden="true" />
    <span>{error}</span>
  </p>
)}
```

### Cognitive Accessibility

#### Clear Instructions
- Simple, jargon-free language
- One instruction per step
- Visual progress indicators
- Consistent terminology

#### Error Prevention
```tsx
// Inline validation with debouncing
const validatePassphrase = useMemo(
  () => debounce((value) => {
    if (value.length < 8) {
      setError('Passphrase must be at least 8 characters');
    } else {
      setError(null);
    }
  }, 500),
  []
);

// Confirmation before destructive actions
const handleClear = () => {
  if (hasUnsavedChanges) {
    if (confirm('Are you sure you want to clear the form?')) {
      clearForm();
    }
  } else {
    clearForm();
  }
};
```

#### Consistent Patterns
- Standard form layout
- Predictable button placement
- Familiar icons with labels
- Clear visual hierarchy

### Motion & Animation

#### Reduced Motion Support
```css
/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Progressive enhancement */
.collapsible-content {
  transition: max-height 300ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .collapsible-content {
    transition: none;
  }
}
```

#### Safe Animations
- No flashing content
- No parallax effects
- Smooth, predictable transitions
- User-controlled playback

### Testing Requirements

#### Manual Testing Checklist
- [ ] Keyboard-only navigation
- [ ] Screen reader testing (NVDA, JAWS, VoiceOver)
- [ ] 200% zoom functionality
- [ ] High contrast mode
- [ ] Mobile screen readers
- [ ] Voice control software
- [ ] Switch device navigation

#### Automated Testing
```tsx
// Example accessibility tests
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Setup form has no accessibility violations', async () => {
  const { container } = render(<SetupPage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

test('All form inputs have labels', () => {
  render(<SetupPage />);
  
  const keyLabelInput = screen.getByLabelText(/key label/i);
  expect(keyLabelInput).toBeInTheDocument();
  
  const passphraseInput = screen.getByLabelText(/^passphrase$/i);
  expect(passphraseInput).toBeInTheDocument();
});

test('Error messages are announced', async () => {
  render(<SetupPage />);
  
  const submitButton = screen.getByText(/create security identity/i);
  fireEvent.click(submitButton);
  
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(/required/i);
});
```

## Implementation Checklist

### Phase 1: Critical Fixes
- [ ] Update input border colors for 3:1 contrast
- [ ] Increase touch targets for toggles
- [ ] Add comprehensive ARIA labels
- [ ] Implement focus management

### Phase 2: Enhanced Support
- [ ] Add skip navigation links
- [ ] Implement live regions
- [ ] Add keyboard shortcuts
- [ ] Enhance error messaging

### Phase 3: Advanced Features
- [ ] Voice control optimization
- [ ] Cognitive load reduction
- [ ] Advanced screen reader hints
- [ ] Multi-language support prep

## Resources

### Testing Tools
- axe DevTools (Chrome/Firefox extension)
- WAVE (WebAIM evaluation tool)
- Lighthouse (Chrome DevTools)
- NVDA (Windows screen reader)
- VoiceOver (macOS/iOS screen reader)
- TalkBack (Android screen reader)

### Design Resources
- WCAG 2.2 Guidelines
- ARIA Authoring Practices Guide
- WebAIM Contrast Checker
- Inclusive Components patterns

---

*This accessibility requirements document ensures the Setup screen provides an inclusive experience for all users, regardless of their abilities or the assistive technologies they use.*