# Frontend Test Refactoring Action Plan

*Created: 2025-08-09*

## Overview

This action plan provides specific, prioritized tasks for refactoring the frontend test suite to eliminate implementation detail testing and focus on user behavior validation.

## Priority 1: CSS Class Testing Removal

### Target Files
- `src/__tests__/components/forms/PassphraseField.test.tsx`
- `src/__tests__/components/ui/PrimaryButton.test.tsx`
- `src/__tests__/pages/EncryptPage.test.tsx`
- Any other files with `.toHaveClass()` assertions

### Specific Changes Required

#### PassphraseField.test.tsx
```javascript
// REMOVE this test:
it('applies correct styles for match state', () => {
  const input = screen.getByTestId('passphrase-input');
  expect(input).toHaveClass('border-green-500');
  expect(input).toHaveClass('border-red-400', 'bg-red-50');
});

// REPLACE with:
it('provides visual feedback for passphrase matching', () => {
  const { rerender } = render(
    <PassphraseField {...props} value="test123" matchValue="test123" />
  );
  
  // Test positive state
  expect(screen.getByText('Passphrases match')).toBeInTheDocument();
  expect(screen.getByLabelText(/passphrase/i)).toHaveAttribute('aria-invalid', 'false');
  
  // Test negative state  
  rerender(<PassphraseField {...props} value="test123" matchValue="different" />);
  expect(screen.getByText("Passphrases don't match")).toBeInTheDocument();
  expect(screen.getByLabelText(/passphrase/i)).toHaveAttribute('aria-invalid', 'true');
});
```

#### PrimaryButton.test.tsx
```javascript
// REMOVE size class testing:
it('applies correct size classes', () => {
  expect(screen.getByTestId('primary-button')).toHaveClass('h-10');
  expect(screen.getByTestId('primary-button')).toHaveClass('h-12');
});

// REPLACE with functional testing (if size affects behavior):
it('renders different button sizes appropriately', () => {
  const { rerender } = render(<PrimaryButton size="small">Small</PrimaryButton>);
  const button = screen.getByRole('button', { name: 'Small' });
  expect(button).toBeInTheDocument();
  
  rerender(<PrimaryButton size="large">Large</PrimaryButton>);
  expect(screen.getByRole('button', { name: 'Large' })).toBeInTheDocument();
});

// OR remove entirely if size is purely visual
```

## Priority 2: Data-TestId Migration

### Target Files
- `src/__tests__/components/forms/PassphraseField.test.tsx` 
- `src/__tests__/components/forms/KeyGenerationForm.test.tsx`
- `src/__tests__/components/ui/PrimaryButton.test.tsx`
- `src/__tests__/pages/EncryptPage.test.tsx`

### Migration Strategy

#### Replace data-testid with Semantic Queries

```javascript
// BEFORE:
expect(screen.getByTestId('passphrase-field')).toBeInTheDocument();
expect(screen.getByTestId('passphrase-input')).toBeInTheDocument();
expect(screen.getByTestId('visibility-toggle')).toBeInTheDocument();

// AFTER:
expect(screen.getByLabelText(/passphrase/i)).toBeInTheDocument();
expect(screen.getByRole('button', { name: /show passphrase/i })).toBeInTheDocument();
// Remove generic "field is present" tests entirely
```

#### Component Interaction Focus

```javascript
// BEFORE:
it('renders passphrase input correctly', () => {
  render(<PassphraseField {...defaultProps} />);
  expect(screen.getByTestId('passphrase-field')).toBeInTheDocument();
});

// AFTER:  
it('allows users to enter passphrase securely', () => {
  const handleChange = vi.fn();
  render(<PassphraseField {...defaultProps} onChange={handleChange} />);
  
  const input = screen.getByLabelText(/passphrase/i);
  expect(input).toHaveAttribute('type', 'password');
  
  fireEvent.change(input, { target: { value: 'secure123!' } });
  expect(handleChange).toHaveBeenCalledWith('secure123!');
});
```

### Keep data-testid Only When Necessary

**Acceptable use cases:**
- Complex components without clear semantic alternatives
- Components with multiple similar elements  
- Temporary identification during development

**Document remaining usage:**
```javascript
// Keep data-testid with clear justification
it('manages multiple file selection states', () => {
  // data-testid acceptable here due to multiple similar file items
  expect(screen.getByTestId('file-item-1')).toBeInTheDocument();
  expect(screen.getByTestId('file-item-2')).toBeInTheDocument();
});
```

## Priority 3: Component Presence Test Cleanup

