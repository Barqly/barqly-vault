# UI Refactoring Guidelines

**Purpose:** Prevent regressions, maintain consistency, and ensure instant performance during UI refactoring.

**Companion to:** `cache-first-architecture.md` (explains the "what"), this explains the "how"

---

## Golden Rules

### 1. Component-Level Thinking, Not Field-Level

❌ **DON'T:** Manage individual field states across multiple components
```typescript
// BAD: Field-level state
const keyCount = someLogic();
const badges = differentLogic();
const menuBar = anotherLogic();
// These can get out of sync!
```

✅ **DO:** Think in terms of whole components sharing single state source
```typescript
// GOOD: Component-level state
const keys = getCurrentVaultKeys(); // Single source
// All components derive from this
```

**Why:** Prevents race conditions, ensures atomic updates, eliminates flickering.

---

### 2. No Duplicate Components

❌ **DON'T:** Create versioned components
```typescript
// BAD:
VaultHub.tsx
VaultHub_v2.tsx
VaultHubEnhanced.tsx
VaultHub-new.tsx
```

✅ **DO:** Refactor in-place, backup to `docs/engineering/refactoring/ui/backups/`
```bash
# Backup first
cp src/pages/VaultHub.tsx docs/engineering/refactoring/ui/backups/VaultHub.tsx.bak

# Then refactor the original
# Edit src/pages/VaultHub.tsx
```

**Why:** Prevents confusion, reduces tech debt, forces thoughtful changes.

---

### 3. Always Backup First

```bash
cp {source_file} docs/engineering/refactoring/ui/backups/{component}.tsx.bak
```

**Before ANY refactoring.** Rollback is faster than debugging.

---

### 4. Use Centralized State (Workflow Hooks)

❌ **DON'T:** Manage state locally in components
```typescript
// BAD: Local state in component
const [name, setName] = useState('');
const [error, setError] = useState(null);
const [isLoading, setIsLoading] = useState(false);
// State logic scattered across component
```

✅ **DO:** Use workflow hooks (like Encrypt/Decrypt pattern)
```typescript
// GOOD: Centralized state in hook
const useVaultHubWorkflow = () => {
  // All state management here
  const [name, setName] = useState('');
  const handleSubmit = ...;
  return { name, setName, handleSubmit };
};

// Component stays clean
const VaultHub = () => {
  const { name, setName, handleSubmit } = useVaultHubWorkflow();
};
```

**Why:** Consistent architecture, testable logic, reusable patterns.

**Examples:**
- `useEncryptionWorkflow.ts` - Encrypt screen
- `useDecryptionWorkflow.ts` - Decrypt screen
- `useVaultHubWorkflow.ts` - Vault Hub screen

---

### 5. Visual Symmetry Across Screens

**Rule:** Maintain consistent layout structure so transitions feel smooth

✅ **DO:** Use shared components
```typescript
// Every screen should use:
<div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
  <UniversalHeader title="..." icon={...} />
  <AppPrimaryContainer>
    {/* Screen-specific content */}
  </AppPrimaryContainer>
</div>
```

**Why:** Users don't feel jarring layout shifts between screens.

**Shared components:**
- `UniversalHeader` - Consistent header with KeyMenuBar
- `AppPrimaryContainer` - max-w-[960px], centered layout
- `CollapsibleHelp` - Educational content pattern
- `AnimatedTransition` - Smooth state transitions

---

## Cache-First Integration

### When to Use Cache

**Display components** (read-only):
```typescript
const { getCurrentVaultKeys } = useVault();
const keys = getCurrentVaultKeys(); // ✅ Instant, no async
```

**Mutation components** (Manage Keys):
```typescript
const { getCurrentVaultKeys, refreshKeysForVault } = useVault();

// Initial display (cache)
const keys = getCurrentVaultKeys();

// Refresh on mount
useEffect(() => {
  refreshKeysForVault(currentVault.id);
}, [currentVault?.id]);

// After mutations
await addKey(...);
await refreshKeysForVault(currentVault.id); // Update cache
```

**Full details:** See `cache-first-architecture.md`

---

## File Size Targets

