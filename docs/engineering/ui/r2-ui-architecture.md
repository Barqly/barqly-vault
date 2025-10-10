# R2 UI Architecture

**Purpose:** Technical patterns and architecture decisions for R2 UI redesign
**Status:** Active implementation guide

---

## Component Architecture

### Hierarchy Pattern
```
Pages (Screens)           # < 150 LOC orchestrators
  └── Workflow Hooks      # Business logic & state
      └── Components      # Visual presentation
          └── UI Atoms    # Reusable primitives
```

### File Organization
```
src-ui/src/
├── hooks/
│   ├── useVaultHubWorkflow.ts
│   ├── useManageKeysWorkflow.ts
│   ├── useEncryptionWorkflow.ts
│   └── useDecryptionWorkflow.ts
├── contexts/
│   ├── VaultContext.tsx     # Global vault/key cache
│   └── UIContext.tsx        # UI preferences (NEW)
├── components/
│   ├── common/
│   │   ├── UniversalHeader.tsx
│   │   └── SidebarNav.tsx  # NEW
│   ├── layout/
│   │   ├── AppPrimaryContainer.tsx
│   │   └── MainLayout.tsx
│   ├── ui/
│   │   ├── Card.tsx
│   │   ├── Button.tsx
│   │   └── Badge.tsx
│   ├── vault/
│   │   ├── VaultCard.tsx
│   │   └── VaultCreateForm.tsx
│   └── keys/
│       ├── KeyCard.tsx
│       └── KeyTable.tsx
└── pages/
    ├── VaultHub.tsx
    ├── ManageKeysPage.tsx
    ├── EncryptPage.tsx
    └── DecryptPage.tsx
```

---

## State Management Patterns

### 1. Global State (Contexts)

**VaultContext (Existing - Enhanced)**
```typescript
interface VaultContextValue {
  // State
  currentVault: VaultSummary | null;
  vaults: VaultSummary[];
  keyCache: Map<string, KeyReference[]>;  // Global cache

  // Actions (Synchronous)
  setCurrentVault: (vaultId: string) => void;
  getCurrentVaultKeys: () => KeyReference[];  // Instant cache read

  // Actions (Async)
  refreshKeysForVault: (vaultId: string) => Promise<void>;
  createVault: (name: string, desc?: string) => Promise<void>;
  removeKeyFromVault: (keyId: string) => Promise<void>;
}
```

**UIContext (New)**
```typescript
interface UIContextValue {
  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: Theme) => void;

  // View Modes
  keyViewMode: 'cards' | 'table';
  setKeyViewMode: (mode: ViewMode) => void;

  // Persistence
  savePreferences: () => void;
  loadPreferences: () => void;
}
```

### 2. Screen State (Workflow Hooks)

**Pattern Template:**
```typescript
export const use{Feature}Workflow = () => {
  const { /* global context */ } = useVault();

  // Local state
  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handlers
  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    try {
      await commands.someCommand(formData);
      // Update cache if needed
      await refreshKeysForVault(currentVault.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [formData, currentVault]);

  return {
    // State
    formData,
    error,
    isLoading,

    // Actions
    setFormData,
    handleSubmit,
    clearError: () => setError(null),
  };
};
```

### 3. Component State

**Minimal, UI-only:**
```typescript
const Component = () => {
  const [isExpanded, setIsExpanded] = useState(false);  // UI state only
  const { data, handleSubmit } = useWorkflow();  // Business logic from hook

  return <div>...</div>;
};
```

---

## Cache-First Architecture

### Read Pattern (Display Components)
```typescript
const DisplayComponent = () => {
  const { getCurrentVaultKeys } = useVault();
  const keys = getCurrentVaultKeys();  // Instant, no loading

  return <div>{keys.map(key => <KeyCard key={key.id} {...key} />)}</div>;
};
```

### Write Pattern (Mutation Components)
```typescript
const MutationComponent = () => {
  const { getCurrentVaultKeys, refreshKeysForVault, currentVault } = useVault();

  // Display from cache immediately
  const keys = getCurrentVaultKeys();

  // Refresh on mount to ensure fresh
  useEffect(() => {
    if (currentVault) {
      refreshKeysForVault(currentVault.id);
    }
  }, [currentVault?.id]);

  // Update cache after mutations
  const handleAddKey = async () => {
    await commands.addKey(...);
    await refreshKeysForVault(currentVault.id);
  };
};
```

---

## Navigation Architecture

### Sidebar Structure
```typescript
interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: () => ReactNode;  // Dynamic badges
}

const navItems: NavItem[] = [
  {
    id: 'vault-hub',
    label: 'Vault Hub',
    icon: Archive,
    path: '/',
    badge: () => <Badge>{vaultCount}</Badge>,
  },
  {
    id: 'manage-keys',
    label: 'Manage Keys',
    icon: Key,
    path: '/keys',
    badge: () => <Badge>{keyCount}</Badge>,
  },
  // ...
];
```

