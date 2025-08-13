# Encrypt Screen Component Specifications

> **Version**: 1.0  
> **Status**: Implementation Ready  
> **Designer**: UX Designer, ZenAI Team  
> **Last Updated**: January 2025  
> **Related**: Design Specification, Wireframes

## Overview

This document provides detailed specifications for each component in the Encrypt screen, including props, states, behaviors, and integration requirements. Components are designed to be reusable, accessible, and consistent with the Barqly Vault design system.

## Core Components

### 1. EncryptPageHeader

**Purpose**: Establish trust and communicate the value proposition of encryption.

```typescript
interface EncryptPageHeaderProps {
  title: string;
  subtitle: string;
  timeEstimate?: string;
  trustBadges?: TrustBadge[];
}

interface TrustBadge {
  icon: IconType;
  label: string;
  tooltip?: string;
}
```

**Visual Specifications**:

- Container: Full width, 80px height total
- Title: 24px, font-bold, color: --gray-900
- Subtitle: 14px, font-regular, color: --gray-600
- Time badge: --bitcoin-orange accent, 12px
- Trust badges: 32px height bar, --gray-50 background
- Badge text: 12px, color: --gray-500

**Behavior**:

- Trust badges show tooltips on hover
- Time estimate updates based on file selection
- Responsive: Stack on mobile

**Implementation Example**:

```jsx
<EncryptPageHeader
  title="Encrypt Your Bitcoin Vault"
  subtitle="Transform sensitive files into military-grade encrypted archives"
  timeEstimate="90 seconds"
  trustBadges={[
    {
      icon: ShieldIcon,
      label: "Military-grade",
      tooltip: "Age encryption standard",
    },
    { icon: LockIcon, label: "Local-only", tooltip: "No network access" },
    { icon: BoltIcon, label: "Zero network", tooltip: "Completely offline" },
  ]}
/>
```

### 2. StepIndicator

**Purpose**: Show progression through the encryption workflow.

```typescript
interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
}

interface Step {
  label: string;
  status: "active" | "complete" | "disabled";
  icon?: IconType;
}
```

**Visual Specifications**:

- Container: Full width, 48px height
- Background: --gray-50
- Step pills: Height 32px, padding 12px 16px
- Active: --trust-blue background, white text
- Complete: Check icon, --success-green
- Disabled: --gray-100 background, --gray-400 text
- Connectors: 20px arrows, --gray-400

**Behavior**:

- Click on complete steps to navigate back
- Smooth transition between states (300ms)
- Progress animation when moving forward

**States**:

```
Initial:  [1 Active] → [2 Disabled] → [3 Disabled]
Progress: [1 Complete] → [2 Active] → [3 Disabled]
Ready:    [1 Complete] → [2 Complete] → [3 Complete]
```

### 3. FileSelectionPanel

**Purpose**: Enable file and folder selection with drag-and-drop support.

```typescript
interface FileSelectionPanelProps {
  mode: "files" | "folder" | null;
  onModeChange: (mode: "files" | "folder") => void;
  onFilesSelected: (files: FileList | FolderContent) => void;
  selectedFiles?: SelectedFiles;
  onClearFiles: () => void;
  maxSize?: number;
  acceptedTypes?: string[];
}

interface SelectedFiles {
  paths: string[];
  totalSize: number;
  fileCount: number;
}
```

**Visual Specifications**:

**Mode Toggle**:

- Button size: 120px × 48px
- Active: --trust-blue background, white text
- Inactive: White, 1px --gray-300 border
- Icon size: 20px
- Gap between: 16px

**Drop Zone**:

- Min height: 160px
- Border: 2px dashed --gray-300
- Hover: --drop-zone-blue background
- Active drag: 2px solid --trust-blue
- Icon: 48px, centered
- Text: 16px, --gray-600

**File List**:

- Container: --gray-50 background
- Max height: 120px with scroll
- File items: 14px, --gray-600
- File icons: 16px, type-specific
- Remove buttons: 16px × 16px

**Behavior**:

- Drag-and-drop with visual feedback
- File validation on selection
- Size warnings for files >100MB
- Type validation with warnings
- Individual file removal
- Clear all functionality

**Drag States**:

```css
.drop-zone--idle {
  border: 2px dashed #d1d5db;
}
.drop-zone--hover {
  background: #eff6ff;
  border-color: #3b82f6;
}
.drop-zone--active {
  border: 2px solid #2563eb;
  animation: pulse;
}
.drop-zone--invalid {
  border-color: #ef4444;
  background: #fef2f2;
}
```

### 4. KeySelectionDropdown

**Purpose**: Allow users to select encryption key with metadata display.

```typescript
interface KeySelectionDropdownProps {
  keys: EncryptionKey[];
  selectedKeyId?: string;
  onKeySelect: (keyId: string) => void;
  placeholder?: string;
  showKeyPreview?: boolean;
}

interface EncryptionKey {
  id: string;
  label: string;
  publicKey: string;
  createdAt: Date;
  lastUsed?: Date;
  fingerprint?: string;
}
```

**Visual Specifications**:

