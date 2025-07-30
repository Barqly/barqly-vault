# Technical Blueprint: Frontend State Management (Task 3.2)

## Task Overview

Implement a centralized state management system for the Barqly Vault frontend using Zustand. The state management layer coordinates UI state, caches backend responses, and provides a clean interface between UI components and Tauri commands.

### Specific Functionality to Implement

1. **Global State Store**: Centralized state for keys, encryption operations, and UI
2. **Command Integration**: Actions that invoke Tauri commands with error handling
3. **Optimistic Updates**: UI updates before backend confirmation
4. **State Persistence**: Remember user preferences and recent operations
5. **Error State Management**: Centralized error handling and display

### Success Criteria

- Single source of truth for application state
- Type-safe state access and mutations
- Automatic error boundary integration
- <50ms state update latency
- Persistent state across app restarts

### Performance Requirements

- State updates: <5ms for synchronous operations
- Memory usage: <10MB for state storage
- Persistence: <100ms save/load time

## Implementation Specification

### State Store Structure

```typescript
// src-ui/src/store/types.ts

export interface AppState {
  // Key management state
  keys: KeyState;
  
  // Encryption/decryption operations
  operations: OperationState;
  
  // UI state
  ui: UIState;
  
  // Application settings
  settings: SettingsState;
  
  // Error handling
  errors: ErrorState;
}

export interface KeyState {
  availableKeys: KeyInfo[];
  selectedKeyId: string | null;
  isLoading: boolean;
}

export interface OperationState {
  currentOperation: Operation | null;
  history: OperationHistory[];
  progress: ProgressInfo | null;
}

export interface UIState {
  activeTab: 'setup' | 'encrypt' | 'decrypt';
  selectedFiles: FileSelection | null;
  isProcessing: boolean;
}
```

### Store Actions Interface

```typescript
// src-ui/src/store/actions.ts

export interface AppActions {
  // Key management actions
  loadKeys: () => Promise<void>;
  generateKey: (label: string, passphrase: string) => Promise<void>;
  selectKey: (keyId: string) => void;
  deleteKey: (keyId: string) => Promise<void>;
  
  // File operations
  selectFiles: (type: 'files' | 'folder') => Promise<void>;
  clearFileSelection: () => void;
  
  // Encryption/decryption
  encrypt: (outputName?: string) => Promise<void>;
  decrypt: (passphrase: string, outputDir: string) => Promise<void>;
  
  // UI actions
  setActiveTab: (tab: TabType) => void;
  clearErrors: () => void;
  
  // Settings
  updateSettings: (settings: Partial<Settings>) => void;
}
```

### Zustand Store Definition

```typescript
// src-ui/src/store/index.ts

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        keys: { availableKeys: [], selectedKeyId: null, isLoading: false },
        operations: { currentOperation: null, history: [], progress: null },
        ui: { activeTab: 'setup', selectedFiles: null, isProcessing: false },
        settings: { /* ... */ },
        errors: { current: null, history: [] },
        
        // Actions implementation
        loadKeys: async () => {
          // Set loading state
          // Invoke Tauri command
          // Update state with results
          // Handle errors
        },
        
        // ... other actions
      }),
      {
        name: 'barqly-vault-storage',
        partialize: (state) => ({ 
          settings: state.settings,
          keys: { selectedKeyId: state.keys.selectedKeyId }
        })
      }
    )
  )
);
```

### Error Handling Strategy

```typescript
// src-ui/src/store/errors.ts

export interface ErrorState {
  current: AppError | null;
  history: ErrorHistoryEntry[];
}

export interface AppError {
  id: string;
  code: ErrorCode;
  message: string;
  context?: string;
  timestamp: Date;
  dismissible: boolean;
}

export interface ErrorActions {
  setError: (error: AppError) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
}
```

### Progress Tracking

```typescript
// src-ui/src/store/progress.ts

export interface ProgressInfo {
  operationId: string;
  type: 'encryption' | 'decryption';
  progress: number; // 0.0 to 1.0
  message: string;
  startTime: Date;
  estimatedTimeRemaining?: number;
}

export interface ProgressActions {
  updateProgress: (update: ProgressUpdate) => void;
  completeOperation: (operationId: string) => void;
  cancelOperation: (operationId: string) => void;
}
```

## Integration Points

### Tauri Command Integration

```typescript
// Pattern for integrating Tauri commands with store
async function storeAction() {
  set({ isLoading: true });
  try {
    const result = await tauriCommand(params);
    set({ data: result, isLoading: false });
  } catch (error) {
    set({ 
      error: translateError(error), 
      isLoading: false 
    });
  }
}
```

### React Component Integration

```typescript
// Hook usage in components
function MyComponent() {
  const { keys, loadKeys, selectKey } = useAppStore();
  
  useEffect(() => {
    loadKeys();
  }, []);
  
  return (/* ... */);
}
```

### State Persistence Strategy

- Persist only necessary state (settings, selected key)
- Use localStorage with encryption for sensitive data
- Migrate state schema on app updates
- Clear state on security events

## Testing Strategy

### Unit Tests
- Test each action in isolation
- Verify state transitions
- Test error handling paths
- Validate persistence logic

### Integration Tests
- Test action chains (e.g., generate → select → encrypt)
- Verify Tauri command integration
- Test error propagation
- Validate optimistic updates

### Performance Tests
- Measure state update latency
- Test with large state objects
- Verify memory usage
- Benchmark persistence operations

## Dependencies and Constraints

### External Dependencies

```json
{
  "zustand": "^4.5.0",
  "@tauri-apps/api": "^2.0.0",
  "immer": "^10.0.0"
}
```

### Design Constraints

- State updates must be immutable
- No direct Tauri command calls from components
- All async operations through actions
- Error boundaries at component tree root

---

*This blueprint defines the state management architecture. Implementation details are left to the engineer's discretion while following these specifications.* 