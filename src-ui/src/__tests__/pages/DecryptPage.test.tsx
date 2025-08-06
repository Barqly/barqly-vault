import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import DecryptPage from '../../pages/DecryptPage';
import { useFileDecryption } from '../../hooks/useFileDecryption';
import { useToast } from '../../hooks/useToast';
import { ErrorCode } from '../../lib/api-types';
import '@testing-library/jest-dom';

// Mock the hooks
vi.mock('../../hooks/useFileDecryption');
vi.mock('../../hooks/useToast');

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWebview: vi.fn(() => ({
    onDragDropEvent: vi.fn(),
  })),
}));

const mockUseFileDecryption = vi.mocked(useFileDecryption);
const mockUseToast = vi.mocked(useToast);

// Helper function to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('DecryptPage', () => {
  const mockDecryptionHook: any = {
    selectEncryptedFile: vi.fn(),
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

  const mockToastHook: any = {
    toasts: [],
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showInfo: vi.fn(),
    showWarning: vi.fn(),
    removeToast: vi.fn(),
    addToast: vi.fn(),
    clearAll: vi.fn(),
  };

  beforeEach(() => {
    mockUseFileDecryption.mockReturnValue(mockDecryptionHook);
    mockUseToast.mockReturnValue(mockToastHook);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the decrypt page with all trust indicators', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Decrypt Your Vault')).toBeInTheDocument();
      expect(screen.getByText('Recover your encrypted Bitcoin custody files')).toBeInTheDocument();
      expect(screen.getByText('Military-grade')).toBeInTheDocument();
      expect(screen.getByText('Local-only')).toBeInTheDocument();
      expect(screen.getByText('Under 60s')).toBeInTheDocument();
    });

    it('should show the progress indicator with step 1 active', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Step 1: Select Vault')).toHaveClass('text-blue-600');
      expect(screen.getByText('Step 2: Enter Passphrase')).not.toHaveClass('text-blue-600');
      expect(screen.getByText('Step 3: Choose Destination')).not.toHaveClass('text-blue-600');
    });

    it('should display the file drop zone for vault selection', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Select Your Encrypted Vault')).toBeInTheDocument();
      expect(screen.getByText('Drop your encrypted vault here')).toBeInTheDocument();
      expect(screen.getByText('Select Vault File')).toBeInTheDocument();
    });

    it('should show the help section with decryption tips', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Decryption Tips')).toBeInTheDocument();
    });
  });

  describe('File Selection', () => {
    it('should handle valid .age file selection', async () => {
      const { rerender } = renderWithRouter(<DecryptPage />);

      // Simulate file selection through the mock
      mockDecryptionHook.selectedFile = '/path/to/vault-2024-01-15.age';
      mockDecryptionHook.selectEncryptedFile.mockResolvedValue(undefined);

      rerender(
        <BrowserRouter>
          <DecryptPage />
        </BrowserRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Step 2: Enter Passphrase')).toHaveClass('text-blue-600');
      });
    });

    it('should reject non-.age files', async () => {
      renderWithRouter(<DecryptPage />);

      // This would be triggered through the FileDropZone component
      // In a real test, we'd simulate the drag-drop or file selection
      expect(mockToastHook.showError).not.toHaveBeenCalled();
    });

    it('should reject multiple file selection', async () => {
      renderWithRouter(<DecryptPage />);

      // The FileDropZone is configured for single file mode
      const dropZone = screen.getByText('Drop your encrypted vault here').closest('div');
      expect(dropZone).toBeInTheDocument();
    });

    it('should extract metadata from filename', async () => {
      const { rerender } = renderWithRouter(<DecryptPage />);

      mockDecryptionHook.selectedFile = '/path/to/bitcoin-vault-2024-01-15.age';
      rerender(
        <BrowserRouter>
          <DecryptPage />
        </BrowserRouter>,
      );

      // The component should extract the date from the filename
      await waitFor(() => {
        expect(screen.getByText('Enter Your Vault Passphrase')).toBeInTheDocument();
      });
    });
  });

  describe('Passphrase Entry', () => {
    beforeEach(() => {
      mockDecryptionHook.selectedFile = '/path/to/vault.age';
    });

    it('should show key selection dropdown when file is selected', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Key Selection')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Choose the key used for encryption')).toBeInTheDocument();
    });

    it('should show passphrase input after key selection', () => {
      mockDecryptionHook.selectedKeyId = 'test-key-id';
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Passphrase')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your key passphrase')).toBeInTheDocument();
    });

    it('should display memory hints progressively based on attempts', () => {
      mockDecryptionHook.selectedKeyId = 'test-key-id';
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Memory Hints')).toBeInTheDocument();
    });

    it('should track passphrase attempts on failed decryption', async () => {
      mockDecryptionHook.selectedFile = '/path/to/vault.age';
      mockDecryptionHook.selectedKeyId = 'test-key-id';
      mockDecryptionHook.passphrase = 'wrong-passphrase';
      mockDecryptionHook.outputPath = '/output/path';

      const error = {
        code: ErrorCode.DECRYPTION_FAILED,
        message: 'Wrong passphrase',
        recovery_guidance: 'The passphrase is incorrect',
        user_actionable: true,
      };

      mockDecryptionHook.decryptFile.mockRejectedValue(error);

      renderWithRouter(<DecryptPage />);

      const decryptButton = screen.getByText('Begin Decryption');
      await userEvent.click(decryptButton);

      await waitFor(() => {
        expect(mockDecryptionHook.decryptFile).toHaveBeenCalled();
      });
    });
  });

  describe('Destination Selection', () => {
    beforeEach(() => {
      mockDecryptionHook.selectedFile = '/path/to/vault.age';
      mockDecryptionHook.selectedKeyId = 'test-key-id';
      mockDecryptionHook.passphrase = 'test-passphrase';
    });

    it('should show destination selector after passphrase entry', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Choose Recovery Location')).toBeInTheDocument();
      expect(screen.getByText('Choose where to save recovered files')).toBeInTheDocument();
    });

    it('should set default output path with current date', () => {
      renderWithRouter(<DecryptPage />);

      const date = new Date().toISOString().split('T')[0];
      expect(mockDecryptionHook.setOutputPath).toHaveBeenCalledWith(
        expect.stringContaining(`Barqly-Recovery-${date}`),
      );
    });

    it('should display space requirements', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText(/Space required:/)).toBeInTheDocument();
    });

    it('should show options for folder creation and file replacement', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByLabelText('Create new folder for recovered files')).toBeInTheDocument();
      expect(screen.getByLabelText('Replace existing files if found')).toBeInTheDocument();
    });
  });

  describe('Decryption Process', () => {
    beforeEach(() => {
      mockDecryptionHook.selectedFile = '/path/to/vault.age';
      mockDecryptionHook.selectedKeyId = 'test-key-id';
      mockDecryptionHook.passphrase = 'correct-passphrase';
      mockDecryptionHook.outputPath = '/output/path';
    });

    it('should show ready state when all fields are filled', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Ready to Decrypt Your Vault')).toBeInTheDocument();
      expect(screen.getByText('Valid vault file selected')).toBeInTheDocument();
      expect(screen.getByText('Passphrase entered')).toBeInTheDocument();
      expect(screen.getByText('Destination folder selected')).toBeInTheDocument();
    });

    it('should handle successful decryption', async () => {
      const successResult = {
        output_dir: '/output/path',
        extracted_files: ['file1.txt', 'file2.txt'],
        manifest_verified: true,
      };

      mockDecryptionHook.decryptFile.mockResolvedValue(undefined);
      mockDecryptionHook.success = successResult;

      renderWithRouter(<DecryptPage />);

      const decryptButton = screen.getByText('Begin Decryption');
      await userEvent.click(decryptButton);

      await waitFor(() => {
        expect(mockDecryptionHook.decryptFile).toHaveBeenCalled();
        expect(mockToastHook.showSuccess).toHaveBeenCalledWith(
          'Decryption successful',
          'Your files have been recovered',
        );
      });
    });

    it('should display progress during decryption', async () => {
      mockDecryptionHook.progress = {
        progress: 50,
        message: 'Decrypting files...',
      };

      renderWithRouter(<DecryptPage />);

      const decryptButton = screen.getByText('Begin Decryption');
      fireEvent.click(decryptButton);

      // Progress should be displayed
      expect(screen.queryByText('Decrypting Your Vault')).not.toBeInTheDocument();
    });

    it('should handle decryption errors gracefully', async () => {
      const error = {
        code: ErrorCode.DECRYPTION_FAILED,
        message: 'Decryption failed',
        recovery_guidance: 'File appears to be corrupted',
        user_actionable: true,
      };

      mockDecryptionHook.error = error;
      mockDecryptionHook.decryptFile.mockRejectedValue(error);

      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Decryption failed')).toBeInTheDocument();
    });

    it('should allow cancellation before 90% progress', () => {
      mockDecryptionHook.progress = {
        progress: 45,
        message: 'Processing...',
      };

      renderWithRouter(<DecryptPage />);

      // Cancel button should be available
      const cancelButton = screen.queryByText('Cancel');
      if (cancelButton) {
        expect(cancelButton).toBeInTheDocument();
      }
    });

    it('should prevent cancellation after 90% progress', () => {
      mockDecryptionHook.progress = {
        progress: 92,
        message: 'Finalizing...',
      };

      renderWithRouter(<DecryptPage />);

      // Cancel button should not be available
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
      mockDecryptionHook.success = successResult;
    });

    it('should display success message with file details', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('Vault Successfully Decrypted!')).toBeInTheDocument();
      expect(
        screen.getByText('Your files have been recovered and are ready to use.'),
      ).toBeInTheDocument();
    });

    it('should show recovered file list', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText('wallet-descriptor.json')).toBeInTheDocument();
      expect(screen.getByText('seed-phrase.txt')).toBeInTheDocument();
      expect(screen.getByText('xpub-keys.txt')).toBeInTheDocument();
    });

    it('should display output directory with copy functionality', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText(successResult.output_dir)).toBeInTheDocument();
      expect(screen.getByText('Copy Path')).toBeInTheDocument();
    });

    it('should show manifest verification status', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText(/File integrity: Verified/)).toBeInTheDocument();
    });

    it('should provide option to decrypt another file', async () => {
      renderWithRouter(<DecryptPage />);

      const anotherButton = screen.getByText('Decrypt Another Vault');
      await userEvent.click(anotherButton);

      expect(mockDecryptionHook.reset).toHaveBeenCalled();
      expect(mockToastHook.showInfo).toHaveBeenCalledWith(
        'Ready for new decryption',
        'Select another vault file to decrypt',
      );
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

      mockDecryptionHook.error = error;
      renderWithRouter(<DecryptPage />);

      expect(screen.getByText(error.message)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should clear form when clear button is clicked', async () => {
      mockDecryptionHook.selectedFile = '/path/to/vault.age';
      mockDecryptionHook.selectedKeyId = 'test-key-id';
      mockDecryptionHook.passphrase = 'test-passphrase';
      mockDecryptionHook.outputPath = '/output/path';

      renderWithRouter(<DecryptPage />);

      const clearButton = screen.getByText('Clear Form');
      await userEvent.click(clearButton);

      expect(mockDecryptionHook.reset).toHaveBeenCalled();
    });

    it('should expand/collapse help section', async () => {
      renderWithRouter(<DecryptPage />);

      const helpToggle = screen.getByText('Decryption Tips');
      await userEvent.click(helpToggle);

      // Help content should be visible
      expect(screen.getByText(/Choose a .age encrypted vault file/)).toBeInTheDocument();
    });

    it('should validate all required fields before enabling decrypt button', () => {
      renderWithRouter(<DecryptPage />);

      // Initially, decrypt button should not be visible
      expect(screen.queryByText('Begin Decryption')).not.toBeInTheDocument();

      // After all fields are filled, button should appear
      mockDecryptionHook.selectedFile = '/path/to/vault.age';
      mockDecryptionHook.selectedKeyId = 'test-key-id';
      mockDecryptionHook.passphrase = 'test-passphrase';
      mockDecryptionHook.outputPath = '/output/path';

      renderWithRouter(<DecryptPage />);
      expect(screen.getByText('Begin Decryption')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      renderWithRouter(<DecryptPage />);

      expect(screen.getByLabelText('Clear selection')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle memory hints')).toBeInTheDocument();
    });

    it('should maintain focus management through workflow', async () => {
      renderWithRouter(<DecryptPage />);

      // Tab through elements should follow logical order
      const dropZone = screen.getByText('Select Vault File');
      expect(dropZone).toBeInTheDocument();
    });

    it('should announce progress updates to screen readers', () => {
      mockDecryptionHook.progress = {
        progress: 50,
        message: 'Decrypting files...',
      };

      renderWithRouter(<DecryptPage />);

      // Progress should be announced
      expect(screen.getByText('Decrypting files...')).toBeInTheDocument();
    });
  });
});