### Target Files
- `src/__tests__/pages/EncryptPage.test.tsx`
- `src/__tests__/pages/DecryptPage.test.tsx`
- `src/__tests__/pages/SetupPage.test.tsx`

### Changes Required

#### Remove Pure Presence Tests
```javascript
// REMOVE these types of tests:
it.skip('should render file drop zone for file selection - REMOVED: Tests component presence not UX', () => {
  // This test was checking that a specific component is rendered
});

it('should render the step indicator', () => {
  expect(screen.getByText('Select Files')).toBeInTheDocument();
  expect(screen.getByText('Choose Key')).toBeInTheDocument();
});
```

#### Focus on User Workflow Tests
```javascript
// KEEP and enhance these workflow tests:
it('should complete file encryption workflow', async () => {
  renderEncryptPage();
  
  // Step 1: User can see encryption interface
  expect(screen.getByText('Encrypt Your Bitcoin Vault')).toBeInTheDocument();
  
  // Step 2: User selects files (test the interaction, not component presence)
  // ... file selection logic
  
  // Step 3: User chooses key
  // ... key selection logic
  
  // Step 4: User initiates encryption
  // ... encryption initiation
  
  // Step 5: User sees success
  expect(screen.getByText('Encryption successful!')).toBeInTheDocument();
});
```

## Implementation Timeline

### Week 1: CSS Class Testing Removal
- [ ] Audit all `.toHaveClass()` usage across test files
- [ ] Replace with user-perceivable state testing
- [ ] Remove purely visual styling tests
- [ ] Update tests to use semantic validation

### Week 2: Data-TestId Migration  
- [ ] Identify all `getByTestId()` usage
- [ ] Replace with semantic queries where possible
- [ ] Document remaining `data-testid` usage with justification
- [ ] Update component tests to focus on interactions

### Week 3: Component Presence Cleanup
- [ ] Remove pure component presence tests
- [ ] Enhance workflow-based integration tests
- [ ] Consolidate similar tests into comprehensive user journeys
- [ ] Review and clean up skipped tests

### Week 4: Validation and Documentation
- [ ] Run full test suite to ensure no regressions
- [ ] Update test documentation
- [ ] Create examples of good vs. bad test patterns
- [ ] Team review of refactored tests

## File-by-File Refactoring Checklist

### PassphraseField.test.tsx
- [ ] Remove CSS class testing (lines 83-94)
- [ ] Replace `getByTestId` with `getByLabelText` (lines 19-21, 27-28, etc.)
- [ ] Focus tests on user interactions vs. component structure
- [ ] Enhance accessibility attribute testing

### PrimaryButton.test.tsx  
- [ ] Remove size class testing (lines 74-83)
- [ ] Replace `getByTestId('primary-button')` with `getByRole('button')`
- [ ] Focus on button behavior vs. styling
- [ ] Keep functional state testing (disabled, loading, etc.)

### EncryptPage.test.tsx
- [ ] Remove component presence tests (lines 121-124, others marked skip)
- [ ] Focus on user workflow completion
- [ ] Replace `getByTestId` for form elements
- [ ] Enhance integration test scenarios

## Quality Gates

### Before Merging Refactored Tests
- [ ] All tests pass with existing functionality
- [ ] No CSS class assertions remain (except justified visual tests)
- [ ] 90%+ of queries use semantic alternatives to `data-testid`
- [ ] All component presence tests replaced with interaction tests
- [ ] User workflows comprehensively covered
- [ ] Error scenarios still properly tested

### Success Metrics
- [ ] Reduced test brittleness during UI changes
- [ ] Improved test readability and maintainability  
- [ ] Enhanced confidence in user experience validation
- [ ] Clearer test failure messages for debugging

## Post-Refactoring Enhancements

### Phase 2 (Post-MVP)
- [ ] Integrate `jest-axe` for automated accessibility testing
- [ ] Add comprehensive keyboard navigation tests
- [ ] Implement desktop app visual regression strategy
- [ ] Performance testing for critical user interactions

### Phase 3 (Future)
- [ ] Cross-platform testing strategy
- [ ] Enhanced error recovery testing
- [ ] Advanced user interaction simulation
- [ ] Test reporting and analytics improvements

## Resources and References

- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles/)
- [Common Mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Frontend Testing Guidelines](./frontend-testing-guidelines.md)
- [Test Suite Assessment](./test-suite-assessment.md)

---

*This action plan should be updated as refactoring progresses and new patterns emerge. Track progress using the checklists above.*