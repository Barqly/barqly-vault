# Frontend Testing Guidelines

## Testing Philosophy

Build resilient frontend test suites that enable confidence in production releases while minimizing friction during development. Tests should focus on user behavior and outcomes rather than implementation details.

## Key Principles

### 1. Test Behavior, Not Implementation

**✅ Good - Tests user behavior:**
```javascript
// Test what users see and do
expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
expect(screen.getByText('Passphrases match')).toBeInTheDocument()
```

**❌ Bad - Tests implementation details:**
```javascript
// Tests internal structure
expect(container.querySelector('.btn-primary.large')).toBeInTheDocument()
expect(component.state.isLoading).toBe(true)
```

### 2. Use Semantic Queries

**Priority order for element queries:**
1. `getByRole` - Accessible roles that users interact with
2. `getByLabelText` - Form elements by their labels
3. `getByText` - Visible text content
4. `getByTestId` - Last resort for complex cases

**✅ Preferred:**
```javascript
screen.getByRole('button', { name: 'Create Key' })
screen.getByLabelText(/passphrase/i)
screen.getByText('Encryption successful!')
```

**⚠️ Use sparingly:**
```javascript
screen.getByTestId('complex-component') // Only when semantic queries fail
```

### 3. Focus on User Workflows

Test complete user journeys rather than isolated component states:

```javascript
// ✅ Good - Complete user workflow
it('should encrypt files successfully', async () => {
  // 1. User selects files
  await selectFiles(['file1.txt', 'file2.txt'])
  
  // 2. User chooses encryption key
  await selectKey('my-key')
  
  // 3. User initiates encryption
  await clickEncryptButton()
  
  // 4. Verify success state user sees
  expect(screen.getByText('Encryption successful!')).toBeInTheDocument()
})
```

### 4. Separate UI from Business Logic

- **Pure Functions**: Test business logic separately from UI components
- **Hooks**: Test custom hooks independently with `renderHook`
- **Components**: Focus on user interactions and visual feedback

## Test Organization Structure

```
__tests__/
├── components/           # Component behavior tests
├── hooks/               # Custom hook logic tests  
├── lib/                 # Pure function unit tests
├── pages/               # Page-level integration tests
├── regression/          # Critical path protection tests
└── setup.ts            # Test configuration
```

## Testing Patterns for Desktop Apps

### Tauri API Integration

Mock Tauri APIs to test error handling and state management:

```javascript
vi.mock('../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}))

// Test both success and failure scenarios
mockSafeInvoke.mockResolvedValueOnce(successResult)
mockSafeInvoke.mockRejectedValueOnce(errorResult)
```

### Environment Detection

Test both desktop and web environments:

```javascript
// Desktop environment
mockIsTauri.mockReturnValue(true)

// Web environment  
mockIsTauri.mockReturnValue(false)
```

### Progress Tracking

Test real-time updates and user feedback:

```javascript
// Simulate progress updates
act(() => {
  progressCallback({ payload: { progress: 0.5, message: 'Encrypting...' } })
})

expect(screen.getByText('Progress: 50%')).toBeInTheDocument()
```

## Accessibility Testing Integration

### Current Approach
```javascript
it('has proper accessibility attributes', () => {
  const input = screen.getByLabelText(/passphrase/i)
  expect(input).toHaveAttribute('aria-describedby', 'passphrase-help')
  
  const button = screen.getByRole('button', { name: /show passphrase/i })
  expect(button).toHaveAttribute('aria-label', 'Show passphrase')
})
```

### Future Enhancement (Post-MVP)
Consider integrating `jest-axe` for automated accessibility testing:

```javascript
import { axe, toHaveNoViolations } from 'jest-axe'

it('should not have accessibility violations', async () => {
  const { container } = render(<Component />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

## Common Anti-Patterns to Avoid

### 1. CSS Class Testing
```javascript
// ❌ Avoid - Brittle and implementation-focused
expect(input).toHaveClass('border-green-500')

// ✅ Better - Test user-perceivable state  
expect(screen.getByText('Passphrases match')).toBeInTheDocument()
```

### 2. Internal State Testing
```javascript
// ❌ Avoid - Testing React internals
expect(component.state.isValid).toBe(true)

// ✅ Better - Test user-visible outcomes
expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled()
```

### 3. Implementation Detail Mocking
```javascript
// ❌ Avoid - Over-mocking internal functions
vi.mock('./internal-helper-function')

// ✅ Better - Mock external dependencies only
vi.mock('@tauri-apps/api/tauri')
```

## Regression Testing Strategy

### Critical Path Protection
Maintain dedicated regression tests for:
- Form submission + API integration failures
- Environment detection edge cases  
- State synchronization issues
- Error recovery workflows

### Example Regression Test Structure
```javascript
describe('REGRESSION: Critical Feature Name', () => {
  it('should prevent specific failure scenario that occurred in production', async () => {
    // Reproduce exact failure conditions
    // Verify the fix prevents regression
    // Ensure graceful error handling
  })
})
```

## Maintenance Guidelines

### Test Hygiene
- Remove obsolete tests when features change
- Update brittle tests to focus on behavior
- Keep test descriptions clear and specific
- Run tests in isolation and as a suite

### Performance Considerations
- Use `userEvent` for realistic interactions
- Batch tool calls when possible
- Mock heavy external dependencies
- Consider test parallelization for large suites

### Review Criteria
Before merging test changes:
- [ ] Tests focus on user behavior, not implementation
- [ ] Semantic queries used appropriately  
- [ ] Error scenarios covered
- [ ] Tests are maintainable and readable
- [ ] No brittle implementation details tested

## Desktop App Specific Considerations

### Visual Regression Testing
For desktop applications, traditional web-based visual regression tools (Percy/Chromatic) may not be suitable. Consider:
- Screenshot-based testing within the test suite
- Manual visual review processes
- Component story-based visual testing with Storybook

### Platform-Specific Testing
- Test keyboard shortcuts and accessibility
- Verify file system interactions
- Test native OS integration features
- Consider different operating systems in CI

---

*This document should be updated as testing practices evolve and new patterns emerge.*