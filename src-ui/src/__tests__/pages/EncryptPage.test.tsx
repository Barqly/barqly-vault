import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import EncryptPage from '../../pages/EncryptPage';
import { ErrorCode } from '../../lib/api-types';

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
      <p>Drop files or folders here to encrypt</p>
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFileEncryption.mockReturnValue(defaultHookReturn);
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
      expect(screen.getByText('Encrypt Your Bitcoin Vault')).toBeInTheDocument();
      expect(screen.getByText('Military-grade')).toBeInTheDocument();
      expect(screen.getByText('Local-only')).toBeInTheDocument();
      expect(screen.getByText('Zero network')).toBeInTheDocument();
    });
  });

  describe('File Selection Workflow', () => {
    it('should allow user to change selected files after initial selection', () => {
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

      const changeButton = screen.getByRole('button', { name: 'Change' });
      fireEvent.click(changeButton);

      expect(mockClearSelection).toHaveBeenCalled();
    });
  });

  describe('Key Selection Workflow', () => {
    it('should enable key selection and update UI when user selects a key', async () => {
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

      const keySelect = screen.getByTestId('key-selection');
      fireEvent.change(keySelect, { target: { value: 'test-key-1' } });

      await waitFor(() => {
        expect(keySelect).toHaveValue('test-key-1');
      });
    });
  });

  // Output configuration is tested as part of the full encryption workflow

  describe('Encryption Process', () => {
    it('should enable encrypt button when ready', () => {
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

      // Select a key
      const keySelect = screen.getByTestId('key-selection');
      fireEvent.change(keySelect, { target: { value: 'test-key-1' } });

      const encryptButton = screen.getByRole('button', { name: /Create Encrypted Vault/i });
      expect(encryptButton).not.toBeDisabled();
    });

    it('should call encryptFiles with correct parameters', async () => {
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

      // Select a key
      const keySelect = screen.getByTestId('key-selection');
      fireEvent.change(keySelect, { target: { value: 'test-key-1' } });

      // Set archive name
      const archiveInput = screen.getByPlaceholderText('Archive name');
      fireEvent.change(archiveInput, { target: { value: 'my-archive' } });

      // Click encrypt
      const encryptButton = screen.getByRole('button', { name: /Create Encrypted Vault/i });
      fireEvent.click(encryptButton);

      await waitFor(() => {
        expect(mockEncryptFiles).toHaveBeenCalledWith('test-key-1', 'my-archive', undefined);
      });
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

    it('should handle reset', () => {
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

      const resetButton = screen.getByRole('button', { name: 'Reset' });
      fireEvent.click(resetButton);

      expect(mockReset).toHaveBeenCalled();
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
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: {
          paths: ['/test/file.txt'],
          file_count: 2,
          total_size: 2097152, // 2MB
          selection_type: 'Files',
        },
      });

      renderEncryptPage();

      // User should see file selection status and what's missing
      expect(screen.getByText(/2 files selected.*2\.00 MB/)).toBeInTheDocument();
      expect(screen.getByText(/Encryption key.*not selected/)).toBeInTheDocument();
    });
  });
});