**UI components are smaller than backend:**

- **Target:** < 150-200 LOC per component
- **Warning:** 200-300 LOC (needs attention)
- **Critical:** > 300 LOC (refactor immediately)

**Why smaller for UI:**
- Components should be focused, single-purpose
- Easier to test and maintain
- Better reusability

**When file gets too large:**
1. Extract sub-components
2. Extract hooks (state management)
3. Extract utility functions (lib/)

---

## Refactoring Process

### Step-by-Step

1. **Backup original**
   ```bash
   cp src/pages/{Component}.tsx docs/engineering/refactoring/ui/backups/{Component}.tsx.bak
   ```

2. **Analyze current state**
   - Read existing component
   - Identify state management patterns
   - Check what other screens do (reuse patterns!)

3. **Create workflow hook if needed**
   ```typescript
   // src/hooks/use{Screen}Workflow.ts
   export const use{Screen}Workflow = () => {
     // All state management here
   };
   ```

4. **Refactor component**
   - Use shared layout components (UniversalHeader, AppPrimaryContainer)
   - Use workflow hook for state
   - Use cache for key display (if applicable)
   - Keep component < 200 LOC

5. **Format and validate**
   ```bash
   npx prettier --write src/pages/{Component}.tsx
   # Test manually
   ```

6. **Commit**
   ```bash
   git add ... && git commit --no-verify -m "..."
   ```

**One component at a time.** Don't batch multiple components.

---

## UI-Specific Patterns

### Button Placement Consistency

**Rule:** Follow Previous/Continue pattern from Encrypt/Decrypt

```typescript
// Left side: Previous or Cancel
<button type="button" onClick={onPrevious}>Previous</button>
// OR
<button type="button" onClick={onClear}>Clear</button>

// Right side: Primary action
<button type="submit">Create Vault</button>
// OR
<button onClick={onContinue}>Continue</button>
```

**Why:** Users expect primary actions on the right, secondary on the left.

---

### Form Validation

**Rule:** Disable primary button until form is valid

```typescript
<button
  type="submit"
  disabled={isSubmitting || !name.trim()}
  className="... disabled:bg-gray-300 disabled:cursor-not-allowed"
>
  {isSubmitting ? 'Creating...' : 'Create Vault'}
</button>
```

**Why:** Prevents errors, provides visual feedback, better UX.

---

### Loading States

**Rule:** Show loading state inline, not with spinners (cache-first apps)

```typescript
// ✅ Good: Inline loading text
{isSubmitting ? 'Creating...' : 'Create Vault'}

// ❌ Bad: Loading spinner overlay (feels slow)
{isLoading && <LoadingSpinner />}
```

**Exception:** Only show spinner during initial cache population (acceptable).

---

### Error Display

**Rule:** Use ErrorMessage component, positioned at top of content area

```typescript
<AppPrimaryContainer>
  <div className="mt-6 space-y-6">
    {/* Error display - always first */}
    {error && (
      <ErrorMessage
        error={error}
        showRecoveryGuidance={false}
        onClose={clearError}
      />
    )}

    {/* Rest of content */}
  </div>
</AppPrimaryContainer>
```

**Why:** Consistent error UX, user sees errors immediately.

---

## Testing Rules

### What NOT to Test

❌ **Content tests** (labels, text):
```typescript
// BAD:
expect(screen.getByText('Create Vault')).toBeInTheDocument();
expect(button).toHaveTextContent('Continue');
```

❌ **Implementation tests** (CSS, styles):
```typescript
// BAD:
expect(element).toHaveClass('bg-blue-600');
expect(input).toHaveStyle({ padding: '8px' });
```

### What TO Test

✅ **Behavior tests** (functionality):
```typescript
// GOOD:
test('creates vault when form is submitted with valid name', async () => {
  // User action
  await userEvent.type(nameInput, 'My Vault');
  await userEvent.click(submitButton);

  // Behavior verification
  expect(mockCreateVault).toHaveBeenCalledWith('My Vault', undefined);
  expect(mockRefreshVaults).toHaveBeenCalled();
});

test('disables submit button when name is empty', () => {
  expect(submitButton).toBeDisabled();
});

test('clears form when clear button is clicked', async () => {
  await userEvent.type(nameInput, 'Test');
  await userEvent.click(clearButton);
  expect(nameInput).toHaveValue('');
});
```

