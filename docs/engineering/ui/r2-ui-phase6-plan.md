# Phase 6: Visual Polish and Consistency

**Timeline:** Day 6 (6-7 hours)
**Priority:** High - Final quality pass
**Dependencies:** Phases 1-5 completion

---

## Objectives

1. Apply design system consistently
2. Implement dark mode support
3. Add keyboard navigation
4. Create error/empty states
5. Performance optimization
6. Final testing and validation

---

## Tasks Breakdown

### Task 6.1: Apply Color Token System (90 min)

**Files to Update:** All component files

**Color Token Checklist:**
- [ ] Replace all hardcoded colors with tokens
- [ ] Verify contrast ratios (WCAG AA)
- [ ] Consistent hover/active states
- [ ] Update badge colors (passphrase/yubikey)
- [ ] Border colors unified

**Token Mapping:**
```typescript
// Create theme constants
const theme = {
  colors: {
    primary: {
      600: '#2563EB',
      700: '#1D4ED8',
      50: '#EFF6FF',
    },
    slate: {
      800: '#1E293B',
      700: '#334155',
      500: '#64748B',
      400: '#94A3B8',
      200: '#E2E8F0',
      100: '#F1F5F9',
    },
    semantic: {
      passphrase: {
        bg: '#DCFCE7',
        text: '#15803D',
      },
      yubikey: {
        bg: '#F3E8FF',
        text: '#6B21A8',
      },
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    }
  }
};
```

### Task 6.2: Implement Dark Mode Support (120 min)

**Create ThemeContext:**
**File:** `src-ui/src/contexts/ThemeContext.tsx`

```typescript
interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}
```

**Dark Mode Colors:**
```css
/* Dark mode palette */
.dark {
  --bg-primary: #0F172A; /* slate-900 */
  --bg-secondary: #1E293B; /* slate-800 */
  --text-primary: #F1F5F9; /* slate-100 */
  --text-secondary: #94A3B8; /* slate-400 */
  --border: #334155; /* slate-700 */
}
```

**Component Updates:**
- Add dark mode classes to all components
- Test visual hierarchy in both modes
- Ensure sufficient contrast
- Update shadows and elevations

### Task 6.3: Keyboard Navigation Enhancement (60 min)

**Global Keyboard Shortcuts:**
```typescript
const globalShortcuts = {
  'cmd+k': 'Open command palette', // Future
  'cmd+,': 'Open settings',
  'cmd+1': 'Go to Vault Hub',
  'cmd+2': 'Go to Manage Keys',
  'cmd+3': 'Go to Encrypt',
  'cmd+4': 'Go to Decrypt',
  'esc': 'Cancel/close modals',
};
```

**Component-Level Navigation:**
- Tab order verification
- Enter to submit forms
- Arrow keys in lists
- Space to select
- Escape to cancel

**Implementation:**
```typescript
const useKeyboardNavigation = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case '1':
            navigate('/');
            break;
          case '2':
            navigate('/keys');
            break;
          // ...
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
};
```

### Task 6.4: Create Error States (60 min)

**Error State Components:**

**File:** `src-ui/src/components/ui/ErrorState.tsx`

```
┌─────────────────────────────────────┐
│                                     │
│         ⚠️ Error Icon               │
│                                     │
│      Something went wrong           │
│                                     │
│  {Specific error message here}      │
│                                     │
│    [Try Again] [Go Back]            │
│                                     │
└─────────────────────────────────────┘
```

**Error Scenarios:**
- Network errors (future)
- File not found
- Invalid key
- Permission denied
- Corrupted vault
- YubiKey not detected

### Task 6.5: Create Empty States (45 min)

**Empty State Templates:**

```typescript
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Screen-Specific Empty States:**
- No vaults (Vault Hub)
- No keys (Manage Keys)
- No files selected (Encrypt)
- No vault file (Decrypt)

### Task 6.6: Performance Optimization (60 min)

**Optimization Checklist:**
- [ ] Implement React.memo where needed
- [ ] Use useMemo for expensive calculations
- [ ] Lazy load heavy components
- [ ] Optimize re-renders
- [ ] Check bundle size
- [ ] Profile performance

**Code Splitting:**
```typescript
// Lazy load table view (advanced mode)
const KeyTable = lazy(() => import('./components/keys/KeyTable'));

