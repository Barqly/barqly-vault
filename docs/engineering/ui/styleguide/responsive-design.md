# Responsive Design Style Guide

> **Last Updated**: 2025-01-22
> **Status**: Active
> **Category**: UI/UX Engineering

## Core Principle: Content-Based Sizing

Let content determine dimensions naturally rather than forcing arbitrary fixed heights/widths. This creates truly responsive designs that work across all screen sizes.

## 1. Sizing Philosophy

### ✅ DO: Content-Based Approach
```tsx
// Good - Natural content flow
<div className="bg-white rounded-lg p-6">
  {/* Content determines height */}
  <EncryptionSummary {...props} />
  <div className="mt-6">
    <ActionButtons />
  </div>
</div>
```

### ❌ DON'T: Fixed Height Constraints
```tsx
// Bad - Forced heights create problems
<div
  className="bg-white rounded-lg"
  style={{
    minHeight: '400px',  // Forces unnecessary white space
    maxHeight: '600px'   // May cut off content
  }}
>
  <Content />
</div>
```

## 2. Responsive Patterns

### 2.1 Success/Result Panels

**Pattern**: Let content + padding define size
```tsx
// Encryption/Decryption success panels
<div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
  <div className="px-6 py-4 text-center">
    {/* Header content */}
  </div>
  <div className="px-6 pt-6 pb-3">
    {/* Body content - natural flow */}
  </div>
</div>
```

**Benefits**:
- Small screens: Conserves vertical space
- Large screens: No awkward empty areas
- All screens: Consistent visual density

### 2.2 Card Components

**Pattern**: Min/max constraints only when necessary
```tsx
// Good - Flexible with reasonable bounds
<div className="bg-white rounded-lg p-4 max-w-2xl">
  {/* Max-width prevents text lines from being too long */}
  <CardContent />
</div>

// Bad - Arbitrary height constraints
<div className="bg-white rounded-lg p-4 min-h-[300px]">
  {/* Forced minimum creates white space */}
</div>
```

### 2.3 Form Layouts

**Pattern**: Stack naturally with consistent spacing
```tsx
// Progressive form steps
<div className="space-y-4">
  {currentStep === 1 && <FileSelector />}
  {currentStep === 2 && <VaultSelector />}
  {/* Each step sizes itself */}
</div>
```

## 3. Spacing Guidelines

### Vertical Spacing
- **Between sections**: `space-y-6` (24px)
- **Between related elements**: `space-y-4` (16px)
- **Between tight groups**: `space-y-2` (8px)
- **Action buttons from content**: `mt-6` (24px)

### Padding Consistency
- **Card padding**: `p-6` (24px) or `p-4` (16px) for compact
- **Asymmetric when needed**: `px-6 pt-6 pb-3` for visual balance
- **Button padding**: `px-4 py-2` standard, `px-6 py-2` for primary

## 4. Breakpoint Strategy

### Tailwind Breakpoints (Use these)
- `sm:` 640px and up - Tablet portrait
- `md:` 768px and up - Tablet landscape
- `lg:` 1024px and up - Desktop
- `xl:` 1280px and up - Large desktop

### Responsive Utilities
```tsx
// Text sizing
<h2 className="text-lg sm:text-xl lg:text-2xl">
  Responsive heading
</h2>

// Padding adjustments
<div className="p-4 sm:p-6 lg:p-8">
  More padding on larger screens
</div>

// Grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  Responsive grid
</div>
```

## 5. Component Height Management

### When to Use Fixed Heights

**✅ APPROPRIATE USES**:
1. **Loading skeletons** - Prevent layout shift
2. **Image containers** - Maintain aspect ratios
3. **Modals** - Viewport-based max heights
4. **Virtual scrolling** - Performance optimization

**❌ AVOID FOR**:
1. **Success/error messages** - Let content size them
2. **Form containers** - Allow natural growth
3. **Card components** - Content should determine height
4. **Info panels** - Flexible based on information

### Scroll Management

