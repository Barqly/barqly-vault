import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PassphraseKeyDialog } from '../../../components/keys/PassphraseKeyDialog';
import { VaultProvider } from '../../../contexts/VaultContext';
import * as tauriSafe from '../../../lib/tauri-safe';

// Mock the safeInvoke function
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
}));

// Mock logger to avoid console noise
vi.mock('../../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockVault = {
  id: 'vault-123',
  name: 'Test Vault',
  keys: [],
  created_at: new Date().toISOString(),
};

describe('PassphraseKeyDialog - User Behavior', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockSafeInvoke = vi.mocked(tauriSafe.safeInvoke);

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock vault context values
    mockSafeInvoke.mockImplementation((cmd) => {
      if (cmd === 'list_vaults') {
        return Promise.resolve({ vaults: [mockVault] });
      }
      if (cmd === 'get_current_vault') {
        return Promise.resolve({ vault: mockVault });
      }
      if (cmd === 'get_vault_keys') {
        return Promise.resolve({ keys: [] });
      }
      return Promise.resolve({});
    });
  });

  const renderDialog = async (isOpen = true) => {
    let result;
    await act(async () => {
      result = render(
        <VaultProvider>
          <PassphraseKeyDialog isOpen={isOpen} onClose={mockOnClose} onSuccess={mockOnSuccess} />
        </VaultProvider>,
      );
    });
    return result!;
  };

  describe('User can see and interact with the dialog', () => {
    it('shows dialog when user wants to add a passphrase key', async () => {
      await renderDialog();

      // User should see the dialog title
      expect(screen.getByText('Add Passphrase Key')).toBeInTheDocument();

      // User should see input fields
      expect(screen.getByLabelText(/key label/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^passphrase/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm passphrase/i)).toBeInTheDocument();
    });

    it('hides dialog when user is not adding a key', async () => {
      await renderDialog(false);

      // User should not see the dialog
      expect(screen.queryByText('Add Passphrase Key')).not.toBeInTheDocument();
    });

    it('allows user to close the dialog', async () => {
      await renderDialog();
      const user = userEvent.setup();

      // User clicks the X button
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('User enters passphrase information', () => {
    it('allows user to type a label for their key', async () => {
      await renderDialog();
      const user = userEvent.setup();

      const labelInput = screen.getByLabelText(/key label/i);
      await user.type(labelInput, 'My Work Key');

      expect(labelInput).toHaveValue('My Work Key');
    });

    it('allows user to enter and see/hide their passphrase', async () => {
      await renderDialog();
      const user = userEvent.setup();

      const passphraseInput = screen.getByLabelText(/^passphrase/i);

      // User types passphrase (should be hidden)
      await user.type(passphraseInput, 'my-secret-pass');
      expect(passphraseInput).toHaveAttribute('type', 'password');

      // User clicks to show passphrase
      const toggleButton = screen.getByRole('button', { name: /show|hide/i });
      await user.click(toggleButton);
      expect(passphraseInput).toHaveAttribute('type', 'text');

      // User can hide it again
      await user.click(toggleButton);
      expect(passphraseInput).toHaveAttribute('type', 'password');
    });
  });

  describe('User sees real-time passphrase feedback', () => {
    it('shows strength indicator as user types passphrase', async () => {
      mockSafeInvoke.mockImplementation((cmd) => {
        if (cmd === 'validate_passphrase_strength') {
          return Promise.resolve({
            is_valid: true,
            strength: 'strong',
            score: 85,
            feedback: ['Good length', 'Contains special characters'],
          });
        }
        return Promise.resolve({});
      });

      await renderDialog();
      const user = userEvent.setup();

      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      await user.type(passphraseInput, 'MyStr0ng!Passphrase123');

      // User should see strength feedback
      await waitFor(() => {
        expect(screen.getByText(/strong/i)).toBeInTheDocument();
      });
    });

    it('shows minimum character requirement', async () => {
      await renderDialog();
      const user = userEvent.setup();

      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      await user.type(passphraseInput, 'short');

      // User should see they need more characters
      expect(screen.getByText(/7 more characters needed/i)).toBeInTheDocument();
    });

    it('shows when passphrases do not match', async () => {
      await renderDialog();
      const user = userEvent.setup();

      const passphraseInput = screen.getByLabelText(/^passphrase/i);
      const confirmInput = screen.getByLabelText(/confirm passphrase/i);

      await user.type(passphraseInput, 'password123');
      await user.type(confirmInput, 'different123');

      // User should see mismatch warning
      expect(screen.getByText(/passphrases do not match/i)).toBeInTheDocument();
    });
  });

  describe('User can create a passphrase key', () => {
    it('disables create button until all requirements are met', async () => {
      mockSafeInvoke.mockImplementation((cmd) => {
        if (cmd === 'validate_passphrase_strength') {
          return Promise.resolve({
            is_valid: false,
            strength: 'weak',
            score: 30,
            feedback: ['Too short'],
          });
        }
        return Promise.resolve({});
      });

      await renderDialog();

      const createButton = screen.getByRole('button', { name: /create passphrase key/i });

      // Button should be disabled initially
      expect(createButton).toBeDisabled();

      const user = userEvent.setup();

      // Enter label
      await user.type(screen.getByLabelText(/key label/i), 'My Key');
      expect(createButton).toBeDisabled(); // Still disabled

      // Enter weak passphrase
      await user.type(screen.getByLabelText(/^passphrase/i), 'weak');
      expect(createButton).toBeDisabled(); // Still disabled

      // Enter matching confirmation
      await user.type(screen.getByLabelText(/confirm passphrase/i), 'weak');
      expect(createButton).toBeDisabled(); // Still disabled due to weak passphrase
    });

    it('allows user to create key when all requirements are met', async () => {
      mockSafeInvoke.mockImplementation((cmd, args) => {
        if (cmd === 'list_vaults') {
          return Promise.resolve({ vaults: [mockVault] });
        }
        if (cmd === 'get_current_vault') {
          return Promise.resolve({ vault: mockVault });
        }
        if (cmd === 'validate_passphrase_strength') {
          return Promise.resolve({
            is_valid: true,
            strength: 'strong',
            score: 85,
            feedback: [],
          });
        }
        if (cmd === 'add_passphrase_key_to_vault') {
          return Promise.resolve({
            key_reference: { id: 'key-456', label: args?.label || 'My Key' },
            public_key: 'public-key-data',
          });
        }
        if (cmd === 'get_vault_keys') {
          return Promise.resolve({ keys: [{ id: 'key-456', label: 'My Key' }] });
        }
        return Promise.resolve({});
      });

      await renderDialog();
      const user = userEvent.setup();

      // Fill in all fields correctly
      await user.type(screen.getByLabelText(/key label/i), 'My Key');
      await user.type(screen.getByLabelText(/^passphrase/i), 'MyStr0ng!Pass123');
      await user.type(screen.getByLabelText(/confirm passphrase/i), 'MyStr0ng!Pass123');

      // Wait for validation
      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create passphrase key/i });
        expect(createButton).not.toBeDisabled();
      });

      // User clicks create
      const createButton = screen.getByRole('button', { name: /create passphrase key/i });
      await user.click(createButton);

      // Should call success callback (loading state will be too quick to catch in tests)
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('shows error message when key creation fails', async () => {
      mockSafeInvoke.mockImplementation((cmd) => {
        if (cmd === 'list_vaults') {
          return Promise.resolve({ vaults: [mockVault] });
        }
        if (cmd === 'get_current_vault') {
          return Promise.resolve({ vault: mockVault });
        }
        if (cmd === 'get_vault_keys') {
          return Promise.resolve({ keys: [] });
        }
        if (cmd === 'validate_passphrase_strength') {
          return Promise.resolve({
            is_valid: true,
            strength: 'strong',
            score: 85,
            feedback: [],
          });
        }
        if (cmd === 'add_passphrase_key_to_vault') {
          throw new Error('Vault limit exceeded');
        }
        return Promise.resolve({});
      });

      await renderDialog();
      const user = userEvent.setup();

      // Fill in all fields
      await user.type(screen.getByLabelText(/key label/i), 'My Key');
      await user.type(screen.getByLabelText(/^passphrase/i), 'MyStr0ng!Pass123');
      await user.type(screen.getByLabelText(/confirm passphrase/i), 'MyStr0ng!Pass123');

      // Wait for button to be enabled
      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create passphrase key/i });
        expect(createButton).not.toBeDisabled();
      });

      // Try to create
      await user.click(screen.getByRole('button', { name: /create passphrase key/i }));

      // User should see error message
      await waitFor(() => {
        expect(screen.getByText(/vault limit exceeded/i)).toBeInTheDocument();
      });
    });
  });

  describe('User sees security guidance', () => {
    it('shows security tips to help user create strong passphrases', async () => {
      await renderDialog();

      // User should see security guidance
      expect(screen.getByText(/security tips/i)).toBeInTheDocument();
      expect(screen.getByText(/unique passphrase/i)).toBeInTheDocument();
      expect(screen.getByText(/password manager/i)).toBeInTheDocument();
    });
  });
});