- Dropdown: Full width, 48px height
- Background: White, 1px --gray-300 border
- Selected text: 16px, font-medium, --gray-900
- Dropdown icon: 20px, --gray-500
- Focus ring: 2px --trust-blue

**Dropdown Menu**:

- Max height: 240px with scroll
- Item height: 48px
- Hover: --gray-50 background
- Selected: --trust-blue left border

**Key Preview**:

- Container: --gray-50 background
- Public key: 12px monospace font
- Metadata: 12px, --gray-500
- Info message: 13px, --gray-600

**Behavior**:

- Opens on click or Enter key
- Keyboard navigation with arrows
- Type-ahead search
- Shows key creation date
- Preview updates on selection

### 5. OutputConfiguration

**Purpose**: Configure where and how the encrypted file is saved.

```typescript
interface OutputConfigurationProps {
  defaultPath?: string;
  outputPath: string;
  onPathChange: (path: string) => void;
  archiveName?: string;
  onNameChange: (name: string) => void;
  suggestions?: string[];
  validation?: ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
  availableSpace?: number;
}
```

**Visual Specifications**:

- Path input: 48px height, 16px font
- Browse button: 40px × 40px, integrated
- Name input: 48px height, optional styling
- Validation message: 12px, below input
- Preview text: 12px italic, --gray-500

**Behavior**:

- Path validation on blur
- Real-time name validation
- Show available space
- Auto-suggest recent paths
- Preview final filename
- Native folder picker integration

**Validation States**:

```typescript
// Valid path with space
{ isValid: true, availableSpace: 45000000000 } // 45GB

// Invalid path
{ isValid: false, message: "Directory does not exist" }

// Insufficient space
{ isValid: false, message: "Not enough space (need 45MB, have 12MB)" }
```

### 6. EncryptionActionPanel

**Purpose**: Show validation status and primary actions.

```typescript
interface EncryptionActionPanelProps {
  validationItems: ValidationItem[];
  onEncrypt: () => void;
  onReset: () => void;
  isEncrypting?: boolean;
  canEncrypt?: boolean;
}

interface ValidationItem {
  label: string;
  isValid: boolean;
  detail?: string;
}
```

**Visual Specifications**:

- Container: Full width, padding 24px
- Validation list: --gray-50 background
- Check icons: 16px, --success-green
- X icons: 16px, --error-red
- Text: 14px, --gray-700

**Buttons**:

- Reset: Secondary, 120px × 48px
- Encrypt: Primary, 240px × 48px
- Primary: --trust-blue, white text
- Icon: 20px lock, animated on hover

**Behavior**:

- Validation updates in real-time
- Encrypt button pulses when ready
- Loading state during encryption
- Disabled until all validations pass

### 7. EncryptionProgress

**Purpose**: Show detailed progress during encryption.

```typescript
interface EncryptionProgressProps {
  progress: number;
  stage: EncryptionStage;
  currentFile?: string;
  timeElapsed: number;
  timeRemaining?: number;
  onCancel?: () => void;
  canCancel?: boolean;
}

type EncryptionStage = "preparing" | "archiving" | "encrypting" | "finalizing";
```

**Visual Specifications**:

- Overlay: Full screen, semi-transparent
- Modal: 480px width, white background
- Progress bar: 8px height, rounded
- Fill: Gradient --trust-blue to --success-green
- Stage text: 16px, font-medium
- File text: 14px, --gray-600
- Time text: 12px, --gray-500

**Stage Messages**:

```typescript
const stageMessages = {
  preparing: "Preparing files...",
  archiving: "Creating secure archive...",
  encrypting: "Applying military-grade encryption...",
  finalizing: "Finalizing vault...",
};
```

**Behavior**:

- Smooth progress updates (100ms intervals)
- Stage transitions with fade
- Cancel available until 90%
- Prevent background interaction

### 8. EncryptionSuccess

**Purpose**: Celebrate success and provide next actions.

```typescript
interface EncryptionSuccessProps {
  result: EncryptionResult;
  onEncryptMore: () => void;
  onViewGuide: () => void;
  onCopyPath: () => void;
  onOpenFolder: () => void;
}

interface EncryptionResult {
  outputPath: string;
  fileName: string;
  originalSize: number;
  encryptedSize: number;
  fileCount: number;
  duration: number;
  keyUsed: string;
}
```

**Visual Specifications**:

- Container: Card with shadow
- Success icon: 48px, animated check
- Title: 24px, font-bold
- Path: 14px monospace, --gray-700
- Stats: 14px, --gray-600
- Action buttons: Equal width

**Animations**:

- Check mark: Scale and rotate (500ms)
- Container: Fade and slide up (400ms)
- Subtle confetti: 2 seconds

**Behavior**:

- Copy path to clipboard
- Open folder in file manager
- Show compression ratio
- Format duration (e.g., "12 seconds")

## Composite Component Patterns

### Progressive Disclosure Pattern

```jsx
// Only show relevant sections based on state
<FileSelectionPanel visible={true} />
<KeySelectionDropdown visible={hasFiles} />
<OutputConfiguration visible={hasFiles && hasKey} />
<EncryptionActionPanel visible={isComplete} />
```

