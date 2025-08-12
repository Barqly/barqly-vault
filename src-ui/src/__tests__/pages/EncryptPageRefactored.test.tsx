import { render, screen } from '@testing-library/react';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import EncryptPageRefactored from '../../pages/EncryptPageRefactored';

// Mock the encryption workflow hook
vi.mock('../../hooks/useEncryptionWorkflow', () => ({
  useEncryptionWorkflow: () => ({
    error: null,
    success: false,
    progress: null,
    clearError: vi.fn(),
    toasts: [],
    removeToast: vi.fn(),
    handleReset: vi.fn(),
    encryptionResult: null,
  }),
}));

// Mock the AppHeader component
vi.mock('../../components/common/AppHeader', () => ({
  default: ({ screen }: { screen: string }) => (
    <div data-testid={`app-header-${screen}`}>Mock Header</div>
  ),
}));

// Mock the ProgressBar component
vi.mock('../../components/ui/ProgressBar', () => ({
  default: () => <div data-testid="progress-bar">Mock Progress Bar</div>,
}));

// Mock the step components
vi.mock('../../components/encrypt/steps/EncryptStep1', () => ({
  default: () => <div data-testid="encrypt-step-1">Step 1: Select Files</div>,
}));

vi.mock('../../components/encrypt/steps/EncryptStep2', () => ({
  default: () => <div data-testid="encrypt-step-2">Step 2: Choose Key</div>,
}));

vi.mock('../../components/encrypt/steps/EncryptStep3', () => ({
  default: () => <div data-testid="encrypt-step-3">Step 3: Encrypt</div>,
}));

// Mock other components
vi.mock('../../components/ui/ToastContainer', () => ({
  default: () => <div data-testid="toast-container">Mock Toasts</div>,
}));

vi.mock('../../components/ui/CollapsibleHelp', () => ({
  default: () => <div data-testid="collapsible-help">Mock Help</div>,
}));

describe('EncryptPageRefactored', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with step-based layout', () => {
    render(<EncryptPageRefactored />);

    // Check that the main structure exists
    expect(screen.getByTestId('app-header-encrypt')).toBeInTheDocument();
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
  });

  it('should show step 1 by default', () => {
    render(<EncryptPageRefactored />);

    // Step 1 should be visible by default
    expect(screen.getByTestId('encrypt-step-1')).toBeInTheDocument();
    expect(screen.getByText('Step 1: Select Files')).toBeInTheDocument();
  });

  it('should include help section', () => {
    render(<EncryptPageRefactored />);

    expect(screen.getByTestId('collapsible-help')).toBeInTheDocument();
  });

  it('should use EncryptFlowProvider context', () => {
    // This test verifies that the component renders without context errors
    expect(() => render(<EncryptPageRefactored />)).not.toThrow();
  });
});
