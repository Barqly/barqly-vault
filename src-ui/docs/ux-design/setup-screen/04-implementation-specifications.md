# Setup Screen Implementation Specifications

## Executive Summary

This document provides detailed technical specifications for implementing the optimized Setup screen layout, achieving 85%+ form visibility while maintaining the high-quality user experience.

## Component Modifications

### 1. SetupHeader Component Refactor

#### Current Implementation

```typescript
// Current: 80px height with two lines
<header className="bg-white border-b border-gray-200 px-6 py-4">
  <h1 className="text-xl font-bold text-gray-900 leading-tight">{title}</h1>
  <p className="text-sm text-gray-700 mt-1 leading-tight">{subtitle}</p>
</header>
```

#### Optimized Implementation

```typescript
// New: 40px height with single line
<header className="bg-white border-b border-gray-200 h-10 flex items-center px-4">
  <div className="flex items-center gap-2 flex-1">
    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
    <span className="font-semibold text-gray-900">Barqly Vault</span>
    <span className="text-gray-400 hidden sm:inline">|</span>
    <span className="text-sm text-gray-600 hidden sm:inline">Bitcoin Legacy Protection</span>
  </div>
  {/* Skip to main remains but more compact */}
  <a href="#main-form" className="sr-only focus:not-sr-only">
    Skip to form
  </a>
</header>
```

### 2. TrustIndicators Transformation

#### From: Separate Block Component

```typescript
// Remove the standalone TrustIndicators component from SetupPage
// DELETE: <TrustIndicators />
```

#### To: Inline Trust Badges

```typescript
// New TrustBadges component
interface TrustBadgeProps {
  icon: LucideIcon;
  label: string;
  tooltip: string;
}

const TrustBadge: React.FC<TrustBadgeProps> = ({ icon: Icon, label, tooltip }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1 px-2 py-1
                        bg-gray-50 rounded-full text-xs text-gray-600
                        hover:bg-gray-100 transition-colors cursor-help">
          <Icon className="w-3 h-3" />
          <span>{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// Usage in FormSection title area
<div className="flex items-center justify-between">
  <h2 className="text-lg font-semibold">{title}</h2>
  <div className="flex gap-2">
    <TrustBadge
      icon={Lock}
      label="Local"
      tooltip="Your private keys never leave this device"
    />
    <TrustBadge
      icon={BookOpen}
      label="Open"
      tooltip="Audited open-source code you can verify"
    />
  </div>
</div>
```

### 3. FormSection Height Optimization

#### Current Structure

```typescript
// Current: Fixed padding, no height optimization
<div className="bg-white rounded-lg shadow-sm border border-gray-200">
  <div className="p-8">
    {/* Content */}
  </div>
</div>
```

#### Optimized Structure

```typescript
// New: Dynamic height with viewport calculation
<div
  className="bg-white rounded-lg shadow-sm border border-gray-200
             h-[85vh] max-h-[800px] flex flex-col"
  style={{ minHeight: '500px' }}
>
  {/* Title bar with trust badges - fixed height */}
  <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-800">
        Create Your Security Identity
      </h2>
      <div className="flex gap-2">
        <TrustBadge icon={Lock} label="Local" />
        <TrustBadge icon={BookOpen} label="Open" />
      </div>
    </div>
  </div>

  {/* Scrollable form content */}
  <div className="flex-1 overflow-y-auto px-6 py-4">
    <div className="space-y-6 max-w-md mx-auto">
      {children}
    </div>
  </div>
</div>
```

### 4. SetupPage Layout Restructure

#### Key Changes Required

```typescript
const SetupPage: React.FC = () => {
  // ... existing hooks and state

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Compact Header - 40px */}
      <SetupHeader />

      {/* Main content - fills remaining height */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Remove ProgressContext from here */}

          <FormSection
            title="Create Your Security Identity"
            // Remove subtitle - integrated into badges
            className="h-[85vh] max-h-[700px]"
          >
            {/* Existing form content */}
          </FormSection>

          {/* Help section outside card, less prominent */}
          {!success && (
            <div className="mt-4 text-center">
              <CollapsibleHelp
                triggerText="How does this work?"
                variant="minimal"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

### 5. Field Enhancement Updates

#### EnhancedInput Component Modifications

```typescript
// Add focus animation and compact mode
interface EnhancedInputProps {
  // ... existing props
  compact?: boolean;
  showHelperOnFocus?: boolean;
}