**Why:** Behavior tests survive UI redesigns, content/style tests break on every change.

---

### Delete Unnecessary Tests

If you find tests that violate these rules:

```bash
# Delete them - they're tech debt
# Example:
git rm src/components/__tests__/VaultHub.content.test.tsx
```

**It's okay to delete tests!** Bad tests are worse than no tests.

---

## Common Mistakes (Avoid These!)

### ❌ Multiple State Sources for Same Data

```typescript
// BAD: Local cache + context cache
const [localKeyCache, setLocalKeyCache] = useState(...);
const { keyCache } = useVault();
// Which one is correct? They'll get out of sync!
```

✅ **Good:**
```typescript
// GOOD: Single source of truth
const { keyCache } = useVault();
// Only one source, always in sync
```

---

### ❌ Async State Updates When Sync is Possible

```typescript
// BAD: Waiting for backend before UI update
const handleSelect = async (vaultId) => {
  await setCurrentVault(vaultId); // UI frozen!
  // UI updates after delay
};
```

✅ **Good:**
```typescript
// GOOD: Sync UI update, async backend (background)
const handleSelect = (vaultId) => {
  setCurrentVault(vaultId); // Instant UI update
  // Backend persists in background
};
```

---

### ❌ Copying Old Patterns

```typescript
// BAD: Just copying old component without understanding
// Copy VaultHub → Paste → Change name to VaultHub_v2
```

✅ **Good:**
```typescript
// GOOD: Understand pattern, adapt to new architecture
// 1. Read existing component
// 2. Check cache-first-architecture.md
// 3. Refactor using new patterns
// 4. Replace original (no duplicates)
```

---

## Quick Refactoring Checklist

When refactoring a screen:

- [ ] Backup original to `docs/engineering/refactoring/ui/backups/`
- [ ] Identify screen type: Display or Mutation?
- [ ] Create workflow hook if complex state (100+ LOC)
- [ ] Use UniversalHeader + AppPrimaryContainer
- [ ] Migrate to cache-first (if uses keys)
  - [ ] Replace `vaultKeys` with `getCurrentVaultKeys()`
  - [ ] Add `refreshKeysForVault()` if mutation screen
- [ ] Check visual symmetry with other screens
- [ ] Keep component < 200 LOC
- [ ] Format with Prettier
- [ ] Test manually (focus on behavior, not content)
- [ ] Delete content/implementation tests if found
- [ ] Commit with `--no-verify`

---

## Key Differences: UI vs Backend

| Aspect | Backend | UI |
|--------|---------|-----|
| **File size** | < 300 LOC | < 150-200 LOC |
| **Language** | Rust | TypeScript/React |
| **State** | Domain models | Hooks + Context |
| **Testing** | Behavior + edge cases | Behavior only (no content) |
| **Architecture** | DDD (Domain/App/Infra) | Cache-first + workflow hooks |
| **Validation** | `make validate-rust` | `make validate-ui` |

---

## Reusable Patterns

### Screen Layout Template

```typescript
import UniversalHeader from '../components/common/UniversalHeader';
import AppPrimaryContainer from '../components/layout/AppPrimaryContainer';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import { use{Screen}Workflow } from '../hooks/use{Screen}Workflow';

const {Screen}Page: React.FC = () => {
  const { /* state */ } = use{Screen}Workflow();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <UniversalHeader title="{Title}" icon={Icon} />

      <AppPrimaryContainer>
        <div className="mt-6 space-y-6">
          {/* Error display */}
          {error && <ErrorMessage error={error} onClose={clearError} />}

          {/* Main content */}
          {/* ... */}

          {/* Help section */}
          <CollapsibleHelp triggerText="How {Feature} Works" context="{context}" />
        </div>
      </AppPrimaryContainer>
    </div>
  );
};
```

---

### Workflow Hook Template

