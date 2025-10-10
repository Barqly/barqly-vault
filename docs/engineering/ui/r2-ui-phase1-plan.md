# Phase 1: Navigation Restructure

**Timeline:** Day 1 Afternoon (4-5 hours)
**Priority:** High - Foundation for all other screens
**Dependencies:** Phase 0 completion

---

## Objectives

1. Replace top navigation tabs with collapsible sidebar
2. Add status indicators to top bar
3. Create UIContext for preference management
4. Update MainLayout to new structure

---

## Tasks Breakdown

### Task 1.1: Create UIContext (30 min)
**File:** `src-ui/src/contexts/UIContext.tsx`

```typescript
interface UIContextValue {
  // Sidebar state
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Theme (future)
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: Theme) => void;

  // Persistence
  loadPreferences: () => void;
  savePreferences: () => void;
}
```

**Implementation:**
- Create context with React Context API
- Load preferences from localStorage on mount
- Save preferences on change
- Provide hook: `useUI()`

### Task 1.2: Build SidebarNav Component (90 min)
**File:** `src-ui/src/components/layout/SidebarNav.tsx`

**Structure:**
```
Collapsible Sidebar (240px / 64px)
├── Logo/Brand area
├── Navigation items
│   ├── Vault Hub (default)
│   ├── Manage Keys
│   ├── Encrypt
│   └── Decrypt
├── Spacer
└── Collapse toggle button
```

**Features:**
- Smooth collapse animation (200ms)
- Active item indicator (blue highlight)
- Icon + text (expanded) / Icon only (collapsed)
- Tooltips when collapsed
- Keyboard accessible

**Props:**
```typescript
interface SidebarNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}
```

### Task 1.3: Create TopStatusBar Component (45 min)
**File:** `src-ui/src/components/layout/TopStatusBar.tsx`

**Elements:**
```
[≡] Barqly Vault        [🔐 2 Keys] [🗄️ 3 Vaults] [YubiKey: Connected]
```

**Features:**
- App title/brand
- Key count with icon
- Vault count with icon
- YubiKey connection status
- Future: Help/Settings icons

**Integration:**
- Use `useVault()` for counts
- Poll for YubiKey status

### Task 1.4: Update MainLayout (60 min)
**File:** `src-ui/src/components/layout/MainLayout.tsx`

**Before:**
```tsx
<div>
  <NavigationTabs />
  <div>{children}</div>
</div>
```

**After:**
```tsx
<div className="flex h-screen">
  <SidebarNav />
  <div className="flex-1 flex flex-col">
    <TopStatusBar />
    <main className="flex-1 overflow-auto">
      {children}
    </main>
  </div>
</div>
```

### Task 1.5: Update App Router (30 min)
**File:** `src-ui/src/App.tsx`

**Changes:**
- Wrap app in `UIProvider`
- Update routes to match new navigation
- Set Vault Hub as default route (`/`)
- Remove old NavigationTabs imports

### Task 1.6: Style Updates (45 min)
**Files:** Various component files

**Updates:**
- Remove top tab spacing from all pages
- Adjust content padding for sidebar
- Ensure max-width container still works
- Test responsive behavior

### Task 1.7: Testing & Polish (60 min)

**Manual Testing:**
- [ ] Sidebar collapses/expands smoothly
- [ ] Navigation works correctly
- [ ] Active states update properly
- [ ] Preferences persist on reload
- [ ] Keyboard navigation works
- [ ] No layout shifts

**Polish:**
- [ ] Add subtle hover states
- [ ] Ensure focus indicators visible
- [ ] Test with different content lengths
- [ ] Verify no console errors

---

## Component Specifications

### SidebarNav Details

**Dimensions:**
- Expanded width: 240px
- Collapsed width: 64px
- Item height: 48px
- Logo area height: 64px
- Bottom padding: 24px

**Colors:**
- Background: white
- Border: slate-200 (1px right)
- Active item: blue-50 bg, blue-600 text
- Hover: slate-50 bg
- Icons: slate-400 (inactive), blue-600 (active)

**Animation:**
```css
.sidebar {
  transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-item {
  transition: all 150ms ease;
}
```

### Navigation Items Configuration

```typescript
const navItems = [
  {
    id: 'vault-hub',
    label: 'Vault Hub',
    icon: Archive, // from lucide-react
    path: '/',
    badge: () => vaultCount,
  },
  {
    id: 'manage-keys',
    label: 'Manage Keys',
    icon: Key,
    path: '/keys',
    badge: () => keyCount,
  },
  {
    id: 'encrypt',
    label: 'Encrypt',
    icon: Lock,
    path: '/encrypt',
  },
  {
    id: 'decrypt',
    label: 'Decrypt',
    icon: Unlock,
    path: '/decrypt',
  },
];
```

---

## File Structure After Phase 1

```
src-ui/src/
├── contexts/
│   ├── VaultContext.tsx (existing)
│   └── UIContext.tsx (new)
├── components/
│   ├── layout/
│   │   ├── MainLayout.tsx (updated)
│   │   ├── SidebarNav.tsx (new)
│   │   ├── TopStatusBar.tsx (new)
│   │   └── AppPrimaryContainer.tsx (existing)
│   └── ui/
│       └── NavigationTabs.tsx (deprecated, can delete)
```

---

## Backup Checklist

Before starting:
- [ ] Backup MainLayout.tsx
- [ ] Backup App.tsx
- [ ] Backup any modified page components

```bash
cp src-ui/src/components/layout/MainLayout.tsx docs/engineering/ui/backups/
cp src-ui/src/App.tsx docs/engineering/ui/backups/
```

---

## Success Criteria

- [ ] Sidebar navigation fully functional
- [ ] All routes accessible via sidebar
- [ ] Status bar shows correct counts
- [ ] Collapse preference persists
- [ ] No regression in existing functionality
- [ ] Clean, professional appearance
- [ ] Smooth animations without jank
- [ ] Component files < 150 LOC each

---

## Known Considerations

1. **Route Highlighting:** Use `useLocation()` from react-router
2. **Badge Updates:** Connect to VaultContext for real-time counts
3. **Collapse on Mobile:** Auto-collapse below 1280px width
4. **Accessibility:** Ensure ARIA labels and keyboard navigation
5. **Performance:** Use React.memo for nav items if needed

---

## Handoff Notes

After completing Phase 1:
- Document any deviations from plan
- Note any discovered issues
- List any technical debt created
- Update main overview doc
- Create daily handoff file

---

_This plan guides the navigation restructure implementation._