### Route Structure
```typescript
<Routes>
  <Route path="/" element={<VaultHub />} />
  <Route path="/keys" element={<ManageKeysPage />} />
  <Route path="/encrypt" element={<EncryptPage />} />
  <Route path="/decrypt" element={<DecryptPage />} />
  <Route path="/settings" element={<Settings />} />
</Routes>
```

---

## Component Patterns

### Card Component
```typescript
interface CardProps {
  variant?: 'default' | 'active' | 'hover';
  interactive?: boolean;
  children: ReactNode;
}

// Usage
<Card variant="active" interactive>
  <CardHeader>
    <CardTitle>Vault Name</CardTitle>
    <CardBadges>
      <Badge variant="passphrase">1</Badge>
      <Badge variant="yubikey">3</Badge>
    </CardBadges>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardActions>...</CardActions>
</Card>
```

### Progressive Disclosure
```typescript
interface ProgressiveStep {
  id: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

// Usage in multi-step flows
<ProgressiveCards
  steps={steps}
  currentStep={currentStep}
  onStepChange={handleStepChange}
>
  {currentStep === 1 && <StepOne />}
  {currentStep === 2 && <StepTwo />}
  {currentStep === 3 && <StepThree />}
</ProgressiveCards>
```

---

## Backend Integration

### Command Pattern
```typescript
// All backend calls through commands
import * as commands from '../lib/bindings';

// Type-safe command calls
const result = await commands.encryptFilesMulti({
  vault_id: currentVault.id,
  in_file_paths: selectedFiles,
  out_encrypted_file_name: fileName,
  out_encrypted_file_path: outputPath,
});
```

### Error Handling
```typescript
try {
  const result = await commands.someCommand(input);
  // Success handling
} catch (error) {
  if (error.code === 'KEY_NOT_FOUND') {
    // Specific error handling
  } else {
    // Generic error display
    setError(error.message);
  }
}
```

---

## Performance Patterns

### Lazy Loading
```typescript
const KeyTable = lazy(() => import('./components/keys/KeyTable'));

// Usage
{viewMode === 'table' && (
  <Suspense fallback={<div>Loading...</div>}>
    <KeyTable keys={keys} />
  </Suspense>
)}
```

### Memoization
```typescript
const ExpensiveComponent = memo(({ data }) => {
  const processed = useMemo(() =>
    expensiveProcessing(data), [data]
  );

  return <div>{processed}</div>;
});
```

---

## Testing Patterns

### Component Tests (Future)
```typescript
describe('VaultCard', () => {
  it('displays vault name and key count', () => {
    render(<VaultCard vault={mockVault} />);
    expect(screen.getByText('My Vault')).toBeInTheDocument();
    expect(screen.getByText('3 keys')).toBeInTheDocument();
  });

  it('handles click to select vault', async () => {
    const handleSelect = jest.fn();
    render(<VaultCard vault={mockVault} onSelect={handleSelect} />);

    await userEvent.click(screen.getByRole('button'));
    expect(handleSelect).toHaveBeenCalledWith(mockVault.id);
  });
});
```

### Workflow Hook Tests
```typescript
describe('useVaultHubWorkflow', () => {
  it('creates vault with valid input', async () => {
    const { result } = renderHook(() => useVaultHubWorkflow());

    await act(async () => {
      await result.current.createVault('New Vault', 'Description');
    });

    expect(mockCommands.createVault).toHaveBeenCalledWith({
      name: 'New Vault',
      description: 'Description',
    });
  });
});
```

---

## Accessibility Patterns

### Keyboard Navigation
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'Enter':
      if (!isSubmitting) handleSubmit();
      break;
    case 'Escape':
      handleCancel();
      break;
    case 'Tab':
      // Let default tab order work
      break;
  }
};
```

### ARIA Labels
```typescript
<button
  aria-label="Create new vault"
  aria-pressed={isActive}
  aria-busy={isLoading}
  role="button"
>
  Create Vault
</button>
```

---

## Migration Strategy

### Phase-by-Phase
1. **Backup** original component
2. **Refactor** in place (no duplicates)
3. **Test** manually
4. **Commit** with --no-verify
5. **Document** changes in handoff

### Compatibility
- Keep existing workflow hooks where possible
- Enhance VaultContext (don't break it)
- Add UIContext alongside (new feature)
- Maintain backend command interface

---

## Code Quality Checklist

- [ ] Component < 150-200 LOC
- [ ] State in appropriate location (global/hook/local)
- [ ] Cache-first for display components
- [ ] Explicit refresh for mutations
- [ ] Error handling with recovery guidance
- [ ] Loading states (inline, not spinners)
- [ ] Keyboard accessible
- [ ] Color tokens applied
- [ ] TypeScript types from bindings

---

_This architecture guide ensures consistency across the R2 redesign._