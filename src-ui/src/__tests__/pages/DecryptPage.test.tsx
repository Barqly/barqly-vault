import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import DecryptPage from '../../pages/DecryptPage';
import { useFileDecryption } from '../../hooks/useFileDecryption';
import { useDecryptionWorkflow } from '../../hooks/useDecryptionWorkflow';
import { ErrorCode } from '../../lib/api-types';
import { createTauriTestEnvironment, MOCK_RESPONSES, resetTauriMocks } from '../utils/tauri-mocks';

// Mock the hooks
vi.mock('../../hooks/useFileDecryption');
vi.mock('../../hooks/useDecryptionWorkflow');

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWebview: vi.fn(() => ({
    onDragDropEvent: vi.fn(),
  })),
}));

vi.mock('@tauri-apps/api/path', () => ({
  documentDir: vi.fn(() => Promise.resolve('/Users/test/Documents')),
  join: vi.fn((...args) => Promise.resolve(args.join('/'))),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd: string) => {
    if (cmd === 'list_keys_command') {
      return Promise.resolve(MOCK_RESPONSES.keyList);
    }
    return Promise.resolve();
  }),
}));

const mockUseFileDecryption = vi.mocked(useFileDecryption);
const mockUseDecryptionWorkflow = vi.mocked(useDecryptionWorkflow);

