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
  default: vi.fn(({ mode, onFilesSelected, selectedFiles, onClearFiles }) => (
    <div data-testid="file-drop-zone">
      {mode && <button onClick={() => onFilesSelected(['/test/file.txt'])}>Select Files</button>}
      {selectedFiles && (
        <div>
          <span>{selectedFiles.file_count} files selected</span>
          <button onClick={onClearFiles}>Clear Files</button>
        </div>
      )}
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
  default: vi.fn(({ onEncryptMore }) => (
    <div data-testid="encryption-success">
      <span>Encryption successful!</span>
      <button onClick={onEncryptMore}>Encrypt More</button>
    </div>
  )),
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
    it('should render the page header with trust badges', () => {
      renderEncryptPage();

      expect(screen.getByText('Encrypt Your Bitcoin Vault')).toBeInTheDocument();
      expect(screen.getByText(/Transform sensitive files/)).toBeInTheDocument();
      expect(screen.getByText('Military-grade')).toBeInTheDocument();
      expect(screen.getByText('Local-only')).toBeInTheDocument();
      expect(screen.getByText('Zero network')).toBeInTheDocument();
    });

    it('should render the step indicator', () => {
      renderEncryptPage();

      expect(screen.getByText('Select Files')).toBeInTheDocument();
      expect(screen.getByText('Choose Key')).toBeInTheDocument();
      expect(screen.getByText('Set Destination')).toBeInTheDocument();
    });

    it('should render file selection mode buttons', () => {
      renderEncryptPage();

      expect(screen.getByText('Files')).toBeInTheDocument();
      expect(screen.getByText('Folder')).toBeInTheDocument();
    });

    it('should render help section', () => {
      renderEncryptPage();

      expect(screen.getByText('Quick Tips')).toBeInTheDocument();
      expect(screen.getByText(/Drag multiple files/)).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should handle file mode selection', async () => {
      renderEncryptPage();

      const filesButton = screen.getByRole('button', { name: /Files.*Select specific documents/s });
      fireEvent.click(filesButton);

      await waitFor(() => {
        expect(screen.getByTestId('file-drop-zone')).toBeInTheDocument();
      });
    });

    it('should handle folder mode selection', async () => {
      renderEncryptPage();

      const folderButton = screen.getByRole('button', { name: /Folder.*Encrypt entire folder/s });
      fireEvent.click(folderButton);

      await waitFor(() => {
        expect(screen.getByTestId('file-drop-zone')).toBeInTheDocument();
      });
    });

    it('should call selectFiles when files are selected', async () => {
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

      const filesButton = screen.getByRole('button', { name: /Files.*Select specific documents/s });
      fireEvent.click(filesButton);

      const selectButton = screen.getByText('Select Files');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(mockSelectFiles).toHaveBeenCalledWith('Files');
      });
    });

    it('should display selected files information', () => {
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: {
          paths: ['/test/file1.txt', '/test/file2.txt'],
          file_count: 2,
          total_size: 2048,
          selection_type: 'Files',
        },
      });

      renderEncryptPage();

      expect(screen.getByText('2 files selected')).toBeInTheDocument();
    });

    it('should allow changing selected files', () => {
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

  describe('Key Selection', () => {
    it('should show key selection after files are selected', () => {
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

      expect(screen.getByTestId('key-selection')).toBeInTheDocument();
      expect(screen.getByText('Choose Your Encryption Key')).toBeInTheDocument();
    });

    it('should handle key selection', async () => {
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

  describe('Output Configuration', () => {
    it('should show output configuration after key is selected', () => {
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: {
          paths: ['/test/file.txt'],
          file_count: 1,
          total_size: 1024,
          selection_type: 'Files',
        },
      });

      const { rerender } = renderEncryptPage();

      // Select a key
      const keySelect = screen.getByTestId('key-selection');
      fireEvent.change(keySelect, { target: { value: 'test-key-1' } });

      // Re-render with updated state
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: {
          paths: ['/test/file.txt'],
          file_count: 1,
          total_size: 1024,
          selection_type: 'Files',
        },
      });

      rerender(
        <BrowserRouter>
          <EncryptPage />
        </BrowserRouter>,
      );

      expect(screen.getByTestId('destination-selector')).toBeInTheDocument();
      expect(
        screen.getByText(/Output path selection is currently for preview only/),
      ).toBeInTheDocument();
    });
  });

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
        expect(mockEncryptFiles).toHaveBeenCalledWith('test-key-1', 'my-archive');
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

    it('should show success after encryption', () => {
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        success: '/output/encrypted.age',
      });

      renderEncryptPage();

      expect(screen.getByTestId('encryption-success')).toBeInTheDocument();
      expect(screen.getByText('Encryption successful!')).toBeInTheDocument();
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

    it('should clear errors', () => {
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        error: {
          code: ErrorCode.INVALID_INPUT,
          message: 'Test error',
          recovery_guidance: 'Try again',
          user_actionable: true,
        },
      });

      renderEncryptPage();

      // Assuming ErrorMessage component has a close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Validation Display', () => {
    it('should show validation checklist', () => {
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

      expect(screen.getByText(/2 files selected.*2\.00 MB/)).toBeInTheDocument();
      expect(screen.getByText(/Encryption key.*not selected/)).toBeInTheDocument();
      expect(screen.getByText('Using default output name')).toBeInTheDocument();
    });

    it('should update validation status as selections are made', () => {
      const { rerender } = renderEncryptPage();

      // Initially no files selected
      expect(screen.getByText(/0 files selected.*0 MB/)).toBeInTheDocument();

      // Update with files selected
      mockUseFileEncryption.mockReturnValue({
        ...defaultHookReturn,
        selectedFiles: {
          paths: ['/test/file.txt'],
          file_count: 1,
          total_size: 1024,
          selection_type: 'Files',
        },
      });

      rerender(
        <BrowserRouter>
          <EncryptPage />
        </BrowserRouter>,
      );

      expect(screen.getByText(/1 files selected.*0\.00 MB/)).toBeInTheDocument();
    });
  });
});