```typescript
import { useState, useCallback } from 'react';
import { useVault } from '../contexts/VaultContext';

export const use{Screen}Workflow = () => {
  const { /* context values */ } = useVault();

  // Local state
  const [formData, setFormData] = useState(...);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handlers
  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    try {
      await backendCall();
      // Success handling
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [dependencies]);

  return {
    // State
    formData,
    error,
    isLoading,

    // Setters
    setFormData,

    // Handlers
    handleSubmit,
    clearError: () => setError(null),
  };
};
```

---

### Button Layout Pattern

```typescript
{/* Buttons: Secondary (left) / Primary (right) */}
<div className="flex justify-between items-center pt-2">
  <button
    type="button"
    onClick={handleSecondaryAction}
    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
  >
    Clear / Cancel / Previous
  </button>
  <button
    type="submit"
    disabled={!isValid || isLoading}
    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
  >
    {isLoading ? 'Loading...' : 'Primary Action'}
  </button>
</div>
```

**Consistency:** Secondary left, Primary right (matches Encrypt/Decrypt).

---

## Visual Consistency Rules

### 1. Layout Constraints

**Max width:** 960px (enforced by AppPrimaryContainer)
```typescript
<AppPrimaryContainer> // max-w-[960px] mx-auto px-6
```

**Vertical spacing:** Consistent `space-y-6`
```typescript
<div className="mt-6 space-y-6">
```

**Why:** Content doesn't jump around when navigating between screens.

---

### 2. Color Palette

**Primary actions:** Blue (`bg-blue-600`, `hover:bg-blue-700`)
**Destructive actions:** Red (`bg-red-600`, `hover:bg-red-700`)
**Secondary actions:** Gray (`bg-gray-100`, `hover:bg-gray-200`)

**Badges:**
- Passphrase: Green (`bg-green-100 text-green-700`)
- YubiKey: Purple (`bg-purple-100 text-purple-700`)

**Why:** Consistent visual language across app.

---

### 3. Form Inputs

**Standard input:**
```typescript
<input
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
/>
```

**Textarea:**
```typescript
<textarea
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 resize-none"
  rows={3}
/>
```

**Why:** Consistent focus states, accessible, familiar to users.

---

## State Management Patterns

### Pattern 1: Display-Only Screen

**Example:** VaultHub (displays vaults, no complex workflow)

```typescript
const VaultHub = () => {
  const { currentVault, vaults, getCurrentVaultKeys } = useVault();
  const { name, handleSubmit } = useVaultHubWorkflow();

  // Simple handlers
  const handleSelect = (vaultId: string) => {
    setCurrentVault(vaultId); // Sync, instant
  };

  return (/* JSX */);
};
```

**Characteristics:**
- Uses context for global state
- Uses workflow hook for form state
- Simple handlers, no complex orchestration

---

### Pattern 2: Multi-Step Workflow Screen

**Example:** Encrypt, Decrypt (progressive disclosure)

```typescript
const EncryptPage = () => {
  const {
    currentStep,
    selectedFiles,
    handleFilesSelected,
    handleStepNavigation,
    handleEncryption,
    // ... all state + handlers from workflow hook
  } = useEncryptionWorkflow();

  return (
    <AppPrimaryContainer>
      {/* Progress bar */}
      <ProgressBar steps={STEPS} currentStep={currentStep} />

      {/* Step-based content */}
      {currentStep === 1 && <StepOne />}
      {currentStep === 2 && <StepTwo />}
    </AppPrimaryContainer>
  );
};
```

**Characteristics:**
- Heavy workflow hook (200+ LOC)
- Component stays thin (< 200 LOC)
- Step-based progressive disclosure

---

### Pattern 3: Mutation Screen

**Example:** Manage Keys (add/remove keys)

```typescript
const ManageKeys = () => {
  const { getCurrentVaultKeys, refreshKeysForVault } = useVault();

  // Display from cache
  const keys = getCurrentVaultKeys();

  // Refresh on mount
  useEffect(() => {
    refreshKeysForVault(currentVault.id);
  }, [currentVault?.id]);

  // Mutations update cache
  const handleAddKey = async () => {
    await addKeyToVault(...);
    await refreshKeysForVault(currentVault.id);
  };
};
```

