import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SetupPage from '../../pages/SetupPage';
import { GenerateKeyResponse, CommandError, ErrorCode } from '../../lib/api-types';

// Mock the hooks and safe wrappers
vi.mock('../../hooks/useKeyGeneration');
vi.mock('../../lib/tauri-safe');

// Import mocked modules
import { useKeyGeneration } from '../../hooks/useKeyGeneration';
import { safeListen } from '../../lib/tauri-safe';

// Create mock implementations
const mockUseKeyGeneration = vi.mocked(useKeyGeneration);
const mockSafeListen = vi.mocked(safeListen);

describe('SetupPage', () => {
  const user = userEvent.setup();

  // Default mock implementation for useKeyGeneration
  const defaultHookReturn = {
    generateKey: vi.fn(),
    isLoading: false,
    error: null,
    success: null,
    progress: null,
    reset: vi.fn(),
    clearError: vi.fn(),
    setLabel: vi.fn(),
    setPassphrase: vi.fn(),
    label: '',
    passphrase: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocks to default state
    mockUseKeyGeneration.mockReturnValue(defaultHookReturn);
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to render component with router
  const renderWithRouter = (component: React.JSX.Element) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  describe('Component Rendering', () => {
    it('should render the setup form when not loading and no success', () => {
      renderWithRouter(<SetupPage />);

      expect(screen.getByRole('textbox', { name: /key label/i })).toBeInTheDocument();
      expect(screen.getByText('Create Your Security Identity')).toBeInTheDocument();
      expect(screen.getByLabelText(/key label/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^passphrase/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm passphrase/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create key/i })).toBeInTheDocument();
    });

    it('should not render form when loading', () => {
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
        progress: {
          operation_id: 'test-op-123',
          progress: 0.5,
          message: 'Generating...',
          timestamp: new Date().toISOString(),
        },
      });

      renderWithRouter(<SetupPage />);

      expect(screen.queryByRole('textbox', { name: /key label/i })).not.toBeInTheDocument();
      expect(screen.getByText('Generating strong encryption keys...')).toBeInTheDocument();
    });

    it('should not render form when success is shown', () => {
      const mockSuccess: GenerateKeyResponse = {
        key_id: 'test-key',
        public_key: 'age1testkey123',
        saved_path: '/path/to/key',
      };

      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        success: mockSuccess,
      });

      renderWithRouter(<SetupPage />);

      expect(screen.queryByRole('textbox', { name: /key label/i })).not.toBeInTheDocument();
      expect(screen.getByText('Key Generated Successfully!')).toBeInTheDocument();
    });
  });

  describe('Form Submission - Critical Regression Prevention', () => {
    it('should handle form submission via Enter key press', async () => {
      const mockGenerateKey = vi.fn().mockResolvedValue(undefined);
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        generateKey: mockGenerateKey,
      });

      renderWithRouter(<SetupPage />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      const confirmPassphraseInput = screen.getByLabelText(/confirm passphrase/i);

      // Fill form with valid data
      await user.type(keyLabelInput, 'Test Key');
      await user.type(passphraseInput, 'StrongPassword123!');
      await user.type(confirmPassphraseInput, 'StrongPassword123!');

      // Submit form via Enter key
      await user.keyboard('{Enter}');

      expect(mockGenerateKey).toHaveBeenCalledTimes(1);
    });

    it('should handle form submission via button click', async () => {
      const mockGenerateKey = vi.fn().mockResolvedValue(undefined);
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        generateKey: mockGenerateKey,
      });

      renderWithRouter(<SetupPage />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      const confirmPassphraseInput = screen.getByLabelText(/confirm passphrase/i);
      const submitButton = screen.getByRole('button', { name: /create key/i });

      // Fill form with valid data
      await user.type(keyLabelInput, 'Test Key');
      await user.type(passphraseInput, 'StrongPassword123!');
      await user.type(confirmPassphraseInput, 'StrongPassword123!');

      // Submit form via button click
      await user.click(submitButton);

      expect(mockGenerateKey).toHaveBeenCalledTimes(1);
    });

    it('should prevent form submission when form is invalid', async () => {
      const mockGenerateKey = vi.fn();
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        generateKey: mockGenerateKey,
      });

      renderWithRouter(<SetupPage />);

      const submitButton = screen.getByRole('button', { name: /create key/i });

      // Try to submit without filling form
      await user.click(submitButton);

      expect(mockGenerateKey).not.toHaveBeenCalled();
      expect(submitButton).toBeDisabled();
    });

    it('should validate passphrase confirmation matches', async () => {
      const mockGenerateKey = vi.fn();
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        generateKey: mockGenerateKey,
      });

      renderWithRouter(<SetupPage />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      const confirmPassphraseInput = screen.getByLabelText(/confirm passphrase/i);
      const submitButton = screen.getByRole('button', { name: /create key/i });

      // Fill form with mismatched passphrases
      await user.type(keyLabelInput, 'Test Key');
      await user.type(passphraseInput, 'StrongPassword123!');
      await user.type(confirmPassphraseInput, 'DifferentPassword123!');

      expect(submitButton).toBeDisabled();

      // Try to submit
      await user.click(submitButton);
      expect(mockGenerateKey).not.toHaveBeenCalled();
    });
  });

  describe('State Synchronization - Regression Prevention', () => {
    it('should sync component state with hook state for label', async () => {
      const mockSetLabel = vi.fn();
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        setLabel: mockSetLabel,
      });

      renderWithRouter(<SetupPage />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      await user.type(keyLabelInput, 'Test Key');

      // Should call hook's setLabel on every change
      expect(mockSetLabel).toHaveBeenCalledWith('T');
      expect(mockSetLabel).toHaveBeenCalledWith('Test');
      expect(mockSetLabel).toHaveBeenCalledWith('Test Key');
    });

    it('should sync component state with hook state for passphrase', async () => {
      const mockSetPassphrase = vi.fn();
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        setPassphrase: mockSetPassphrase,
      });

      renderWithRouter(<SetupPage />);

      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      await user.type(passphraseInput, 'Test');

      // Should call hook's setPassphrase on every change
      expect(mockSetPassphrase).toHaveBeenCalledWith('T');
      expect(mockSetPassphrase).toHaveBeenCalledWith('Test');
    });

    it('should call hook setLabel and setPassphrase before generateKey', async () => {
      const mockSetLabel = vi.fn();
      const mockSetPassphrase = vi.fn();
      const mockGenerateKey = vi.fn().mockResolvedValue(undefined);

      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        setLabel: mockSetLabel,
        setPassphrase: mockSetPassphrase,
        generateKey: mockGenerateKey,
      });

      renderWithRouter(<SetupPage />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      const confirmPassphraseInput = screen.getByLabelText(/confirm passphrase/i);

      // Fill form
      await user.type(keyLabelInput, 'Test Key');
      await user.type(passphraseInput, 'StrongPassword123!');
      await user.type(confirmPassphraseInput, 'StrongPassword123!');

      // Submit form
      await user.keyboard('{Enter}');

      // Verify the final calls before generateKey
      expect(mockSetLabel).toHaveBeenLastCalledWith('Test Key');
      expect(mockSetPassphrase).toHaveBeenLastCalledWith('StrongPassword123!');
      expect(mockGenerateKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when hook returns error', () => {
      const mockError: CommandError = {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Key generation failed',
        recovery_guidance: 'Please try again',
        user_actionable: true,
      };

      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        error: mockError,
      });

      renderWithRouter(<SetupPage />);

      expect(screen.getByText('Key generation failed')).toBeInTheDocument();
      expect(screen.getByText('Please try again')).toBeInTheDocument();
    });

    it('should handle generateKey throwing error', async () => {
      const mockGenerateKey = vi.fn().mockRejectedValue(new Error('Network error'));
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        generateKey: mockGenerateKey,
      });

      // Mock console.error to prevent test pollution
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithRouter(<SetupPage />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      const confirmPassphraseInput = screen.getByLabelText(/confirm passphrase/i);

      await user.type(keyLabelInput, 'Test Key');
      await user.type(passphraseInput, 'StrongPassword123!');
      await user.type(confirmPassphraseInput, 'StrongPassword123!');

      await user.keyboard('{Enter}');

      expect(mockGenerateKey).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [SetupPage] Key generation error caught'),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Success State', () => {
    it('should display success message and public key', () => {
      const mockSuccess: GenerateKeyResponse = {
        key_id: 'test-key-123',
        public_key: 'age1testkey123456789',
        saved_path: '/path/to/key',
      };

      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        success: mockSuccess,
      });

      renderWithRouter(<SetupPage />);

      expect(screen.getByText('Key Generated Successfully!')).toBeInTheDocument();
      expect(screen.getByText('age1testkey123456789')).toBeInTheDocument();
      expect(screen.getByText(/your public key/i)).toBeInTheDocument();
    });

    it('should handle success reset via close button', async () => {
      const mockReset = vi.fn();
      const mockSuccess: GenerateKeyResponse = {
        key_id: 'test-key-123',
        public_key: 'age1testkey123456789',
        saved_path: '/path/to/key',
      };

      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        success: mockSuccess,
        reset: mockReset,
      });

      renderWithRouter(<SetupPage />);

      const closeButton = screen.getByTestId('close-button');
      await user.click(closeButton);

      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Progress Display', () => {
    it('should display progress bar and context when progress is available', () => {
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        progress: {
          operation_id: 'test-op-456',
          progress: 0.75,
          message: 'Generating keypair...',
          timestamp: new Date().toISOString(),
        },
      });

      renderWithRouter(<SetupPage />);

      expect(screen.getByText('Generating strong encryption keys...')).toBeInTheDocument();
      expect(screen.getByText('Generating keypair...')).toBeInTheDocument();
    });
  });

  describe('Form Reset and Cleanup', () => {
    it('should handle form reset via Clear button', async () => {
      const mockReset = vi.fn();
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        reset: mockReset,
      });

      renderWithRouter(<SetupPage />);

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('should handle Escape key for form reset', async () => {
      const mockReset = vi.fn();
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        reset: mockReset,
      });

      renderWithRouter(<SetupPage />);

      await user.keyboard('{Escape}');

      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('should not reset on Escape when loading', async () => {
      const mockReset = vi.fn();
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        isLoading: true,
        reset: mockReset,
      });

      renderWithRouter(<SetupPage />);

      await user.keyboard('{Escape}');

      expect(mockReset).not.toHaveBeenCalled();
    });

    it('should not reset on Escape when success is shown', async () => {
      const mockReset = vi.fn();
      const mockSuccess: GenerateKeyResponse = {
        key_id: 'test-key-123',
        public_key: 'age1testkey123456789',
        saved_path: '/path/to/key',
      };

      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        success: mockSuccess,
        reset: mockReset,
      });

      renderWithRouter(<SetupPage />);

      await user.keyboard('{Escape}');

      expect(mockReset).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility and Focus Management', () => {
    it('should set focus on success message when key is generated', () => {
      const mockSuccess: GenerateKeyResponse = {
        key_id: 'test-key-123',
        public_key: 'age1testkey123456789',
        saved_path: '/path/to/key',
      };

      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        success: mockSuccess,
      });

      renderWithRouter(<SetupPage />);

      const successMessage = screen.getByLabelText('Key generation success notification');
      expect(successMessage).toHaveAttribute('tabIndex', '-1');
    });
  });
});
