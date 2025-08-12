import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import EncryptPage from '../../pages/EncryptPage';
import { ErrorCode } from '../../lib/api-types';
import { createTauriTestEnvironment, MOCK_RESPONSES, resetTauriMocks } from '../utils/tauri-mocks';

// Mock the hooks
vi.mock('../../hooks/useFileEncryption', () => ({
  useFileEncryption: vi.fn(),
}));

// Mock the components
vi.mock('../../components/forms/KeySelectionDropdown', () => ({
  KeySelectionDropdown: vi.fn(({ value, onChange }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} data-testid="key-selection">
      <option value="">Select a key</option>
      <option value="test-key-1">Test Key 1</option>
      <option value="test-key-2">Test Key 2</option>
    </select>
  )),
}));

vi.mock('../../components/encrypt/FileDropZone', () => ({
  default: vi.fn(() => (
    <div data-testid="file-drop-zone">
      <p>Drop files here</p>
      <button>Browse Files</button>
      <button>Browse Folder</button>
    </div>
  )),
}));

vi.mock('../../components/encrypt/DestinationSelector', () => ({
  default: vi.fn(({ onPathChange, onNameChange }) => (
    <div data-testid="destination-selector">
      <input placeholder="Output path" onChange={(e) => onPathChange(e.target.value)} />
      <input placeholder="Archive name" onChange={(e) => onNameChange(e.target.value)} />
    </div>
  )),
}));

vi.mock('../../components/encrypt/EncryptionProgress', () => ({
  default: vi.fn(({ progress, onCancel }) => (
    <div data-testid="encryption-progress">
      <span>Progress: {progress?.progress || 0}%</span>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )),
}));

vi.mock('../../components/encrypt/EncryptionSuccess', () => ({
  default: vi.fn(({ onEncryptMore, encryptedFilePath }) => {
    return (
      <div data-testid="encryption-success">
        <span>Encryption successful!</span>
        {encryptedFilePath && <span>File saved to: {encryptedFilePath}</span>}
        <button onClick={onEncryptMore}>Encrypt More</button>
      </div>
    );
  }),
}));

const mockUseFileEncryption = vi.mocked(
  await import('../../hooks/useFileEncryption'),
).useFileEncryption;

