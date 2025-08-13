# UI Testing Standards and Best Practices

_Last Updated: August 7, 2025_

This document captures critical learnings from building a robust test suite for the Barqly Vault UI, specifically addressing mock isolation, test philosophy, and React Testing Library with Vitest best practices.

## Table of Contents

- [Mock Isolation and State Management](#mock-isolation-and-state-management)
- [Test Philosophy: What to Test](#test-philosophy-what-to-test)
- [React Testing Library Best Practices](#react-testing-library-best-practices)
- [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)

---

## Mock Isolation and State Management

### The Problem: Mock State Bleeding Between Tests

When tests share mock objects, state can leak between tests causing unpredictable failures. A test might pass in isolation but fail when run with the full suite.

### L Wrong Approach: Creating New Mock Objects

```javascript
describe("Component", () => {
  // DON'T: Create factory functions that generate new objects
  const createMockHook = () => ({
    data: null,
    loading: false,
    error: null,
  });

  beforeEach(() => {
    // This breaks jsdom environment!
    const mock = createMockHook();
    mockUseHook.mockReturnValue(mock);
  });
});
```

**Why this fails:** Creating new objects in `beforeEach` can break the jsdom environment setup, leading to "document is not defined" errors. The jsdom environment requires objects to remain in the proper scope.

###  Correct Approach: Reset Properties on Existing Objects

```javascript
describe("Component", () => {
  // DO: Create mock object once at describe scope
  const mockHook = {
    data: null,
    loading: false,
    error: null,
    fetchData: vi.fn(),
  };

  beforeEach(() => {
    // Reset mock functions
    vi.clearAllMocks();

    // Reset mock state while keeping same object reference
    Object.assign(mockHook, {
      data: null,
      loading: false,
      error: null,
    });

    // Set the mock return value
    mockUseHook.mockReturnValue(mockHook);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
```

**Key insights:**

1. Keep mock objects at describe scope - don't recreate them
2. Use `Object.assign()` to reset properties while maintaining object reference
3. Call `vi.clearAllMocks()` to reset function call counts and history
4. The order matters: clear mocks first, then reset state, then set return values

### Nested beforeEach Execution Order

When using nested describe blocks with their own `beforeEach`:

```javascript
describe("Parent", () => {
  beforeEach(() => {
    // Runs first for every test
    mockHook.data = null;
  });

  describe("Child", () => {
    beforeEach(() => {
      // Runs second, after parent's beforeEach
      mockHook.data = "test-data";
    });

    it("test", () => {
      // mockHook.data is 'test-data'
    });
  });
});
```

## Test Philosophy: What to Test

### Tests to KEEP: Customer Experience

 **Keep tests that validate user-visible behavior:**

```javascript
it("should show error message when login fails", () => {
  // User sees an error - KEEP
  mockAuth.mockReturnValue({ error: "Invalid credentials" });
  render(<LoginForm />);
  expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
});

it("should enable submit button when all fields are valid", () => {
  // User interaction flow - KEEP
  render(<Form />);
  fillOutForm();
  expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
});

it("should display loading spinner during data fetch", () => {
  // User sees loading state - KEEP
  mockHook.mockReturnValue({ loading: true });
  render(<DataList />);
  expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
});
```

### Tests to SKIP: Implementation Details

L **Skip tests that check internal implementation:**

```javascript
it.skip("should call selectFiles when button clicked - REMOVED: Tests implementation not UX", () => {
  // Testing that a function was called - SKIP
  fireEvent.click(button);
  expect(mockSelectFiles).toHaveBeenCalled();
});

it.skip("should update internal state - REMOVED: Tests implementation detail", () => {
  // Testing internal state changes - SKIP
  expect(component.state.isOpen).toBe(true);
});

it.skip("should pass correct props to child - REMOVED: Tests component internals", () => {
  // Testing prop passing - SKIP
  expect(ChildComponent).toHaveBeenCalledWith({ foo: "bar" });
});
```

### Test Decision Framework

Ask these questions to determine if a test should be kept:

1. **Does it test something the user can see or interact with?** � KEEP
2. **Does it test critical business logic that affects user experience?** � KEEP
3. **Does it test that a function was called with specific arguments?** � SKIP
4. **Does it test internal state that doesn't affect the UI?** � SKIP
5. **Does it test the exact text format when the meaning is clear?** � SKIP
6. **Does it test component integration that ensures features work together?** � KEEP

## React Testing Library Best Practices

### Understanding Mock Hoisting in Vitest

```javascript
// All vi.mock() calls are hoisted to the top of the file
vi.mock("../../hooks/useAuth"); // This runs first

describe("Component", () => {
  // This runs after hoisting
  const mockUseAuth = vi.mocked(useAuth);

  beforeEach(() => {
    // Change mock behavior per test
    mockUseAuth.mockReturnValue({ user: null });
  });
});
```

### Handling React 19.1 act() Warnings

With React 19.1, you may see act() warnings for async state updates:

```javascript
// Warning: An update to Component inside a test was not wrapped in act(...)
```

**Solutions:**

1. **Use async utilities from React Testing Library** (they auto-wrap in act):

```javascript
// Instead of manual waiting
await act(async () => {
  await wait(100);
});

// Use RTL utilities
await waitFor(() => {
  expect(screen.getByText("Loaded")).toBeInTheDocument();
});
```

2. **Use findBy queries** (auto-wrapped in act):

```javascript
// Instead of getBy + waitFor
const element = await screen.findByText("Async Content");
```

### Proper use of rerender

```javascript
it("should update when props change", () => {
  const { rerender } = render(<Component prop="initial" />);

  // Update mock if needed
  mockHook.mockReturnValue({ data: "new-data" });

  // Rerender with new props
  rerender(<Component prop="updated" />);

  expect(screen.getByText("updated")).toBeInTheDocument();
});
```

**Note:** `rerender` updates the same component instance. It won't help if your mock isn't updating correctly.

## Common Pitfalls and Solutions

### Pitfall 1: Tests Pass Individually but Fail Together

**Cause:** Mock state contamination between tests

**Solution:**

```javascript
beforeEach(() => {
  vi.clearAllMocks(); // Clear function calls
  Object.assign(mockObject, defaultState); // Reset state
});
```

### Pitfall 2: "document is not defined" Errors

**Cause:** Creating objects outside proper test scope

**Solution:** Keep mock objects at describe level, only reset their properties

### Pitfall 3: Mock Not Updating with mockReturnValue

**Cause:** Mutating the mock object instead of calling mockReturnValue

**Wrong:**

```javascript
mockHook.data = "new-data"; // Won't trigger re-render
```

**Right:**

```javascript
mockUseHook.mockReturnValue({
  ...mockHook,
  data: "new-data",
});
```

### Pitfall 4: Testing Exact Text Format

**Problem:** Tests break when text formatting changes slightly

**Wrong:**

```javascript
expect(screen.getByText('2 files selected " 2.00 KB')).toBeInTheDocument();
```

**Right:**

```javascript
expect(screen.getByText(/2 files selected/)).toBeInTheDocument();
expect(screen.getByText(/2.*KB/)).toBeInTheDocument();
```

### Pitfall 5: Mocking Complex Components

**Problem:** Complex mock components that don't match actual behavior

**Solution:** Keep mocks simple and focused on the test's needs:

```javascript
vi.mock("./ComplexComponent", () => ({
  default: () => <div data-testid="complex-component">Mocked</div>,
}));
```

## Test Isolation Checklist

Before committing tests, verify:

- [ ] Each test can run independently (`it.only` works)
- [ ] Tests pass when run in different orders
- [ ] No test depends on the result of another test
- [ ] Mock state is properly reset in `beforeEach`
- [ ] All async operations are properly awaited
- [ ] Tests focus on user experience, not implementation
- [ ] No hardcoded timeouts - use `waitFor` instead
- [ ] Error scenarios are tested from the user's perspective

## Testing Command Summary

```bash
# Run all tests
make validate-ui

# Run specific test file
npx vitest run src/__tests__/path/to/test.tsx

# Run single test
npx vitest run -t "test name"

# Run tests in watch mode
npx vitest watch

# Run with coverage
npx vitest run --coverage
```

## Key Takeaways

1. **Test isolation is critical** - Each test must be independent
2. **Mock objects should be stable** - Reset properties, don't recreate objects
3. **Test user experience** - Not implementation details
4. **Trust the framework** - React Testing Library's utilities handle act() wrapping
5. **When in doubt, test behavior** - What the user sees and does matters most

---

_Remember: A test suite is only as strong as its weakest test. One flaky test can undermine confidence in the entire suite._