```tsx
// Good - Scroll only when necessary with max bounds
<div className="max-h-[80vh] overflow-y-auto">
  <LongContent />
</div>

// Bad - Fixed height forcing unnecessary scroll
<div className="h-[400px] overflow-y-auto">
  <MaybeShortContent />
</div>
```

## 6. Anti-Patterns to Avoid

### ❌ Viewport Percentage Overuse
```tsx
// Bad - Makes assumptions about viewport
<div style={{ minHeight: '60vh' }}>
  {/* What if viewport is 2000px tall? */}
</div>
```

### ❌ Magic Number Heights
```tsx
// Bad - Arbitrary fixed values
<div style={{ height: '437px' }}>
  {/* Why 437? Will it work everywhere? */}
</div>
```

### ❌ Calculated Heights Without Fallbacks
```tsx
// Bad - Complex calculations prone to edge cases
<div style={{
  height: `calc(100vh - ${headerHeight}px - ${footerHeight}px - 40px)`
}}>
  {/* Brittle and hard to maintain */}
</div>
```

## 7. Testing Checklist

When implementing responsive designs, test:

- [ ] **13" laptop** (1280x800) - Minimum supported
- [ ] **15" laptop** (1920x1080) - Most common
- [ ] **27" desktop** (2560x1440) - Large screens
- [ ] **Portrait orientation** - Tall narrow viewports
- [ ] **With browser zoom** - 75%, 100%, 125%, 150%
- [ ] **Dynamic content** - Empty, minimal, maximum cases

## 8. Migration Guide

### Identifying Components to Update

Look for these red flags:
1. `minHeight` with pixel values
2. `useSuccessPanelSizing()` or similar height hooks
3. `style={{ height: '...' }}` inline styles
4. Components with excessive white space
5. Scroll containers with little content

### Update Process

1. **Remove height constraints**
   ```tsx
   // Before
   <div style={{ minHeight: '400px' }}>

   // After
   <div>
   ```

2. **Let padding create space**
   ```tsx
   // Instead of height, use padding
   <div className="py-8">
   ```

3. **Test across screen sizes**
   - Verify no unwanted white space
   - Ensure content isn't cut off
   - Check visual balance

4. **Add max constraints only if needed**
   ```tsx
   // Only if content can grow unbounded
   <div className="max-h-[600px] overflow-y-auto">
   ```

## 9. Examples from Our Codebase

### ✅ Good: EncryptionSuccess (After Refactor)
```tsx
// Natural content-based sizing
<div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
  <div className="px-6 py-4 text-center">
    <h2>Your vault is ready</h2>
  </div>
  <div className="px-6 pt-6 pb-3">
    <EncryptionSummary />
    <ActionButtons className="mt-6" />
  </div>
</div>
```

### ❌ Bad: Previous Implementation
```tsx
// Forced heights causing white space
<div style={{
  minHeight: responsiveStyles['--success-panel-min-height'], // 400px
  maxHeight: responsiveStyles['--success-panel-max-height'],
}}>
  {/* Same content but with unnecessary space */}
</div>
```

## 10. Component Audit Checklist

Components to review for responsive improvements:

- [ ] `DecryptionSuccess` - Apply same pattern as EncryptionSuccess
- [ ] `DecryptionProgress` - Check for fixed heights
- [ ] `VaultCreationSuccess` - Remove any minHeight constraints
- [ ] `KeyManagementPanel` - Verify natural content flow
- [ ] `ErrorMessage` - Should size to error content
- [ ] `Modal` components - Max height with scroll only when needed
- [ ] `FileDropZone` - Check if min-height is actually needed

## Summary

**Remember**: Responsive design isn't about making components fit predetermined sizes—it's about making them adapt naturally to their content and context. Trust the browser's layout engine and use constraints only when absolutely necessary.

---

*This guide is based on the refactoring of EncryptionSuccess component (2025-01-22) where removing fixed height constraints eliminated ~150px of unwanted white space and improved the experience across all screen sizes.*