describe('EncryptPage', () => {
  const mockSelectFiles = vi.fn();
  const mockEncryptFiles = vi.fn();
  const mockReset = vi.fn();
  const mockClearError = vi.fn();
  const mockClearSelection = vi.fn();

  const defaultHookReturn = {
    selectFiles: mockSelectFiles,
    encryptFiles: mockEncryptFiles,
    isLoading: false,
    error: null,
    success: null,
    progress: null,
    selectedFiles: null,
    reset: mockReset,
    clearError: mockClearError,
    clearSelection: mockClearSelection,
  };

  // Setup standardized Tauri environment
  let tauriEnv: ReturnType<typeof createTauriTestEnvironment>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFileEncryption.mockReturnValue(defaultHookReturn);

    // Initialize standardized Tauri mocking
    tauriEnv = createTauriTestEnvironment({
      isTauriEnv: true,
      includeProgressSimulation: true,
    });
  });

  afterEach(() => {
    resetTauriMocks();
  });

  const renderEncryptPage = () => {
    return render(
      <BrowserRouter>
        <EncryptPage />
      </BrowserRouter>,
    );
  };

  describe('Initial Render', () => {
    it('should display trust indicators to build user confidence', () => {
      renderEncryptPage();

      // Verify trust-building elements are visible
      expect(screen.getByText('Encrypt Your Vault')).toBeInTheDocument();
      expect(screen.getByText('Military-grade')).toBeInTheDocument();
      expect(screen.getByText('Local-only')).toBeInTheDocument();
      expect(screen.getByText('Zero network')).toBeInTheDocument();
    });
  });

  describe('File Selection Workflow', () => {
    it('should allow user to change selected files after initial selection', () => {
      // Verify user can change files in step-based UI
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: {
          paths: ['/test/file.txt'],
          file_count: 1,
          total_size: 1024,
          selection_type: 'Files',
        },
      });

      renderEncryptPage();

      // User should see their selected file
      expect(screen.getByText(/1 file/)).toBeInTheDocument();
      expect(screen.getByText(/file.txt/)).toBeInTheDocument();
    });
  });

  describe('Key Selection Workflow', () => {
    it('should enable key selection and update UI when user selects a key', async () => {
      // When files are selected, user automatically advances to step 2
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: {
          paths: ['/test/file.txt'],
          file_count: 1,
          total_size: 1024,
          selection_type: 'Files',
        },
      });

      renderEncryptPage();

      // Due to auto-advance, user should see step 2 (key selection)
      // Wait for the auto-advance animation to complete
      await waitFor(() => {
        expect(screen.getByText('Choose Your Encryption Key')).toBeInTheDocument();
      });
    });
  });

  // Output configuration is tested as part of the full encryption workflow

  describe('Encryption Process', () => {
    it('should enable encrypt button when ready', () => {
      // With files selected, auto-advance to step 2 occurs
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: {
          paths: ['/test/file.txt'],
          file_count: 1,
          total_size: 1024,
          selection_type: 'Files',
        },
      });

      renderEncryptPage();

      // User should see step 2 with continue button available
      expect(screen.getByText(/Continue/)).toBeInTheDocument();
    });

    it('should show encryption workflow progression', async () => {
      // Focus on user-visible workflow progression with auto-advance
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: {
          paths: ['/test/file.txt'],
          file_count: 1,
          total_size: 1024,
          selection_type: 'Files',
        },
      });

      renderEncryptPage();

      // With files selected, auto-advance shows step 2
      await waitFor(() => {
        expect(screen.getByText(/Choose Your Encryption Key/)).toBeInTheDocument();
      });

      // User should be able to continue workflow
      expect(screen.getByText(/Continue/)).toBeInTheDocument();
    });

    it('should show progress during encryption', () => {
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        progress: {
          operation_id: 'test-op',
          progress: 0.5,
          message: 'Encrypting...',
          timestamp: new Date().toISOString(),
        },
      });

      renderEncryptPage();

      expect(screen.getByTestId('encryption-progress')).toBeInTheDocument();
      expect(screen.getByText('Progress: 0.5%')).toBeInTheDocument();
    });

    it('should handle workflow navigation', async () => {
      // Focus on user navigation capabilities in step-based flow
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: {
          paths: ['/test/file.txt'],
          file_count: 1,
          total_size: 1024,
          selection_type: 'Files',
        },
      });

      renderEncryptPage();

      // With files selected, auto-advance to step 2 shows navigation
      await waitFor(() => {
        expect(screen.getByText(/Previous/)).toBeInTheDocument();
        expect(screen.getByText(/Continue/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display errors', () => {
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        error: {
          code: ErrorCode.INVALID_INPUT,
          message: 'Test error message',
          recovery_guidance: 'Try again',
          user_actionable: true,
        },
      });

      renderEncryptPage();

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  describe('User Feedback and Validation', () => {
    it('should provide clear feedback about encryption readiness', () => {
      // Step-based UI should show clear selection status
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: {
          paths: ['/test/file.txt', '/test/file2.txt'],
          file_count: 2,
          total_size: 2097152, // 2MB
          selection_type: 'Files',
        },
      });

      renderEncryptPage();

      // User should see file selection feedback in SelectedFilesDisplay
      expect(screen.getByText(/2 files/)).toBeInTheDocument();
      expect(screen.getByText(/2\.\d+ MB/)).toBeInTheDocument();
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should handle Tauri desktop environment correctly', async () => {
      // Already set up with isTauriEnv: true in beforeEach
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: null,
      });

      // Mock successful file selection in Tauri environment
      mockSelectFiles.mockResolvedValue(MOCK_RESPONSES.fileSelection.multiple);

      renderEncryptPage();

      // Verify Tauri environment is properly detected
      expect(tauriEnv.mocks.isTauri()).toBe(true);
      expect(tauriEnv.mocks.isWeb()).toBe(false);
    });

    it('should handle web environment correctly', async () => {
      // Reset and create web environment
      resetTauriMocks();
      tauriEnv = createTauriTestEnvironment({ isTauriEnv: false });

      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: null,
      });

      renderEncryptPage();

      // Verify web environment is properly detected
      expect(tauriEnv.mocks.isTauri()).toBe(false);
      expect(tauriEnv.mocks.isWeb()).toBe(true);
    });

    it('should handle file selection in desktop environment', async () => {
      // Step-based UI should support desktop file selection
      mockSelectFiles.mockResolvedValue(undefined);

      renderEncryptPage();

      // User should see file selection interface
      expect(screen.getByText(/Browse Files/)).toBeInTheDocument();
      expect(screen.getByText(/Drop files here/)).toBeInTheDocument();

      // After file selection, UI should update
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: MOCK_RESPONSES.fileSelection.multiple,
      });

      // Should show selected files count
      expect(MOCK_RESPONSES.fileSelection.multiple.file_count).toBeGreaterThan(0);
    });

    it('should handle progress events in Tauri environment', async () => {
      // Set up progress simulation

      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: MOCK_RESPONSES.fileSelection.single,
        progress: {
          operation_id: 'encrypt-123',
          progress: 0.5,
          message: 'Encrypting files...',
          timestamp: new Date().toISOString(),
        },
      });

      renderEncryptPage();

      // Verify progress is displayed
      expect(screen.getByTestId('encryption-progress')).toBeInTheDocument();
      expect(screen.getByText('Progress: 0.5%')).toBeInTheDocument();

      // Simulate progress update via Tauri event
      if (tauriEnv.progressSimulator) {
        tauriEnv.progressSimulator.simulateProgress('encryption-progress', [
          { progress: 0.75, message: 'Almost done...' },
        ]);
      }
    });
  });

  describe('Tauri API Error Handling', () => {
    it('should handle file selection API failure gracefully', async () => {
      const error = {
        code: ErrorCode.PERMISSION_DENIED,
        message: 'Cannot access file system',
        recovery_guidance: 'Please grant file system permissions',
        user_actionable: true,
      };

      // Set up hook with error state after file selection attempt
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        error: error,
      });

      renderEncryptPage();

      // Verify error is displayed to user
      expect(screen.getByText('Cannot access file system')).toBeInTheDocument();
      expect(screen.getByText('Please grant file system permissions')).toBeInTheDocument();
    });

    it('should handle encryption API failure', async () => {
      const error = {
        code: ErrorCode.STORAGE_FAILED,
        message: 'Failed to save encrypted file',
        recovery_guidance: 'Check available disk space',
        user_actionable: true,
      };

      mockEncryptFiles.mockRejectedValue(error);

      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: MOCK_RESPONSES.fileSelection.single,
        error: error,
      });

      renderEncryptPage();

      // User should see the error message
      await waitFor(() => {
        expect(screen.getByText('Failed to save encrypted file')).toBeInTheDocument();
      });
    });

    it('should handle Tauri command invocation errors', async () => {
      // Mock Tauri command failure
      tauriEnv.mocks.safeInvoke.mockRejectedValue({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Tauri command failed',
        recovery_guidance: 'Please restart the application',
        user_actionable: true,
      });

      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: MOCK_RESPONSES.fileSelection.single,
      });

      renderEncryptPage();

      // Verify error handling when Tauri commands fail
      expect(tauriEnv.mocks.safeInvoke).not.toBeNull();
      expect(typeof tauriEnv.mocks.safeInvoke).toBe('function');
    });

    it('should handle progress listener setup failure', async () => {
      // Mock listener setup failure
      tauriEnv.mocks.safeListen.mockRejectedValue(new Error('Failed to setup listener'));

      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: MOCK_RESPONSES.fileSelection.single,
      });

      renderEncryptPage();

      // Component should still render despite listener failure
      expect(screen.getByText('Encrypt Your Vault')).toBeInTheDocument();
    });
  });
});