**Characteristics:**
- Reads from cache for instant display
- Explicit refresh on mount
- Updates cache after mutations

---

## Migration Decision Tree

```
Is this screen complex (multi-step workflow)?
├─ YES → Create workflow hook (see useEncryptionWorkflow.ts)
└─ NO → Simple component with inline handlers

Does this screen use vault keys?
├─ YES → Use getCurrentVaultKeys() from cache
└─ NO → No cache needed

Does this screen mutate data (add/remove keys)?
├─ YES → Call refreshKeysForVault() after mutations
└─ NO → Read-only cache access

Does this screen have > 150 LOC?
├─ YES → Extract sub-components or hooks
└─ NO → Keep as-is
```

---

## Validation Workflow

After refactoring:

```bash
# 1. Format
npx prettier --write src/pages/{Component}.tsx

# 2. Type check (optional - we skip for speed)
# npm run type-check

# 3. Manual testing
make app
# Test all user flows

# 4. Commit
git add ... && git commit --no-verify -m "..."
```

**Note:** We use `--no-verify` to skip pre-commit hooks for speed during refactoring. Final commit before PR should run full `make validate`.

---

## When to Extract Components

### Extract when:

1. **Repeated code** - Same pattern used 2+ times
2. **Component > 200 LOC** - Break into smaller pieces
3. **Separate concerns** - Mix of display + logic
4. **Reusable** - Could be used on other screens

### Example: Progressive Cards

**Before:** 150 LOC in EncryptPage.tsx for card logic

**After:**
- `ProgressiveEncryptionCards.tsx` - Extracted component
- `EncryptPage.tsx` - Clean, focused on workflow

**Result:** Both files < 200 LOC, reusable pattern.

---

## Key Learnings from VaultHub Refactor

### What Worked Well ✅

1. **Inline form** - Reduced clicks from 2 → 1
2. **Workflow hook** - Clean separation of concerns
3. **Cache-first** - Eliminated all flickering
4. **Component-level thinking** - Fixed race conditions
5. **Backup first** - Easy rollback if needed

### What to Avoid ❌

1. **Local caching** - Use VaultContext.keyCache instead
2. **Field-level state** - Think component-level
3. **Async when sync possible** - setCurrentVault() is now sync
4. **Auto-refresh effects** - Caused race conditions

---

## Related Documents

- `cache-first-architecture.md` - Cache-first pattern (WHAT)
- This document - Refactoring process (HOW)
- `/docs/engineering/refactoring/refactoring-guidelines.md` - Backend guidelines
- `/docs/common/quality-standards.md` - Testing standards

---

## Quick Reference

### File Locations

```
src-ui/src/
├── hooks/              # Workflow hooks (state management)
│   ├── useEncryptionWorkflow.ts
│   ├── useDecryptionWorkflow.ts
│   └── useVaultHubWorkflow.ts
├── contexts/           # Global state providers
│   └── VaultContext.tsx
├── components/
│   ├── common/         # Shared layout (UniversalHeader)
│   ├── layout/         # Containers (AppPrimaryContainer)
│   └── ui/             # Reusable UI (CollapsibleHelp, ErrorMessage)
└── pages/              # Screen components (< 200 LOC each)
    ├── VaultHub.tsx
    ├── EncryptPage.tsx
    └── DecryptPage.tsx
```

### Backup Location

```
docs/engineering/refactoring/ui/backups/
├── VaultHub.tsx.bak
├── VaultContext.tsx.bak
└── {Component}.tsx.bak
```

---

## Summary: UI Refactoring Philosophy

1. **Component-level thinking** - Not field-level
2. **Cache-first reads** - Instant performance
3. **Explicit mutations** - Clear data flow
4. **Visual consistency** - Symmetric layouts
5. **Centralized state** - Workflow hooks
6. **No duplicates** - Refactor in-place
7. **Behavior tests only** - No content/style tests
8. **Small files** - < 200 LOC

**Goal:** Transform from web-app async patterns → desktop-app instant responsiveness

---

_Working UI is sacred. Refactor to improve architecture, not to rewrite from scratch._
