import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import KeyGenerationForm from '../../../components/forms/KeyGenerationForm';

// Mock Tauri commands
vi.mock('@tauri-apps/api', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api')).invoke;

describe('KeyGenerationForm (4.2.1.1)', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render key generation form with all required fields', () => {
      render(<KeyGenerationForm />);

      // Check for form elements
      expect(screen.getByLabelText(/key label/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/passphrase/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate key/i })).toBeInTheDocument();
    });

    it('should show passphrase strength indicator', () => {
      render(<KeyGenerationForm />);

      expect(screen.getByText(/passphrase strength/i)).toBeInTheDocument();
    });

    it('should display form validation rules', () => {
      render(<KeyGenerationForm />);

      expect(screen.getByText(/key label must be/i)).toBeInTheDocument();
      expect(screen.getByText(/passphrase must be/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate key label is required', async () => {
      render(<KeyGenerationForm />);

      const generateButton = screen.getByRole('button', { name: /generate key/i });
      await user.click(generateButton);

      expect(screen.getByText(/key label is required/i)).toBeInTheDocument();
    });

    it('should validate key label format', async () => {
      render(<KeyGenerationForm />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      await user.type(keyLabelInput, 'invalid@label');

      const generateButton = screen.getByRole('button', { name: /generate key/i });
      await user.click(generateButton);

      expect(screen.getByText(/key label contains invalid characters/i)).toBeInTheDocument();
    });

    it('should validate passphrase is required', async () => {
      render(<KeyGenerationForm />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      await user.type(keyLabelInput, 'Valid Key Label');

      const generateButton = screen.getByRole('button', { name: /generate key/i });
      await user.click(generateButton);

      expect(screen.getByText(/passphrase is required/i)).toBeInTheDocument();
    });

    it('should validate passphrase strength', async () => {
      render(<KeyGenerationForm />);

      const passphraseInput = screen.getByLabelText(/passphrase/i);
      await user.type(passphraseInput, 'weak');

      // Should show weak passphrase warning
      expect(screen.getByText(/passphrase is too weak/i)).toBeInTheDocument();
    });

    it('should accept valid form data', async () => {
      render(<KeyGenerationForm />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/passphrase/i);

      await user.type(keyLabelInput, 'My Backup Key');
      await user.type(passphraseInput, 'SecurePassphrase123!');

      // Should not show validation errors
      expect(screen.queryByText(/key label is required/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/passphrase is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Passphrase Strength Validation', () => {
    it('should show weak passphrase warning for short passwords', async () => {
      render(<KeyGenerationForm />);

      const passphraseInput = screen.getByLabelText(/passphrase/i);
      await user.type(passphraseInput, 'short');

      expect(screen.getByText(/passphrase is too weak/i)).toBeInTheDocument();
    });

    it('should show weak passphrase warning for common passwords', async () => {
      render(<KeyGenerationForm />);

      const passphraseInput = screen.getByLabelText(/passphrase/i);
      await user.type(passphraseInput, 'password123');

      expect(screen.getByText(/passphrase is too weak/i)).toBeInTheDocument();
    });

    it('should accept strong passphrase', async () => {
      render(<KeyGenerationForm />);

      const passphraseInput = screen.getByLabelText(/passphrase/i);
      await user.type(passphraseInput, 'MySecurePassphrase123!@#');

      expect(screen.queryByText(/passphrase is too weak/i)).not.toBeInTheDocument();
    });
  });

  describe('Key Generation Workflow', () => {
    it('should call generate_key command with valid form data', async () => {
      mockInvoke.mockResolvedValueOnce({
        public_key: 'age1testpublickey',
        key_id: 'test-key-123',
        saved_path: '/path/to/key'
      });

      render(<KeyGenerationForm />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/passphrase/i);
      const generateButton = screen.getByRole('button', { name: /generate key/i });

      await user.type(keyLabelInput, 'My Backup Key');
      await user.type(passphraseInput, 'SecurePassphrase123!');
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('generate_key', {
          label: 'My Backup Key',
          passphrase: 'SecurePassphrase123!'
        });
      });
    });

    it('should show loading state during key generation', async () => {
      mockInvoke.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<KeyGenerationForm />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/passphrase/i);
      const generateButton = screen.getByRole('button', { name: /generate key/i });

      await user.type(keyLabelInput, 'My Backup Key');
      await user.type(passphraseInput, 'SecurePassphrase123!');
      await user.click(generateButton);

      expect(screen.getByText(/generating key/i)).toBeInTheDocument();
      expect(generateButton).toBeDisabled();
    });

    it('should show success message after key generation', async () => {
      mockInvoke.mockResolvedValueOnce({
        public_key: 'age1testpublickey',
        key_id: 'test-key-123',
        saved_path: '/path/to/key'
      });

      render(<KeyGenerationForm />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/passphrase/i);
      const generateButton = screen.getByRole('button', { name: /generate key/i });

      await user.type(keyLabelInput, 'My Backup Key');
      await user.type(passphraseInput, 'SecurePassphrase123!');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/key generated successfully/i)).toBeInTheDocument();
      });
    });

    it('should display generated public key', async () => {
      const mockPublicKey = 'age1testpublickey123456789';
      mockInvoke.mockResolvedValueOnce({
        public_key: mockPublicKey,
        key_id: 'test-key-123',
        saved_path: '/path/to/key'
      });

      render(<KeyGenerationForm />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/passphrase/i);
      const generateButton = screen.getByRole('button', { name: /generate key/i });

      await user.type(keyLabelInput, 'My Backup Key');
      await user.type(passphraseInput, 'SecurePassphrase123!');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(mockPublicKey)).toBeInTheDocument();
      });
    });

    it('should handle key generation errors', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Key generation failed'));

      render(<KeyGenerationForm />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/passphrase/i);
      const generateButton = screen.getByRole('button', { name: /generate key/i });

      await user.type(keyLabelInput, 'My Backup Key');
      await user.type(passphraseInput, 'SecurePassphrase123!');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/key generation failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Reset and State Management', () => {
    it('should reset form after successful key generation', async () => {
      mockInvoke.mockResolvedValueOnce({
        public_key: 'age1testpublickey',
        key_id: 'test-key-123',
        saved_path: '/path/to/key'
      });

      render(<KeyGenerationForm />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/passphrase/i);
      const generateButton = screen.getByRole('button', { name: /generate key/i });

      await user.type(keyLabelInput, 'My Backup Key');
      await user.type(passphraseInput, 'SecurePassphrase123!');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/key generated successfully/i)).toBeInTheDocument();
      });

      // Form should be reset
      expect(keyLabelInput).toHaveValue('');
      expect(passphraseInput).toHaveValue('');
    });

    it('should clear validation errors when user starts typing', async () => {
      render(<KeyGenerationForm />);

      const generateButton = screen.getByRole('button', { name: /generate key/i });
      await user.click(generateButton);

      expect(screen.getByText(/key label is required/i)).toBeInTheDocument();

      const keyLabelInput = screen.getByLabelText(/key label/i);
      await user.type(keyLabelInput, 'Valid Key');

      expect(screen.queryByText(/key label is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<KeyGenerationForm />);

      expect(screen.getByLabelText(/key label/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/passphrase/i)).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      render(<KeyGenerationForm />);

      const keyLabelInput = screen.getByLabelText(/key label/i);
      const passphraseInput = screen.getByLabelText(/passphrase/i);
      const generateButton = screen.getByRole('button', { name: /generate key/i });

      await user.tab();
      expect(keyLabelInput).toHaveFocus();

      await user.tab();
      expect(passphraseInput).toHaveFocus();

      // Button should be focusable
      await user.tab();
      expect(generateButton).toHaveFocus();
    });

    it('should show validation errors to screen readers', async () => {
      render(<KeyGenerationForm />);

      const generateButton = screen.getByRole('button', { name: /generate key/i });
      await user.click(generateButton);

      const errorMessage = screen.getByText(/key label is required/i);
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });
}); 