// Lazy load help content
const HelpContent = lazy(() => import('./components/help/HelpContent'));
```

**Memoization:**
```typescript
const MemoizedVaultCard = memo(VaultCard, (prev, next) => {
  return prev.vault.id === next.vault.id &&
         prev.isActive === next.isActive;
});
```

### Task 6.7: Component Consistency Pass (45 min)

**Consistency Checklist:**
- [ ] All screens use UniversalHeader
- [ ] All screens use AppPrimaryContainer
- [ ] Button patterns consistent
- [ ] Form layouts unified
- [ ] Loading states inline
- [ ] Error display consistent
- [ ] Spacing uniform (space-y-6)

### Task 6.8: Final Testing & Validation (90 min)

**Manual Testing Matrix:**

| Feature | Light Mode | Dark Mode | Keyboard | Error States |
|---------|------------|-----------|----------|--------------|
| Vault Hub | ✓ | ✓ | ✓ | ✓ |
| Manage Keys | ✓ | ✓ | ✓ | ✓ |
| Encrypt | ✓ | ✓ | ✓ | ✓ |
| Decrypt | ✓ | ✓ | ✓ | ✓ |
| Navigation | ✓ | ✓ | ✓ | ✓ |

**Performance Metrics:**
- [ ] Initial load < 2s
- [ ] Navigation instant (cache-first)
- [ ] No layout shifts
- [ ] Smooth animations (60fps)
- [ ] Bundle size < 500KB

---

## Accessibility Checklist

### WCAG 2.1 AA Compliance
- [ ] Color contrast 4.5:1 minimum
- [ ] Focus indicators visible
- [ ] Keyboard navigation complete
- [ ] ARIA labels present
- [ ] Screen reader tested
- [ ] No color-only information
- [ ] Error messages associated

### Testing Tools
```bash
# Run accessibility audit
npm run audit:a11y

# Check color contrast
npm run check:contrast
```

---

## Polish Details

### Micro-interactions
```css
/* Subtle hover effects */
.interactive-element {
  transition: all 150ms ease;
}

.interactive-element:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

/* Focus rings */
.interactive-element:focus-visible {
  outline: 2px solid var(--bv-blue-600);
  outline-offset: 2px;
}
```

### Loading States
```typescript
// Inline loading text
<button disabled={isLoading}>
  {isLoading ? 'Creating...' : 'Create Vault'}
</button>

// Skeleton loaders for content
{isLoading ? (
  <div className="animate-pulse">
    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
    <div className="h-4 bg-slate-200 rounded w-1/2" />
  </div>
) : (
  <Content />
)}
```

---

## Documentation Updates

### Update Docs
- [ ] Update r2-redesign-overview.md with completion
- [ ] Document any deviations from plan
- [ ] List known issues for future
- [ ] Update API documentation if needed
- [ ] Create user guide (future)

### Code Comments
```typescript
/**
 * VaultCard - Displays vault information with key badges
 *
 * Features:
 * - Visual key indicators (passphrase/yubikey)
 * - Active state highlighting
 * - Drag & drop support for key attachment
 * - Quick actions (encrypt, manage keys, delete)
 */
```

---

## Final Validation

### Pre-Release Checklist
- [ ] All components < 200 LOC
- [ ] No console errors/warnings
- [ ] Tests disabled with --no-verify
- [ ] Documentation complete
- [ ] Dark mode functional
- [ ] Keyboard navigation works
- [ ] Error states handled
- [ ] Empty states present
- [ ] Performance acceptable

### Build Validation
```bash
# Type check
npm run type-check

# Format check
npm run format:check

# Build production
npm run build

# Test build locally
npm run preview
```

---

## Rollback Plan

If critical issues found:
1. Restore from backups in `docs/engineering/ui/backups/`
2. Git revert problematic commits
3. Document issues for resolution
4. Communicate with team

---

## Success Metrics

### Quantitative
- Bundle size < 500KB
- Load time < 2s
- 60fps animations
- Zero console errors

### Qualitative
- Professional appearance
- Consistent experience
- Intuitive navigation
- Clear feedback
- Accessible to all users

---

## Known Limitations

Document for future:
1. Mobile responsiveness (desktop only for now)
2. Advanced keyboard shortcuts (partial)
3. Full internationalization (English only)
4. Comprehensive test coverage (manual for now)
5. Animation preferences (no reduce-motion yet)

---

## Handoff Documentation

Create final handoff:
- Summary of all changes
- Screenshots of new UI
- Performance metrics
- Known issues list
- Recommendations for future

---

_This plan completes the R2 UI redesign with polish and consistency._