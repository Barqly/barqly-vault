/**
 * Regression tests for critical form submission and Tauri API integration issues
 *
 * These tests specifically prevent regressions where:
 * 1. Form submission worked but Tauri API invocation failed
 * 2. Enter key and button click submission both broke
 * 3. "Cannot read properties of undefined (reading 'invoke')" errors occurred
 * 4. Environment detection failures caused undefined API access
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SetupPage from '../../pages/SetupPage';
import { VaultProvider } from '../../contexts/VaultContext';
import { useKeyGeneration } from '../../hooks/useKeyGeneration';
import { safeListen } from '../../lib/tauri-safe';
import { isTauri } from '../../lib/environment/platform';
import { CommandError, ErrorCode } from '../../lib/api-types';

// Mock all dependencies
vi.mock('../../hooks/useKeyGeneration');
vi.mock('../../lib/tauri-safe');
vi.mock('../../lib/environment/platform');

const mockUseKeyGeneration = vi.mocked(useKeyGeneration);
const mockSafeListen = vi.mocked(safeListen);
const mockIsTauri = vi.mocked(isTauri);

describe.skip('Regression: Form Submission + Tauri API Integration (OLD - needs rewrite for vault-centric UI)', () => {
  const user = userEvent.setup();

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
    mockUseKeyGeneration.mockReturnValue(defaultHookReturn);
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
    mockIsTauri.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to render component with router and vault provider
  const renderWithRouter = (component: React.JSX.Element) => {
    return render(
      <BrowserRouter>
        <VaultProvider>{component}</VaultProvider>
      </BrowserRouter>,
    );
  };

  describe('REGRESSION: Form Submission Works But API Fails', () => {
    it('should prevent "Cannot read properties of undefined (reading \'invoke\')" in desktop environment', async () => {
      // Mock console.error to prevent test output noise
      const originalConsoleError = console.error;
      console.error = vi.fn();

      try {
        // Mock the exact scenario where form submission works but Tauri API is undefined
        const mockGenerateKey = vi.fn().mockImplementation(async () => {
          // Simulate the original error condition
          const error = new TypeError("Cannot read properties of undefined (reading 'invoke')");
          throw error;
        });

        mockUseKeyGeneration.mockReturnValue({
          ...defaultHookReturn,
          generateKey: mockGenerateKey,
        });

        renderWithRouter(<SetupPage />);

        // Fill out form completely
        const keyLabelInput = screen.getByLabelText(/key label/i);
        const passphraseInput = screen.getByLabelText(/^passphrase/i);
        const confirmPassphraseInput = screen.getByLabelText(/confirm passphrase/i);

        await user.type(keyLabelInput, 'Test Key');
        await user.type(passphraseInput, 'StrongPassword123!');
        await user.type(confirmPassphraseInput, 'StrongPassword123!');

        // Form should be valid and submittable
        const submitButton = screen.getByRole('button', { name: /^create key$/i });
        expect(submitButton).not.toBeDisabled();

        // Submit via Enter key (original regression scenario)
        await user.keyboard('{Enter}');

        // Form submission should work (generateKey should be called)
        expect(mockGenerateKey).toHaveBeenCalledTimes(1);

        // But the API error should be handled gracefully
        await waitFor(() => {
          // The component should handle the error gracefully without crashing
          // Check that the form is still present (by checking for key elements)
          expect(screen.getByLabelText(/key label/i)).toBeInTheDocument();
          expect(screen.getByRole('button', { name: /^create key$/i })).toBeInTheDocument();
        });
      } finally {
        // Restore console.error
        console.error = originalConsoleError;
      }
    });

    it('should prevent API failure when form submission via button click works', async () => {
      // Mock console.error to prevent test output noise
      const originalConsoleError = console.error;
      console.error = vi.fn();

      try {
        // Test the button click variant of the regression
        const mockGenerateKey = vi
          .fn()
          .mockRejectedValue(new Error('Tauri invoke function not available'));

        mockUseKeyGeneration.mockReturnValue({
          ...defaultHookReturn,
          generateKey: mockGenerateKey,
        });

        renderWithRouter(<SetupPage />);

        const keyLabelInput = screen.getByLabelText(/key label/i);
        const passphraseInput = screen.getByLabelText(/^passphrase/i);
        const confirmPassphraseInput = screen.getByLabelText(/confirm passphrase/i);
        const submitButton = screen.getByRole('button', { name: /^create key$/i });

        await user.type(keyLabelInput, 'Test Key');
        await user.type(passphraseInput, 'StrongPassword123!');
        await user.type(confirmPassphraseInput, 'StrongPassword123!');

        // Submit via button click
        await user.click(submitButton);

        expect(mockGenerateKey).toHaveBeenCalledTimes(1);

        // Component should remain functional after API error
        await waitFor(() => {
          expect(screen.getByRole('button', { name: /^create key$/i })).toBeInTheDocument();
        });
      } finally {
        // Restore console.error
        console.error = originalConsoleError;
      }
    });

    it('should handle environment mismatch where form works but Tauri APIs fail', async () => {
      // Simulate environment where form renders (detected as Tauri initially)
      // but API calls fail due to environment detection changing
      mockIsTauri.mockReturnValue(true);

      const environmentChangeError: CommandError = {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'This feature requires the desktop application',
        recovery_guidance: 'Please use the desktop version of Barqly Vault to access this feature',
        user_actionable: true,
      };

      const mockGenerateKey = vi.fn().mockRejectedValue(environmentChangeError);

      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        generateKey: mockGenerateKey,
        error: environmentChangeError,
      });

      renderWithRouter(<SetupPage />);

      // Form should render normally (check for key elements)
      expect(screen.getByLabelText(/key label/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^create key$/i })).toBeInTheDocument();

      // Error should be displayed
      expect(screen.getByText('This feature requires the desktop application')).toBeInTheDocument();
      expect(
        screen.getByText('Please use the desktop version of Barqly Vault to access this feature'),
      ).toBeInTheDocument();

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      const confirmPassphraseInput = screen.getByLabelText(/confirm passphrase/i);

      await user.type(keyLabelInput, 'Test Key');
      await user.type(passphraseInput, 'StrongPassword123!');
      await user.type(confirmPassphraseInput, 'StrongPassword123!');

      // Form submission should still work (call the hook)
      await user.keyboard('{Enter}');
      expect(mockGenerateKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('REGRESSION: State Synchronization Between Form and Hook', () => {
    it('should ensure form state is properly synced with hook state before API calls', async () => {
      // This test prevents regressions where form state and hook state get out of sync
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

      // Type into form fields
      await user.type(keyLabelInput, 'My Test Key');
      await user.type(passphraseInput, 'SecurePassword123!');
      await user.type(confirmPassphraseInput, 'SecurePassword123!');

      // Verify sync happened during typing
      expect(mockSetLabel).toHaveBeenCalledWith('My Test Key');
      expect(mockSetPassphrase).toHaveBeenCalledWith('SecurePassword123!');

      // Submit form
      await user.keyboard('{Enter}');

      // Verify final sync before generateKey call
      expect(mockSetLabel).toHaveBeenLastCalledWith('My Test Key');
      expect(mockSetPassphrase).toHaveBeenLastCalledWith('SecurePassword123!');
      expect(mockGenerateKey).toHaveBeenCalledTimes(1);
    });

    it('should handle form validation preventing API calls when state is invalid', async () => {
      // Prevent regression where invalid form state still triggers API calls
      const mockGenerateKey = vi.fn();

      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        generateKey: mockGenerateKey,
      });

      renderWithRouter(<SetupPage />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      const confirmPassphraseInput = screen.getByLabelText(/confirm passphrase/i);

      // Fill form with mismatched passphrases
      await user.type(keyLabelInput, 'Test Key');
      await user.type(passphraseInput, 'Password123!');
      await user.type(confirmPassphraseInput, 'DifferentPassword123!');

      // Submit form (should be prevented by validation)
      await user.keyboard('{Enter}');

      // API should not be called with invalid state
      expect(mockGenerateKey).not.toHaveBeenCalled();

      // Button should be disabled
      const submitButton = screen.getByRole('button', { name: /^create key$/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('REGRESSION: Web Environment Compatibility', () => {
    it('should render form correctly in web environment without breaking', () => {
      // Test that form renders even when Tauri is not available
      mockIsTauri.mockReturnValue(false);

      renderWithRouter(<SetupPage />);

      // Form should still render (verify form elements are present)
      expect(screen.getByLabelText(/key label/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^passphrase/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm passphrase/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^create key$/i })).toBeInTheDocument();
    });

    it('should handle web environment API errors gracefully during form submission', async () => {
      mockIsTauri.mockReturnValue(false);

      const webError: CommandError = {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'This feature requires the desktop application',
        recovery_guidance: 'Please use the desktop version of Barqly Vault to access this feature',
        user_actionable: true,
      };

      const mockGenerateKey = vi.fn().mockRejectedValue(webError);
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        generateKey: mockGenerateKey,
        error: webError,
      });

      renderWithRouter(<SetupPage />);

      // Should show appropriate error message
      expect(screen.getByText('This feature requires the desktop application')).toBeInTheDocument();

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      const confirmPassphraseInput = screen.getByLabelText(/confirm passphrase/i);

      await user.type(keyLabelInput, 'Test Key');
      await user.type(passphraseInput, 'Password123!');
      await user.type(confirmPassphraseInput, 'Password123!');

      // Form submission should still work (call the API)
      await user.keyboard('{Enter}');
      expect(mockGenerateKey).toHaveBeenCalledTimes(1);

      // Error should remain visible
      expect(screen.getByText('This feature requires the desktop application')).toBeInTheDocument();
    });
  });

  describe('REGRESSION: Form Event Handling', () => {
    it('should prevent default form submission behavior while still calling API', async () => {
      const mockGenerateKey = vi.fn().mockResolvedValue(undefined);
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        generateKey: mockGenerateKey,
      });

      renderWithRouter(<SetupPage />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      const confirmPassphraseInput = screen.getByLabelText(/confirm passphrase/i);

      await user.type(keyLabelInput, 'Test Key');
      await user.type(passphraseInput, 'Password123!');
      await user.type(confirmPassphraseInput, 'Password123!');

      // Simulate form submission via Enter key
      await user.keyboard('{Enter}');

      // Wait for the generateKey to be called
      await waitFor(() => {
        expect(mockGenerateKey).toHaveBeenCalledTimes(1);
      });

      // The form should handle submission without page reload
      // (React prevents default automatically when onSubmit is provided)
    });

    it('should handle Enter key in different form fields correctly', async () => {
      const mockGenerateKey = vi.fn().mockResolvedValue(undefined);
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        generateKey: mockGenerateKey,
      });

      renderWithRouter(<SetupPage />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      const confirmPassphraseInput = screen.getByLabelText(/confirm passphrase/i);

      // Fill form
      await user.type(keyLabelInput, 'Test Key');
      await user.type(passphraseInput, 'Password123!');
      await user.type(confirmPassphraseInput, 'Password123!');

      // Test Enter key from different fields
      await user.click(keyLabelInput);
      await user.keyboard('{Enter}');
      expect(mockGenerateKey).toHaveBeenCalledTimes(1);

      mockGenerateKey.mockClear();

      await user.click(passphraseInput);
      await user.keyboard('{Enter}');
      expect(mockGenerateKey).toHaveBeenCalledTimes(1);

      mockGenerateKey.mockClear();

      await user.click(confirmPassphraseInput);
      await user.keyboard('{Enter}');
      expect(mockGenerateKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('REGRESSION: Error Recovery and State Management', () => {
    it('should allow form to remain functional after API errors', async () => {
      const mockGenerateKey = vi
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({ key_id: 'success', public_key: 'age1test', saved_path: '/path' });

      const mockClearError = vi.fn();
      const mockReset = vi.fn();

      // Start with clean state, then simulate first failure
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        generateKey: mockGenerateKey,
        clearError: mockClearError,
        reset: mockReset,
      });

      const { rerender } = renderWithRouter(<SetupPage />);

      // Simulate first attempt that fails
      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      const confirmPassphraseInput = screen.getByLabelText(/confirm passphrase/i);

      await user.type(keyLabelInput, 'Test Key');
      await user.type(passphraseInput, 'Password123!');
      await user.type(confirmPassphraseInput, 'Password123!');

      // First attempt - this should fail
      await user.keyboard('{Enter}');
      expect(mockGenerateKey).toHaveBeenCalledTimes(1);

      // Now re-render with error state from the failed attempt
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        generateKey: mockGenerateKey,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'First attempt failed',
          recovery_guidance: 'Please try again',
          user_actionable: true,
        },
        clearError: mockClearError,
        reset: mockReset,
      });

      rerender(
        <BrowserRouter>
          <SetupPage />
        </BrowserRouter>,
      );

      // Error should be displayed
      expect(screen.getByText('First attempt failed')).toBeInTheDocument();

      // Clear error and try again
      const clearButton = screen.getByRole('button', { name: /close/i });
      await user.click(clearButton);
      expect(mockClearError).toHaveBeenCalledTimes(1);

      // Re-render with cleared error state
      mockUseKeyGeneration.mockReturnValue({
        ...defaultHookReturn,
        generateKey: mockGenerateKey,
        clearError: mockClearError,
        reset: mockReset,
      });

      rerender(
        <BrowserRouter>
          <SetupPage />
        </BrowserRouter>,
      );

      // Form should be functional again - clear and refill
      await user.clear(keyLabelInput);
      await user.clear(passphraseInput);
      await user.clear(confirmPassphraseInput);

      await user.type(keyLabelInput, 'Retry Key');
      await user.type(passphraseInput, 'RetryPassword123!');
      await user.type(confirmPassphraseInput, 'RetryPassword123!');

      await user.keyboard('{Enter}');

      // Second attempt should work
      expect(mockGenerateKey).toHaveBeenCalledTimes(2);
    });
  });
});
