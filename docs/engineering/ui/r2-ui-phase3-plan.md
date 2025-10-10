# Phase 3: Vault Hub Redesign

**Timeline:** Day 3 (5-6 hours)
**Priority:** High - Primary landing experience
**Dependencies:** Phase 2 completion (key management)

---

## Objectives

1. Create vault-centric landing page
2. Visual vault cards with key badges
3. Inline vault creation (no modal)
4. Drag-to-attach keys interface
5. Quick actions per vault

---

## Tasks Breakdown

### Task 3.1: Enhance useVaultHubWorkflow Hook (45 min)
**File:** `src-ui/src/hooks/useVaultHubWorkflow.ts` (existing, enhance)

**Add State:**
```typescript
interface VaultHubWorkflowState {
  // Existing
  isCreatingVault: boolean;
  vaultName: string;
  vaultDescription: string;

  // New additions
  selectedVault: string | null;
  isDraggingKey: boolean;
  draggedKeyId: string | null;
  isShowingDetails: Map<string, boolean>;

  // Vault operations
  isDeletingVault: boolean;
  vaultToDelete: string | null;
}
```

**New Operations:**
- Quick encrypt from card
- Inline key attachment
- Vault deletion with confirmation
- Vault details expansion

### Task 3.2: Redesign VaultCard Component (90 min)
**File:** `src-ui/src/components/vault/VaultCard.tsx`

**New Visual Design:**
```
┌─────────────────────────────────────┐
│ ┌─────┐                             │
│ │ 🗄️  │  Personal Documents   [···] │
│ └─────┘  Family photos & docs       │
│                                      │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐               │
│ │🔑│ │🔐│ │🔐│ │ + │  4 keys max   │
│ └──┘ └──┘ └──┘ └──┘               │
│                                      │
│ Last: 2 hours ago • 125 MB • 42 files│
├─────────────────────────────────────┤
│ [🔒 Encrypt] [🔑 Keys] [⚙️]         │
└─────────────────────────────────────┘
```

**Features:**
- Active vault indicator (blue border)
- Key badges (passphrase green, YubiKey purple)
- Empty key slots (dashed border)
- Drag & drop zone for keys
- Quick action buttons
- Expandable details

**Props:**
```typescript
interface VaultCardProps {
  vault: VaultSummary;
  keys: KeyReference[];
  isActive: boolean;
  isDropTarget?: boolean;
  onSelect: () => void;
  onEncrypt: () => void;
  onManageKeys: () => void;
  onDelete: () => void;
  onKeyDrop?: (keyId: string) => void;
}
```

### Task 3.3: Create Inline VaultCreateForm (60 min)
**File:** `src-ui/src/components/vault/VaultCreateForm.tsx`

**Design:**
```
┌─────────────────────────────────────┐
│ ➕ Create New Vault                 │
├─────────────────────────────────────┤
│ Name *                              │
│ ┌─────────────────────────────────┐ │
│ │ My Vault                        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Description (optional)              │
│ ┌─────────────────────────────────┐ │
│ │ Brief description...            │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Clear]            [Create Vault]   │
└─────────────────────────────────────┘
```

**Features:**
- Inline form (not modal)
- Collapsible when not in use
- Auto-focus on expand
- Validation feedback
- Success animation

### Task 3.4: Implement KeyDragProvider (60 min)
**File:** `src-ui/src/components/vault/KeyDragProvider.tsx`

**Drag & Drop System:**
```typescript
interface DragContext {
  isDragging: boolean;
  draggedKey: KeyReference | null;
  dropTarget: string | null;

  startDrag: (key: KeyReference) => void;
  endDrag: () => void;
  setDropTarget: (vaultId: string | null) => void;
}
```

**Visual Feedback:**
- Key being dragged (ghost image)
- Valid drop zones highlighted
- Invalid zones grayed out
- Drop preview on hover
- Success animation on drop

### Task 3.5: Create VaultEmptyState (30 min)
**File:** `src-ui/src/components/vault/VaultEmptyState.tsx`

**Design:**
```
┌─────────────────────────────────────┐
│                                     │
│            [🗄️ Icon]                │
│                                     │
│         No vaults yet               │
│                                     │
│    Create your first vault to       │
│    start protecting your data       │
│                                     │
│       [+ Create First Vault]        │
│                                     │
└─────────────────────────────────────┘
```

### Task 3.6: Update VaultHub Page (90 min)
**File:** `src-ui/src/pages/VaultHub.tsx`

