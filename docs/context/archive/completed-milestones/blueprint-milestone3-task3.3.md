# Technical Blueprint: User Interface Components (Task 3.3)

## Task Overview

Design and implement the React component architecture for Barqly Vault's three-tab interface (Setup, Encrypt, Decrypt). Components should be accessible, responsive, and follow Bitcoin ecosystem design patterns while maintaining simplicity for non-technical users.

### Specific Functionality to Implement

1. **Tab Navigation System**: Three-tab layout with state persistence
2. **Setup Tab Components**: Key generation, passphrase input, backup confirmation
3. **Encrypt Tab Components**: File selection, key selection, encryption controls
4. **Decrypt Tab Components**: File selection, passphrase entry, decryption controls
5. **Shared Components**: Progress indicators, error displays, file lists

### Success Criteria

- Intuitive UI that requires no documentation
- Full keyboard navigation support
- Screen reader compatibility (WCAG 2.1 AA)
- Responsive design (desktop-first)
- <100ms interaction response time

### Performance Requirements

- Initial render: <50ms
- Re-render on state change: <16ms (60fps)
- Bundle size: <200KB for UI components

## Component Architecture

### Component Hierarchy

```
App
├── Layout
│   ├── Header
│   └── TabContainer
│       ├── TabNavigation
│       └── TabContent
│           ├── SetupTab
│           │   ├── KeyGenerationForm
│           │   ├── KeyDisplay
│           │   └── BackupConfirmation
│           ├── EncryptTab
│           │   ├── KeySelector
│           │   ├── FileSelector
│           │   ├── EncryptionOptions
│           │   └── EncryptButton
│           └── DecryptTab
│               ├── FileInput
│               ├── KeySelector
│               ├── PassphraseInput
│               └── DecryptButton
└── GlobalComponents
    ├── ProgressModal
    ├── ErrorBoundary
    └── NotificationToast
```

### Core Component Interfaces

```typescript
// src-ui/src/components/types.ts

export interface TabProps {
  isActive: boolean;
  onActivate: () => void;
}

export interface FormProps<T> {
  onSubmit: (data: T) => Promise<void>;
  isLoading: boolean;
  error?: AppError;
}

export interface FileDisplayProps {
  files: FileInfo[];
  onRemove: (index: number) => void;
  maxSize?: number;
}

export interface ProgressProps {
  operation: OperationType;
  progress: number;
  message: string;
  onCancel?: () => void;
}
```

### Setup Tab Components

```typescript
// Key Generation Form
export interface KeyGenerationFormProps extends FormProps<KeyGenerationData> {
  suggestedLabels?: string[];
  passwordStrengthRules: PasswordRules;
}

// Key Display
export interface KeyDisplayProps {
  publicKey: string;
  label: string;
  onCopy: () => void;
  showQR?: boolean; // Future enhancement
}

// Backup Confirmation
export interface BackupConfirmationProps {
  onConfirm: () => void;
  publicKey: string;
  savedPath: string;
}
```

### Encrypt Tab Components

```typescript
// Key Selector
export interface KeySelectorProps {
  keys: KeyInfo[];
  selectedKeyId: string | null;
  onSelect: (keyId: string) => void;
  showPublicKey?: boolean;
}

// File Selector
export interface FileSelectorProps {
  mode: "files" | "folder" | null;
  selection: FileSelection | null;
  onSelect: () => void;
  onClear: () => void;
  onModeChange: (mode: "files" | "folder") => void;
}

// Encryption Options
export interface EncryptionOptionsProps {
  defaultOutputName: string;
  onOutputNameChange: (name: string) => void;
  showManifest: boolean;
  onManifestToggle: (show: boolean) => void;
}
```

### Decrypt Tab Components

```typescript
// File Input for .age files
export interface DecryptFileInputProps {
  file: File | null;
  onSelect: () => void;
  onClear: () => void;
  accept: ".age";
}

// Passphrase Input
export interface PassphraseInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  showToggle?: boolean;
}

// Output Directory Selector
export interface OutputSelectorProps {
  path: string | null;
  onSelect: () => void;
  defaultPath?: string;
}
```

### Shared Components

```typescript
// Progress Modal
export interface ProgressModalProps {
  isOpen: boolean;
  operation: Operation;
  progress: ProgressInfo;
  onCancel?: () => void;
  onComplete: () => void;
}

// Error Display
export interface ErrorDisplayProps {
  error: AppError;
  onDismiss?: () => void;
  variant: "inline" | "toast" | "modal";
}

// File List Display
export interface FileListProps {
  files: FileInfo[];
  variant: "compact" | "detailed";
  showSize?: boolean;
  showPath?: boolean;
  onRemove?: (index: number) => void;
}
```

## Design System

### Theme Structure

```typescript
export interface Theme {
  colors: {
    primary: string; // Bitcoin orange
    secondary: string; // Dark gray
    success: string; // Green
    error: string; // Red
    warning: string; // Yellow
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };

  spacing: {
    xs: string; // 4px
    sm: string; // 8px
    md: string; // 16px
    lg: string; // 24px
    xl: string; // 32px
  };

  typography: {
    fontFamily: string;
    sizes: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  };

  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
}
```

### Component Styling Strategy

- CSS Modules for component isolation
- CSS Variables for theming
- Utility classes for common patterns
- No runtime CSS-in-JS for performance

## Accessibility Requirements

### Keyboard Navigation

```typescript
export interface KeyboardNavigable {
  tabIndex: number;
  onKeyDown: (event: KeyboardEvent) => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}
```

### ARIA Patterns

- Tab navigation: `role="tablist"`, `role="tab"`, `role="tabpanel"`
- Forms: Proper labeling, error associations
- Progress: `role="progressbar"`, live regions
- Modals: Focus trapping, escape key handling

### Screen Reader Support

- Meaningful button labels
- Form validation announcements
- Progress updates via live regions
- Error messages associated with inputs

## State Integration

### Component-Store Connection

```typescript
// Example: Setup Tab Container
function SetupTab() {
  const { generateKey, keys, isLoading } = useAppStore();

  const handleSubmit = async (data: KeyGenerationData) => {
    await generateKey(data.label, data.passphrase);
  };

  return (
    <KeyGenerationForm
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  );
}
```

### Event Handling Patterns

- Form submissions prevent default
- Async operations show loading states
- Errors display contextually
- Success states provide clear feedback

## Testing Strategy

### Component Tests

- Render tests for all components
- User interaction simulation
- Accessibility audits
- Error state rendering
- Loading state handling

### Integration Tests

- Tab navigation flow
- Form submission flows
- File selection scenarios
- Error recovery paths

### Visual Regression Tests

- Component screenshots
- Theme switching
- Responsive breakpoints
- High contrast mode

## Dependencies and Constraints

### External Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-hook-form": "^7.48.0",
  "@radix-ui/react-tabs": "^1.0.0",
  "@radix-ui/react-dialog": "^1.0.0",
  "clsx": "^2.0.0"
}
```

### Design Constraints

- No external component libraries (except headless UI)
- Bitcoin ecosystem visual language
- Desktop-first responsive design
- Support for system dark mode

---

_This blueprint defines the UI component architecture. Visual design and detailed styling are left to implementation while following these specifications._