const EnhancedInput: React.FC<EnhancedInputProps> = ({
  compact = false,
  showHelperOnFocus = true,
  // ... other props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`
      transition-transform duration-200
      ${isFocused ? 'scale-[1.02]' : 'scale-100'}
    `}>
      <label className={`
        block font-medium text-gray-700
        ${compact ? 'text-sm mb-1' : 'text-sm mb-1.5'}
      `}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`
          w-full rounded-md border-gray-300
          ${compact ? 'px-3 py-2 text-sm' : 'px-4 py-2.5'}
          ${isFocused ? 'ring-2 ring-blue-500 border-transparent' : ''}
        `}
      />
      {helper && (showHelperOnFocus ? isFocused : true) && (
        <p className={`
          text-gray-500 mt-1
          ${compact ? 'text-xs' : 'text-sm'}
          ${showHelperOnFocus ? 'animate-in fade-in duration-200' : ''}
        `}>
          {helper}
        </p>
      )}
    </div>
  );
};
```

### 6. Progressive Components

#### New ProgressiveTooltip Component

```typescript
interface ProgressiveTooltipProps {
  children: ReactNode;
  content: string | ReactNode;
  delay?: number;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

const ProgressiveTooltip: React.FC<ProgressiveTooltipProps> = ({
  children,
  content,
  delay = 200,
  side = 'bottom'
}) => {
  return (
    <TooltipProvider delayDuration={delay}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent
            side={side}
            className="max-w-xs text-sm animate-in fade-in-0 zoom-in-95"
          >
            {content}
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  );
};
```

#### Updated CollapsibleHelp Component

```typescript
interface CollapsibleHelpProps {
  triggerText?: string;
  variant?: 'detailed' | 'minimal';
  startExpanded?: boolean;
}

const CollapsibleHelp: React.FC<CollapsibleHelpProps> = ({
  triggerText = 'How does this work?',
  variant = 'detailed',
  startExpanded = false
}) => {
  const [isOpen, setIsOpen] = useState(startExpanded);

  if (variant === 'minimal') {
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 text-sm text-gray-500
                   hover:text-gray-700 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
        <span>{triggerText}</span>
        <ChevronDown className={`
          w-3.5 h-3.5 transition-transform duration-200
          ${isOpen ? 'rotate-180' : ''}
        `} />
      </button>
    );
  }

  // ... existing detailed implementation
};
```

## CSS Updates Required

### Global Styles (`globals.css`)

```css
/* Form-first layout utilities */
.form-container {
  height: calc(85vh - 2rem);
  max-height: 700px;
  min-height: 500px;
}

/* Compact header */
.header-compact {
  height: 2.5rem; /* 40px */
  @apply flex items-center px-4 bg-white border-b border-gray-200;
}

/* Progressive disclosure animations */
@keyframes slideDown {
  from {
    height: 0;
    opacity: 0;
  }
  to {
    height: var(--height);
    opacity: 1;
  }
}

.disclosure-enter {
  animation: slideDown 300ms ease-out forwards;
}

/* Focus management */
.field-focus-scale {
  @apply transition-transform duration-200;
}

.field-focus-scale:focus-within {
  @apply scale-[1.02];
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .form-container {
    height: calc(100vh - 3rem);
    max-height: none;
  }

  .header-compact {
    height: 2.25rem; /* 36px */
  }
}
```

## Responsive Breakpoints

### Desktop (≥1024px)

- Header: 40px with full text
- Form: 85% viewport height, max 700px
- Trust badges: Horizontal with hover
- Field spacing: Comfortable (24px gaps)

### Tablet (768px-1023px)

- Header: 40px with abbreviated text
- Form: 85% viewport height, max 600px
- Trust badges: Horizontal, smaller
- Field spacing: Moderate (20px gaps)

### Mobile (<768px)

- Header: 36px, logo + short brand
- Form: Full height minus header
- Trust badges: Minimal or hidden
- Field spacing: Compact (16px gaps)

## Animation Specifications

### Micro-interactions

```typescript
// Focus scale animation
const focusAnimation = {
  scale: [1, 1.02],
  transition: { duration: 0.2, ease: 'easeOut' },
};

// Tooltip appearance
const tooltipAnimation = {
  opacity: [0, 1],
  y: [10, 0],
  transition: { duration: 0.2 },
};

// Help section expansion
const expansionAnimation = {
  height: ['0px', 'auto'],
  opacity: [0, 1],
  transition: { duration: 0.3, ease: 'easeOut' },
};
```

## Accessibility Enhancements

### Focus Management

```typescript
// Auto-focus first field on mount
useEffect(() => {
  const firstInput = document.getElementById('key-label');
  if (firstInput && !success && !isLoading) {
    firstInput.focus();
  }
}, [success, isLoading]);
```

### ARIA Improvements

```typescript
// Progressive disclosure announcements
<div
  role="region"
  aria-live="polite"
  aria-expanded={isOpen}
  aria-label="Additional help information"
>
  {/* Help content */}
</div>
```

### Keyboard Navigation

```typescript
// Enhanced keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Cmd/Ctrl + Enter submits form
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && isFormValid) {
      handleKeyGeneration();
    }

    // Tab cycles through trust badges
    // Existing Escape and Enter handling...
  };
}, []);
```

## Performance Optimizations

### Code Splitting

```typescript
// Lazy load help content
const HelpContent = lazy(() => import('./HelpContent'));

// Lazy load tooltip provider
const TooltipProvider = lazy(() => import('@radix-ui/react-tooltip'));
```

### Memoization

```typescript
// Memoize trust badges to prevent re-renders
const TrustBadges = memo(() => (
  <div className="flex gap-2">
    <TrustBadge icon={Lock} label="Local" />
    <TrustBadge icon={BookOpen} label="Open" />
  </div>
));
```

## Testing Requirements

### Visual Regression Tests

- Form visibility at different viewports
- Trust badge hover states
- Help section expansion
- Focus states and animations

### Accessibility Tests

- Keyboard navigation flow
- Screen reader announcements
- Color contrast ratios
- Focus trap in expanded help

### Performance Tests

- Initial render time <100ms
- Interaction response <50ms
- No layout shift on disclosure
- Smooth 60fps animations
