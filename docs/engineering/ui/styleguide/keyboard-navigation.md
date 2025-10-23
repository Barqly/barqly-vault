# Keyboard Navigation Patterns

**Version:** 1.0
**Last Updated:** 2025-10-22

---

## Overview

This document outlines the keyboard navigation patterns implemented in the Barqly Vault application, particularly focusing on complex interactions like custom dropdowns, focus traps, and multi-step workflows.

---

## Focus Trap Implementation

### File Selection Buttons (Encrypt/Decrypt Flow)

**Pattern:** Tab cycles between "Select Files" and "Select Folder" buttons when both are visible.

**Implementation:**
```tsx
const handleKeyDown = useCallback(
  (e: React.KeyboardEvent<HTMLButtonElement>, isFirstButton: boolean) => {
    if (!showFolderButton || disabled) return;
    if (e.key === 'Tab') {
      if (isFirstButton && !e.shiftKey) {
        e.preventDefault();
        browseFolderButtonRef.current?.focus();
      } else if (!isFirstButton && !e.shiftKey) {
        e.preventDefault();
        browseButtonRef.current?.focus();
      }
    }
  },
  [showFolderButton, disabled]
);
```

**Key Points:**
- Only trap focus when both buttons are visible
- Allow Shift+Tab to escape the trap naturally
- Prevents tab from leaving the button group unintentionally

---

## Custom Dropdown Navigation

### Vault Selection Dropdown

**Pattern:** Full keyboard support following W3C ARIA Authoring Practices for combobox pattern.

**Keyboard Interactions:**
- **Closed State:**
  - `Enter` or `Space`: Opens dropdown
  - `ArrowDown`: Opens dropdown with first item focused
  - `ArrowUp`: Opens dropdown with last item focused

- **Open State:**
  - `ArrowDown`: Move focus to next item (wraps to first)
  - `ArrowUp`: Move focus to previous item (wraps to last)
  - `Enter` or `Space`: Select focused item and close
  - `Escape`: Close without selection
  - `Tab`: Close dropdown and move focus naturally

**Implementation Architecture:**
```tsx
// 1. Component-level state
const [isDropdownOpen, setIsDropdownOpen] = useState(false);
const [focusedIndex, setFocusedIndex] = useState<number>(-1);

// 2. Document-level keyboard handler with capture phase
useEffect(() => {
  if (!isDropdownOpen) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault(); // Prevent page scroll
        if (focusedIndex === -1) {
          setFocusedIndex(0);
        } else {
          setFocusedIndex(prev => (prev < maxIndex ? prev + 1 : 0));
        }
        break;

      case 'Enter':
        if (focusedIndex >= 0 && focusedIndex <= maxIndex) {
          e.preventDefault();
          e.stopPropagation(); // Prevent bubbling conflicts
          const selectedVault = sortedVaults[focusedIndex];
          onVaultChange(selectedVault.id);
          setIsDropdownOpen(false);
          setFocusedIndex(-1);
          // Focus next logical element
          setTimeout(() => {
            continueButtonRef.current?.focus();
          }, 50);
        }
        break;
    }
  };

  // Use capture phase to intercept before bubbling
  document.addEventListener('keydown', handleKeyDown, true);
  return () => document.removeEventListener('keydown', handleKeyDown, true);
}, [isDropdownOpen, focusedIndex, vaultsWithKeys, onVaultChange]);
```

**Critical Lessons Learned:**
1. **Event Phase Management:** Use capture phase (`true` flag) for document handlers to intercept events before component handlers
2. **State Initialization:** Start `focusedIndex` at `-1` to indicate no selection
3. **Prevent Default:** Always prevent default on arrow keys to stop page scrolling
4. **Focus Management:** Set next focus target after selection for smooth flow
5. **Sorted Data:** Ensure dropdown items are sorted consistently for predictable navigation

---

## Multi-Step Workflow Navigation

### Step Progression Pattern

**Auto-Advance:**
- Step 1 → Step 2: Automatic on file selection
- Step 2 → Step 3: Manual via "Encrypt Now" button

**Implementation:**
```tsx
// Track previous state to detect initial selection vs navigation
const [prevSelectedFiles, setPrevSelectedFiles] = useState(null);

useEffect(() => {
  if (selectedFiles && !prevSelectedFiles && currentStep === 1) {
    setCurrentStep(2);
  }
  setPrevSelectedFiles(selectedFiles);
}, [selectedFiles, prevSelectedFiles, currentStep]);
```

**Key Points:**
- Distinguish between initial action and back navigation
- Only auto-advance on first selection, not when returning to step

---

## Animation and Transition Timing

### Progress View Minimum Display Time

**Problem:** Quick operations flash progress view too briefly, causing jarring UX.

**Solution:** Ensure minimum display time for progress indicators.

```tsx
const encryptionStartTime = Date.now();
const result = await commands.encryptFilesMulti(input);

// Calculate actual duration
const encryptionDuration = Date.now() - encryptionStartTime;

// Ensure minimum visibility (1.5 seconds)
const minimumProgressTime = 1500;
if (encryptionDuration < minimumProgressTime) {
  await new Promise(resolve =>
    setTimeout(resolve, minimumProgressTime - encryptionDuration)
  );
}
```

### File Replacement Dialog Flow

**Pattern:** Smooth continuation when user confirms file overwrite.

```tsx
if (response.file_exists_warning) {
  const shouldOverwrite = await confirm(...);

  if (shouldOverwrite) {
    // Small delay for visual continuity
    await new Promise(resolve => setTimeout(resolve, 100));

    // Retry with same progress view
    const retryResult = await commands.encryptFilesMulti(input);

    // Smooth transition to success
    await new Promise(resolve => setTimeout(resolve, 200));
    processSuccessfulEncryption(retryResponse);
  }
}
```

---

## Dark Theme Considerations

### Focus States

**Pattern:** Use consistent focus rings that work in both themes.

```tsx
// Standard focus ring
className="focus:outline-none focus:ring-2 focus:ring-blue-500"

// Custom dropdown with dynamic border
style={{
  borderColor: isSelected ? '#3B82F6' : 'rgb(var(--border-default))',
  boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none'
}}
```

### Dropdown Menu Items

```tsx
// Hover and focus states
className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
  isFocused ? 'ring-2 ring-blue-500 ring-inset' : ''
}`}
style={{
  backgroundColor: isSelected
    ? 'rgba(59, 130, 246, 0.1)'  // Selected
    : isFocused
      ? 'rgba(59, 130, 246, 0.05)' // Focused
      : 'transparent'
}}
```

---

## Best Practices

1. **Always test keyboard navigation without mouse**
2. **Ensure visual focus indicators are clear**
3. **Prevent page scroll on arrow keys in custom controls**
4. **Use semantic HTML where possible (native select vs custom)**
5. **Follow W3C ARIA patterns for complex widgets**
6. **Test focus flow makes logical sense**
7. **Ensure tab order matches visual layout**
8. **Provide escape hatches (Esc key, click outside)**
9. **Auto-focus appropriate elements after state changes**
10. **Maintain focus visibility in both light and dark themes**