### Error Boundary Pattern

```jsx
<ErrorBoundary fallback={<ErrorRecovery />}>
  <FileSelectionPanel />
</ErrorBoundary>
```

### Loading State Pattern

```jsx
{
  isLoading ? (
    <EncryptionProgress {...progressProps} />
  ) : (
    <EncryptionForm {...formProps} />
  );
}
```

## Accessibility Requirements

### Keyboard Navigation Map

```
Tab Flow:
1. Mode toggle (Files/Folder)
2. Browse button
3. File list items (if present)
4. Remove buttons
5. Clear all
6. Key dropdown
7. Path input
8. Browse path
9. Name input
10. Reset button
11. Encrypt button
```

### ARIA Attributes

```jsx
// File selection
<div role="region" aria-label="File selection">
  <div role="radiogroup" aria-label="Selection mode">
    <button role="radio" aria-checked={mode === 'files'}>Files</button>
    <button role="radio" aria-checked={mode === 'folder'}>Folder</button>
  </div>
</div>

// Progress
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Encryption progress"
>
  <span aria-live="polite">{stageMessage}</span>
</div>

// Success
<div role="alert" aria-live="assertive">
  Encryption successful
</div>
```

### Focus Management

```javascript
// Focus management after operations
const handleEncryptionComplete = () => {
  successRef.current?.focus();
};

const handleErrorDismiss = () => {
  firstInputRef.current?.focus();
};
```

## Component Testing Checklist

### Visual Testing

- [ ] All color contrasts meet WCAG AA
- [ ] Components render correctly at all breakpoints
- [ ] Animations perform smoothly
- [ ] Icons display properly
- [ ] Text remains readable at all sizes

### Functional Testing

- [ ] File selection works for both modes
- [ ] Drag and drop accepts valid files
- [ ] Key selection updates preview
- [ ] Path validation provides feedback
- [ ] Encryption completes successfully

### Accessibility Testing

- [ ] Keyboard navigation works completely
- [ ] Screen reader announces all changes
- [ ] Focus indicators always visible
- [ ] No keyboard traps
- [ ] Touch targets minimum 44×44px

### State Testing

- [ ] Initial state renders correctly
- [ ] State transitions smooth
- [ ] Error states display properly
- [ ] Loading states non-blocking
- [ ] Success state shows all info

## Performance Guidelines

### Optimization Targets

- Component mount: <50ms
- Re-render: <16ms (60fps)
- File list virtualization: >100 items
- Animation frame rate: 60fps
- Memory usage: <50MB

### Code Splitting

```javascript
// Lazy load heavy components
const EncryptionProgress = lazy(() => import("./EncryptionProgress"));
const SuccessAnimation = lazy(() => import("./SuccessAnimation"));
```

### Memoization Strategy

```javascript
// Memoize expensive computations
const validationStatus = useMemo(
  () => validateEncryptionReadiness(files, key, path),
  [files, key, path],
);

// Memoize callbacks
const handleEncrypt = useCallback(() => {
  // Encryption logic
}, [files, key, path]);
```

## Integration Requirements

### With Existing Hooks

```javascript
import { useFileEncryption } from "../hooks/useFileEncryption";
import { useKeyManagement } from "../hooks/useKeyManagement";
import { useProgressTracking } from "../hooks/useProgressTracking";
```

### With Tauri Backend

```javascript
// File selection
const files = await open({
  multiple: true,
  filters: [{ name: "All Files", extensions: ["*"] }],
});

// Folder selection
const folder = await open({
  directory: true,
});

// Encryption command
await invoke("encrypt_files", {
  files: selectedFiles,
  keyId: selectedKey,
  outputPath: path,
  archiveName: name,
});
```

### Event Handling

```javascript
// Listen for progress updates
listen("encryption-progress", (event) => {
  setProgress(event.payload.progress);
  setStage(event.payload.stage);
});

// Handle completion
listen("encryption-complete", (event) => {
  setResult(event.payload);
  showSuccess();
});
```

## Style Variables

```css
/* Component-specific variables */
.encrypt-page {
  --header-height: 80px;
  --step-indicator-height: 48px;
  --file-panel-min-height: 240px;
  --key-panel-height: 160px;
  --output-panel-height: 160px;
  --action-panel-height: 160px;

  --panel-padding: 24px;
  --panel-gap: 16px;
  --border-radius: 8px;

  --transition-base: 250ms ease-out;
  --animation-success: 500ms ease-out;
}
```

## Component Lifecycle

### Mount Sequence

1. Load saved preferences
2. Check for available keys
3. Set default output path
4. Initialize drag-drop listeners
5. Focus first interactive element

### Update Sequence

1. Validate on each change
2. Update step indicator
3. Enable/disable sections
4. Update action availability
5. Persist preferences

### Unmount Sequence

1. Cancel any pending operations
2. Save current preferences
3. Clean up listeners
4. Clear sensitive data
5. Reset to initial state

---

_These component specifications provide the detailed requirements for implementing each part of the Encrypt screen. They should be used alongside the Design Specification and Wireframes for complete implementation._