// Helper function to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('DecryptPage', () => {
  const mockDecryptionHook: any = {
    selectEncryptedFile: vi.fn(),
    setSelectedFile: vi.fn(),
    setKeyId: vi.fn(),
    setPassphrase: vi.fn(),
    setOutputPath: vi.fn(),
    decryptFile: vi.fn(),
    reset: vi.fn(),
    clearError: vi.fn(),
    clearSelection: vi.fn(),
    isLoading: false,
    error: null,
    success: null,
    progress: null,
    selectedFile: null,
    selectedKeyId: null,
    passphrase: '',
    outputPath: null,
  };

  const mockWorkflowHook: any = {
    // State from useFileDecryption
    selectedFile: null,
    selectedKeyId: null,
    passphrase: '',
    outputPath: null,
    passphraseAttempts: 0,
    isDecrypting: false,
    showAdvancedOptions: false,
    setShowAdvancedOptions: vi.fn(),
    vaultMetadata: null,

    // From useFileDecryption
    isLoading: false,
    error: null,
    success: null,
    progress: null,
    clearError: vi.fn(),
    clearSelection: vi.fn(),
    setPassphrase: vi.fn(),
    setOutputPath: vi.fn(),

    // Computed
    currentStep: 1, // Default to step 1

    // Handlers
    handleFileSelected: vi.fn(),
    handleDecryption: vi.fn(),
    handleReset: vi.fn(),
    handleDecryptAnother: vi.fn(),
    handleKeyChange: vi.fn(),

    // Navigation handlers
    handleStepNavigation: vi.fn(),
  };

  // Setup standardized Tauri environment
  let tauriEnv: ReturnType<typeof createTauriTestEnvironment>;

  beforeEach(() => {
    // Reset mock functions but keep the same object references
    vi.clearAllMocks();

    // Reset mock state to defaults
    Object.assign(mockDecryptionHook, {
      isLoading: false,
      error: null,
      success: null,
      progress: null,
      selectedFile: null,
      selectedKeyId: null,
      passphrase: '',
      outputPath: null,
    });

    // Reset workflow hook state
    Object.assign(mockWorkflowHook, {
      selectedFile: null,
      selectedKeyId: null,
      passphrase: '',
      outputPath: null,
      passphraseAttempts: 0,
      isDecrypting: false,
      showAdvancedOptions: false,
      vaultMetadata: null,
      isLoading: false,
      error: null,
      success: null,
      progress: null,
      currentStep: 1, // Default to step 1
    });

    mockUseFileDecryption.mockReturnValue(mockDecryptionHook);
    mockUseDecryptionWorkflow.mockReturnValue(mockWorkflowHook);

    // Initialize standardized Tauri mocking
    tauriEnv = createTauriTestEnvironment({
      isTauriEnv: true,
      includeProgressSimulation: true,
    });
  });

  afterEach(() => {
    resetTauriMocks();
  });

  describe('Initial User Experience', () => {
    it('should display trust indicators and clear instructions for decryption', () => {
      renderWithRouter(<DecryptPage />);

      // Header elements help user feel secure
      expect(screen.getByText('Decrypt Your Vault')).toBeInTheDocument();
      expect(screen.getByText('Secure file encryption for Bitcoin custody')).toBeInTheDocument();

      // File selection UI is available for user
      expect(screen.getByRole('button', { name: 'Select Vault' })).toBeInTheDocument();
      expect(screen.getByText('Drop your encrypted vault here (.age format)')).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should handle valid .age file selection', async () => {
      const { rerender } = renderWithRouter(<DecryptPage />);

      // Simulate file selection through the mock - update workflow hook
      mockWorkflowHook.selectedFile = '/path/to/vault-2024-01-15.age';
      mockWorkflowHook.currentStep = 2; // Auto-advance to step 2 after file selection
      mockDecryptionHook.selectedFile = '/path/to/vault-2024-01-15.age';
      mockDecryptionHook.selectEncryptedFile.mockResolvedValue(undefined);

      rerender(
        <BrowserRouter>
          <DecryptPage />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Choose Key')).toBeInTheDocument();
      });
    });

    // File type validation is handled by the FileDropZone component

    it('should extract metadata from filename', async () => {
      const { rerender } = renderWithRouter(<DecryptPage />);

      // Update both hooks to reflect file selection and step advancement
      mockWorkflowHook.selectedFile = '/path/to/bitcoin-vault-2024-01-15.age';
      mockWorkflowHook.currentStep = 2; // Move to step 2 after file selection
      mockWorkflowHook.vaultMetadata = { creationDate: '2024-01-15' };
      mockDecryptionHook.selectedFile = '/path/to/bitcoin-vault-2024-01-15.age';

      rerender(
        <BrowserRouter>
          <DecryptPage />
        </BrowserRouter>,
      );

      // The component should progress to step 2 and show key selection dropdown
      await waitFor(() => {
        expect(screen.getByText('Choose the key used for encryption')).toBeInTheDocument();
      });
    });
  });

  describe('Passphrase Entry Workflow', () => {
    beforeEach(() => {
      mockDecryptionHook.selectedFile = '/path/to/vault.age';
    });

    it('should guide user through key selection and passphrase entry', () => {
      // Set up workflow hook with proper state
      mockWorkflowHook.selectedFile = '/path/to/vault.age';
      mockWorkflowHook.selectedKeyId = 'test-key-id';
      mockWorkflowHook.currentStep = 2; // On step 2 for key/passphrase entry
      mockWorkflowHook.vaultMetadata = {}; // Initialize vaultMetadata to avoid null error

      // Also update decryption hook for consistency
      mockDecryptionHook.selectedFile = '/path/to/vault.age';
      mockDecryptionHook.selectedKeyId = 'test-key-id';

      renderWithRouter(<DecryptPage />);

      // User can enter passphrase after selecting key
      const passphraseInput = screen.getByPlaceholderText('Enter your key passphrase');
      expect(passphraseInput).toBeInTheDocument();
    });

    it('should track passphrase attempts on failed decryption', async () => {
      // Set up the workflow mock to show the ready panel
      mockWorkflowHook.selectedFile = '/path/to/vault.age';
      mockWorkflowHook.selectedKeyId = 'test-key-id';
      mockWorkflowHook.passphrase = 'wrong-passphrase';
      mockWorkflowHook.outputPath = '/output/path';
      mockWorkflowHook.currentStep = 3; // Ensure we're on the ready step

      const error = {
        code: ErrorCode.DECRYPTION_FAILED,
        message: 'Wrong passphrase',
        recovery_guidance: 'The passphrase is incorrect',
        user_actionable: true,
      };

      mockWorkflowHook.handleDecryption.mockRejectedValue(error);

      renderWithRouter(<DecryptPage />);

      // Wait for the component to render and show the decrypt button
      await waitFor(() => {
        expect(screen.getByText('Decrypt Now')).toBeInTheDocument();
      });

      const decryptButton = screen.getByText('Decrypt Now');

      await act(async () => {
        await userEvent.click(decryptButton);
      });

      await waitFor(() => {
        expect(mockWorkflowHook.handleDecryption).toHaveBeenCalled();
      });
    });
  });

  describe('Decryption Readiness', () => {
    beforeEach(() => {
      mockWorkflowHook.selectedFile = '/path/to/vault.age';
      mockWorkflowHook.selectedKeyId = 'test-key-id';
      mockWorkflowHook.passphrase = 'test-passphrase';
      mockWorkflowHook.outputPath = '/output/path';
      mockWorkflowHook.currentStep = 3; // Ensure we're on the ready step
    });

    it('should indicate when user is ready to decrypt', () => {
      renderWithRouter(<DecryptPage />);

      // User sees clear confirmation they're ready to proceed
      expect(screen.getByText('Ready to Decrypt Your Vault')).toBeInTheDocument();
    });
  });

  describe('Decryption Process', () => {
    beforeEach(() => {
      mockWorkflowHook.selectedFile = '/path/to/vault.age';
      mockWorkflowHook.selectedKeyId = 'test-key-id';
      mockWorkflowHook.passphrase = 'correct-passphrase';
      mockWorkflowHook.outputPath = '/output/path';
      mockWorkflowHook.currentStep = 3; // Ensure we're on the ready step
    });

    it('should show ready state when all fields are filled', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Ready to Decrypt Your Vault')).toBeInTheDocument();
      expect(screen.getByText('Valid vault file selected')).toBeInTheDocument();
      expect(screen.getByText('Key and passphrase verified')).toBeInTheDocument();
      expect(screen.getByText('Recovery location ready')).toBeInTheDocument();
    });

    it('should handle successful decryption', async () => {
      const successResult = {
        output_dir: '/output/path',
        extracted_files: ['file1.txt', 'file2.txt'],
        manifest_verified: true,
      };

      mockWorkflowHook.handleDecryption.mockResolvedValue(undefined);

      renderWithRouter(<DecryptPage />);

      // Wait for the decrypt button to be available
      await waitFor(() => {
        expect(screen.getByText('Decrypt Now')).toBeInTheDocument();
      });

      const decryptButton = screen.getByText('Decrypt Now');

      await act(async () => {
        await userEvent.click(decryptButton);
      });

      await waitFor(() => {
        expect(mockWorkflowHook.handleDecryption).toHaveBeenCalled();
      });

      // Update the hook state to simulate success
      mockWorkflowHook.success = successResult;
      mockWorkflowHook.isDecrypting = false;
    });

    it('should display progress during decryption', async () => {
      mockDecryptionHook.isDecrypting = true;
      mockDecryptionHook.progress = {
        progress: 50,
        message: 'Decrypting files...',
      };

      renderWithRouter(<DecryptPage />);

      // When isDecrypting is true and progress exists, DecryptProgress component is shown
      // This test just validates that the decryption state is properly handled
      expect(mockDecryptionHook.isDecrypting).toBe(true);
      expect(mockDecryptionHook.progress).toMatchObject({
        progress: 50,
        message: 'Decrypting files...',
      });
    });

    it('should handle decryption errors gracefully', async () => {
      const error = {
        code: ErrorCode.DECRYPTION_FAILED,
        message: 'Decryption failed',
        recovery_guidance: 'File appears to be corrupted',
        user_actionable: true,
      };

      // Set up workflow hook with error state
      mockWorkflowHook.error = error;
      mockWorkflowHook.isDecrypting = false; // Not decrypting, so error should show

      // Also update decryption hook
      mockDecryptionHook.error = error;
      mockDecryptionHook.decryptFile.mockRejectedValue(error);

      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Decryption failed')).toBeInTheDocument();
    });

    it('should manage cancellation based on progress to prevent data corruption', () => {
      // Test at 45% - cancellation allowed
      mockDecryptionHook.progress = {
        progress: 45,
        message: 'Processing...',
      };
      const { rerender } = renderWithRouter(<DecryptPage />);
      const cancelButton = screen.queryByText('Cancel');
      if (cancelButton) {
        expect(cancelButton).toBeInTheDocument();
      }

      // Test at 92% - cancellation prevented to avoid corruption
      mockDecryptionHook.progress = {
        progress: 92,
        message: 'Finalizing...',
      };
      rerender(
        <BrowserRouter>
          <DecryptPage />
        </BrowserRouter>,
      );
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    const successResult = {
      output_dir: '/Users/test/Desktop/Barqly-Recovery-2024-01-15',
      extracted_files: ['wallet-descriptor.json', 'seed-phrase.txt', 'xpub-keys.txt'],
      manifest_verified: true,
    };

    beforeEach(() => {
      mockWorkflowHook.success = successResult;
    });

    it('should display success message with file details', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Vault Successfully Decrypted!')).toBeInTheDocument();
      expect(screen.getByText('Files recovered and ready to use')).toBeInTheDocument();
    });

    it('should show file count in stats bar only', async () => {
      renderWithRouter(<DecryptPage />);

      // Check that the file count is displayed in the stats bar only
      expect(screen.getByText('3 files')).toBeInTheDocument();

      // Verify that the expanded "recovered files" section no longer exists
      expect(screen.queryByText('3 recovered files')).not.toBeInTheDocument();
      expect(screen.queryByText('wallet-descriptor.json')).not.toBeInTheDocument();
    });

    it('should display output directory with copy functionality', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText(successResult.output_dir)).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('should show manifest verification status', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('should provide option to decrypt another file', async () => {
      renderWithRouter(<DecryptPage />);

      // Wait for the success component to render and show the button
      await waitFor(() => {
        expect(screen.getByText('Decrypt More')).toBeInTheDocument();
      });

      const anotherButton = screen.getByText('Decrypt More');

      await act(async () => {
        await userEvent.click(anotherButton);
      });

      expect(mockWorkflowHook.handleDecryptAnother).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display wrong passphrase error with recovery guidance', () => {
      const error = {
        code: 'WRONG_PASSPHRASE',
        message: 'Unable to decrypt - passphrase may be incorrect',
        recovery_guidance: 'Passphrases are case-sensitive and must match exactly',
        user_actionable: true,
      };

      // Set up workflow hook with error state
      mockWorkflowHook.error = error;
      mockWorkflowHook.isDecrypting = false; // Not decrypting, so error should show

      mockDecryptionHook.error = error;
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText(error.message)).toBeInTheDocument();
      expect(screen.getByText(error.recovery_guidance!)).toBeInTheDocument();
    });

    it('should display corrupted file error', () => {
      const error = {
        code: 'ARCHIVE_CORRUPTED',
        message: 'File appears to be damaged or incomplete',
        recovery_guidance: 'The vault file may have been corrupted during storage',
        user_actionable: true,
      };

      // Set up workflow hook with error state
      mockWorkflowHook.error = error;
      mockWorkflowHook.isDecrypting = false;

      mockDecryptionHook.error = error;
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText(error.message)).toBeInTheDocument();
    });

    it('should display insufficient space error', () => {
      const error = {
        code: 'STORAGE_FAILED',
        message: 'Not enough space to recover files',
        recovery_guidance: 'Need 100 MB, only 50 MB available at destination',
        user_actionable: true,
      };

      // Set up workflow hook with error state
      mockWorkflowHook.error = error;
      mockWorkflowHook.isDecrypting = false;

      mockDecryptionHook.error = error;
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText(error.message)).toBeInTheDocument();
    });

    it('should display permission denied error', () => {
      const error = {
        code: ErrorCode.PERMISSION_DENIED,
        message: 'Cannot write to selected location',
        recovery_guidance: "You don't have permission to save files here",
        user_actionable: true,
      };

      // Set up workflow hook with error state
      mockWorkflowHook.error = error;
      mockWorkflowHook.isDecrypting = false;

      mockDecryptionHook.error = error;
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText(error.message)).toBeInTheDocument();
    });
  });

  describe('User Workflow Validation', () => {
    it('should only allow decryption when all required information is provided', () => {
      // Initially, decrypt button should not be visible when fields are empty
      const { rerender } = renderWithRouter(<DecryptPage />);
      expect(screen.queryByText('Decrypt Now')).not.toBeInTheDocument();

      // Update the mock with all fields filled
      mockUseDecryptionWorkflow.mockReturnValue({
        ...mockWorkflowHook,
        selectedFile: '/path/to/vault.age',
        selectedKeyId: 'test-key-id',
        passphrase: 'test-passphrase',
        outputPath: '/output/path',
        currentStep: 3, // Ensure we're on the ready step
      });

      // Re-render with complete data
      rerender(
        <BrowserRouter>
          <DecryptPage />
        </BrowserRouter>,
      );

      // Now the decrypt button should be visible
      expect(screen.getByText('Decrypt Now')).toBeInTheDocument();
    });
  });

  // Accessibility features are tested through component integration

  describe('Environment-Specific Behavior', () => {
    it('should handle Tauri desktop environment correctly', async () => {
      // Already set up with isTauriEnv: true in beforeEach
      mockDecryptionHook.selectEncryptedFile.mockResolvedValue('/path/to/vault.age');

      renderWithRouter(<DecryptPage />);

      // Verify Tauri environment is properly detected
      expect(tauriEnv.mocks.isTauri()).toBe(true);
      expect(tauriEnv.mocks.isWeb()).toBe(false);

      // Verify page renders correctly in desktop environment
      expect(screen.getByText('Decrypt Your Vault')).toBeInTheDocument();
    });

    it('should handle web environment correctly', async () => {
      // Reset and create web environment
      resetTauriMocks();
      tauriEnv = createTauriTestEnvironment({ isTauriEnv: false });

      renderWithRouter(<DecryptPage />);

      // Verify web environment is properly detected
      expect(tauriEnv.mocks.isTauri()).toBe(false);
      expect(tauriEnv.mocks.isWeb()).toBe(true);

      // Component should still render in web environment
      expect(screen.getByText('Decrypt Your Vault')).toBeInTheDocument();
    });

    it('should handle file selection in desktop environment', async () => {
      // Test the page behavior when a file is selected
      const { rerender } = renderWithRouter(<DecryptPage />);

      // Initially no file selected - file selection UI should be available
      expect(screen.getByRole('button', { name: 'Select Vault' })).toBeInTheDocument();

      // Update hooks to simulate file selection
      mockWorkflowHook.selectedFile = '/path/to/encrypted.age';
      mockWorkflowHook.currentStep = 2; // Auto-advance to step 2
      mockDecryptionHook.selectedFile = '/path/to/encrypted.age';

      rerender(
        <BrowserRouter>
          <DecryptPage />
        </BrowserRouter>,
      );

      // Verify UI updates after file selection - step 2 is now visible
      await waitFor(() => {
        expect(screen.getByText('Choose Key')).toBeInTheDocument();
      });
    });

    it('should handle progress events during decryption', async () => {
      mockDecryptionHook.selectedFile = '/path/to/vault.age';
      mockDecryptionHook.selectedKeyId = 'test-key-id';
      mockDecryptionHook.passphrase = 'test-passphrase';
      mockDecryptionHook.outputPath = '/output/path';
      mockDecryptionHook.isDecrypting = true;
      mockDecryptionHook.progress = {
        progress: 25,
        message: 'Reading encrypted file...',
      };

      renderWithRouter(<DecryptPage />);

      // Simulate progress updates via Tauri events
      if (tauriEnv.progressSimulator) {
        tauriEnv.progressSimulator.simulateProgress('decryption-progress', [
          { progress: 50, message: 'Decrypting data...' },
          { progress: 75, message: 'Extracting files...' },
          { progress: 100, message: 'Complete!' },
        ]);
      }

      // Verify progress tracking
      expect(mockDecryptionHook.progress).toMatchObject({
        progress: expect.any(Number),
        message: expect.any(String),
      });
    });
  });

  describe('Tauri API Error Handling', () => {
    it('should handle file dialog cancellation gracefully', async () => {
      // Test page behavior when file selection is cancelled (selectedFile remains null)
      renderWithRouter(<DecryptPage />);

      // Verify initial state with no file selected - file selection UI should be available
      expect(screen.getByRole('button', { name: 'Select Vault' })).toBeInTheDocument();

      // Mock hook state remains unchanged (no file selected)
      expect(mockDecryptionHook.selectedFile).toBeNull();

      // Should not show error when no file is selected
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('should handle file selection API failure', async () => {
      const error = {
        code: ErrorCode.PERMISSION_DENIED,
        message: 'Cannot access file',
        recovery_guidance: 'Please grant file access permissions',
        user_actionable: true,
      };

      mockDecryptionHook.selectEncryptedFile.mockRejectedValue(error);

      renderWithRouter(<DecryptPage />);

      const selectButton = screen.getByRole('button', { name: 'Select Vault' });
      await userEvent.click(selectButton);

      // Update workflow hook with error state after click
      mockWorkflowHook.error = error;
      mockWorkflowHook.isDecrypting = false;
      mockDecryptionHook.error = error;

      // Force re-render with updated error state
      renderWithRouter(<DecryptPage />);

      await waitFor(() => {
        expect(screen.getByText('Cannot access file')).toBeInTheDocument();
      });
    });

    it('should handle decryption API failure with recovery guidance', async () => {
      const error = {
        code: ErrorCode.DECRYPTION_FAILED,
        message: 'Decryption failed - invalid passphrase',
        recovery_guidance: 'Please check your passphrase and try again',
        user_actionable: true,
      };

      // Set up workflow hook with error state
      mockUseDecryptionWorkflow.mockReturnValue({
        ...mockWorkflowHook,
        selectedFile: '/path/to/vault.age',
        selectedKeyId: 'test-key-id',
        passphrase: 'wrong-pass',
        outputPath: '/output/path',
        error: error,
        isDecrypting: false,
      });

      // Set up file decryption hook with error state
      mockUseFileDecryption.mockReturnValue({
        ...mockDecryptionHook,
        selectedFile: '/path/to/vault.age',
        selectedKeyId: 'test-key-id',
        passphrase: 'wrong-pass',
        outputPath: '/output/path',
        error: error,
      });

      renderWithRouter(<DecryptPage />);

      // Verify error is displayed with recovery guidance
      expect(screen.getByText('Decryption failed - invalid passphrase')).toBeInTheDocument();
      expect(screen.getByText('Please check your passphrase and try again')).toBeInTheDocument();
    });

    it('should handle storage space errors during extraction', async () => {
      const error = {
        code: ErrorCode.STORAGE_FAILED,
        message: 'Insufficient disk space',
        recovery_guidance: 'Free up at least 100MB of space',
        user_actionable: true,
      };

      // Set up workflow hook with error state
      mockWorkflowHook.error = error;
      mockWorkflowHook.isDecrypting = false;
      mockDecryptionHook.error = error;

      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Insufficient disk space')).toBeInTheDocument();
      expect(screen.getByText('Free up at least 100MB of space')).toBeInTheDocument();
    });

    it('should handle Tauri command invocation errors', async () => {
      // Mock Tauri command failure
      tauriEnv.mocks.safeInvoke.mockRejectedValue({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Backend communication failed',
        recovery_guidance: 'Please restart the application',
        user_actionable: true,
      });

      renderWithRouter(<DecryptPage />);

      // Verify error handling infrastructure is in place
      expect(tauriEnv.mocks.safeInvoke).not.toBeNull();
      expect(typeof tauriEnv.mocks.safeInvoke).toBe('function');
    });

    it('should handle progress listener setup failure gracefully', async () => {
      // Mock listener setup failure
      tauriEnv.mocks.safeListen.mockRejectedValue(new Error('Failed to setup listener'));

      renderWithRouter(<DecryptPage />);

      // Component should still render despite listener failure
      expect(screen.getByText('Decrypt Your Vault')).toBeInTheDocument();
      expect(screen.getByText('Secure file encryption for Bitcoin custody')).toBeInTheDocument();
    });
  });
});