**New Layout:**
```tsx
<div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
  <UniversalHeader
    title="Vault Hub"
    icon={Archive}
    description="Manage your encrypted vaults"
  />

  <AppPrimaryContainer>
    {/* Create Form (collapsible) */}
    <div className="mb-6">
      {isCreatingVault ? (
        <VaultCreateForm
          onSubmit={handleCreateVault}
          onCancel={() => setIsCreatingVault(false)}
        />
      ) : (
        <button
          onClick={() => setIsCreatingVault(true)}
          className="w-full p-4 border-2 border-dashed border-slate-300
                     rounded-lg hover:border-blue-400 transition-colors"
        >
          + Create New Vault
        </button>
      )}
    </div>

    {/* Vault Grid */}
    {vaults.length === 0 ? (
      <VaultEmptyState onCreateClick={() => setIsCreatingVault(true)} />
    ) : (
      <KeyDragProvider>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {vaults.map(vault => (
            <VaultCard
              key={vault.id}
              vault={vault}
              keys={getCurrentVaultKeys(vault.id)}
              isActive={vault.id === currentVault?.id}
              onSelect={() => setCurrentVault(vault.id)}
              // ... other handlers
            />
          ))}
        </div>
      </KeyDragProvider>
    )}

    {/* Info Panel */}
    <CollapsibleHelp
      triggerText="Understanding Vaults"
      context="vault-management"
    />
  </AppPrimaryContainer>
</div>
```

### Task 3.7: Integrate Navigation Flow (45 min)

**Quick Actions:**
```typescript
const handleQuickEncrypt = (vaultId: string) => {
  setCurrentVault(vaultId);
  navigate('/encrypt');
};

const handleManageKeys = (vaultId: string) => {
  setCurrentVault(vaultId);
  navigate('/keys');
};
```

**Vault Selection:**
- Click card to select (blue border)
- Double-click to open in encrypt
- Right-click for context menu (future)

### Task 3.8: Testing & Polish (60 min)

**Test Scenarios:**
- [ ] Create new vault inline
- [ ] Select vault (visual feedback)
- [ ] View key badges correctly
- [ ] Drag key to vault
- [ ] Quick encrypt navigation
- [ ] Delete vault with confirmation
- [ ] Empty state display
- [ ] Grid responsive layout

---

## Visual Specifications

### Grid Behavior
```css
/* Responsive grid */
.vault-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

@media (min-width: 1024px) {
  .vault-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1536px) {
  .vault-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Card States
- **Default:** White bg, slate-200 border
- **Hover:** Slight shadow, slate-300 border
- **Active:** Blue-600 border, blue-50 bg
- **Drop Target:** Blue-400 border, dashed
- **Deleting:** Red-100 bg, reduced opacity

### Key Badges
```css
.key-badge-passphrase {
  background: #DCFCE7; /* green-100 */
  color: #15803D; /* green-700 */
}

.key-badge-yubikey {
  background: #F3E8FF; /* purple-100 */
  color: #6B21A8; /* purple-700 */
}

.key-badge-empty {
  background: transparent;
  border: 2px dashed #CBD5E1; /* slate-300 */
  color: #94A3B8; /* slate-400 */
}
```

---

## Backend Integration

### Commands
```typescript
// Vault operations
commands.createVault({ name, description })
commands.deleteVault({ vault_id })
commands.setCurrentVault({ vault_id })

// Key attachment
commands.addKeyToVault({ vault_id, key_id })
commands.removeKeyFromVault({ vault_id, key_id })

// Vault info
commands.getVaultManifest({ vault_id })
commands.getVaultStatistics({ vault_id })
```

---

## Migration Strategy

**From Current:**
- Keep vault creation logic
- Enhance card visual design
- Add inline form
- Remove modals
- Add drag & drop layer

**Preserve:**
- Cache-first architecture
- Workflow hook pattern
- Error handling

---

## Success Criteria

- [ ] Visual vault cards appealing
- [ ] Inline creation smooth
- [ ] Key badges accurate
- [ ] Drag & drop intuitive
- [ ] Quick actions work
- [ ] Grid responsive
- [ ] Empty state helpful
- [ ] Performance instant
- [ ] Components < 200 LOC

---

## Known Challenges

1. **Drag & Drop:** Complex state management
2. **Grid Layout:** Responsive breakpoints
3. **Key Limits:** Enforce 4 keys max
4. **Delete Safety:** Confirmation required
5. **Cache Sync:** Multiple update paths

---

## Handoff Notes

After completion:
- Document drag & drop implementation
- Note any performance issues
- List discovered edge cases
- Update integration points
- Prepare for Phase 4

---

_This plan guides the Vault Hub redesign implementation._