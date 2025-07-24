import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { KeySelectionDropdown } from '../../../components/forms/KeySelectionDropdown';
import { KeyMetadata } from '../../../lib/api-types';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
const mockInvoke = invoke as any;

const mockKeys: KeyMetadata[] = [
  {
    label: 'My Backup Key',
    created_at: '2024-01-15T10:30:00Z',
    public_key: 'age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p',
  },
  {
    label: 'Test Key',
    created_at: '2024-01-20T14:45:00Z',
    public_key: 'age1testkey123456789abcdef',
  },
];

describe('KeySelectionDropdown (4.2.1.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(mockKeys);
  });

  describe('Basic Rendering', () => {
    it('should render with default props', async () => {
      render(<KeySelectionDropdown />);

      expect(screen.getByText('Encryption Key')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading keys...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Select a key...')).toBeInTheDocument();
    });

    it('should render with custom label and placeholder', async () => {
      render(<KeySelectionDropdown label="Custom Label" placeholder="Custom placeholder" />);

      expect(screen.getByText('Custom Label')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading keys...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Custom placeholder')).toBeInTheDocument();
    });

    it('should show required indicator when required is true', async () => {
      await act(async () => {
        render(<KeySelectionDropdown required />);
      });

      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('Key Loading', () => {
    it('should load keys on mount', async () => {
      render(<KeySelectionDropdown />);

      expect(mockInvoke).toHaveBeenCalledWith('list_keys_command');

      await waitFor(() => {
        expect(screen.queryByText('Loading keys...')).not.toBeInTheDocument();
      });
    });

    it('should show loading state', () => {
      mockInvoke.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<KeySelectionDropdown />);

      expect(screen.getByText('Loading keys...')).toBeInTheDocument();
    });

    it('should handle loading error', async () => {
      mockInvoke.mockRejectedValue({ message: 'Failed to load keys' });

      render(<KeySelectionDropdown />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load keys')).toBeInTheDocument();
      });
    });
  });

  describe('Dropdown Functionality', () => {
    it('should open dropdown when clicked', async () => {
      render(<KeySelectionDropdown />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(screen.getByText('My Backup Key')).toBeInTheDocument();
      expect(screen.getByText('Test Key')).toBeInTheDocument();
    });

    it('should close dropdown when key is selected', async () => {
      const mockOnChange = vi.fn();
      render(<KeySelectionDropdown onChange={mockOnChange} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      const keyOption = screen.getByText('My Backup Key');
      await userEvent.click(keyOption);

      expect(mockOnChange).toHaveBeenCalledWith('My Backup Key');
      expect(screen.queryByText('Test Key')).not.toBeInTheDocument();
    });

    it('should display selected key', async () => {
      render(<KeySelectionDropdown value="My Backup Key" />);

      await waitFor(() => {
        expect(screen.getByText('My Backup Key')).toBeInTheDocument();
      });
    });
  });

  describe('Public Key Preview', () => {
    it('should show public key preview when key is selected', async () => {
      render(<KeySelectionDropdown value="My Backup Key" />);

      await waitFor(() => {
        expect(screen.getByText('Public Key')).toBeInTheDocument();
        // Look for the truncated version that's actually displayed
        expect(screen.getByText(/age1ql3z7h.*n9aqmcac8p/)).toBeInTheDocument();
      });
    });

    it('should hide public key when showPublicKey is false', async () => {
      render(<KeySelectionDropdown value="My Backup Key" showPublicKey={false} />);

      await waitFor(() => {
        expect(screen.queryByText('Public Key')).not.toBeInTheDocument();
      });
    });

    it('should toggle public key visibility', async () => {
      const { rerender } = render(<KeySelectionDropdown />);

      // Wait for keys to load first
      await waitFor(() => {
        expect(screen.queryByText('Loading keys...')).not.toBeInTheDocument();
      });

      // Now set the value after keys are loaded
      rerender(<KeySelectionDropdown value="My Backup Key" />);

      // Wait for the public key preview to appear
      await waitFor(() => {
        expect(screen.getByText('Public Key')).toBeInTheDocument();
      });

      // Verify the toggle button is initially in "Hide" state
      const toggleButton = screen.getByLabelText('Hide public key');
      expect(toggleButton).toBeInTheDocument();

      // Click to hide the public key
      await userEvent.click(toggleButton);

      // After clicking, the button should change to "Show public key"
      await waitFor(() => {
        expect(screen.getByLabelText('Show public key')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should handle keyboard navigation', async () => {
      render(<KeySelectionDropdown />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading keys...')).not.toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      button.focus();

      await userEvent.keyboard('{Enter}');

      // Check that dropdown opened by looking for dropdown content
      expect(screen.getByText('My Backup Key')).toBeInTheDocument();
      expect(screen.getByText('Test Key')).toBeInTheDocument();
    });

    it('should close dropdown on Escape key', async () => {
      render(<KeySelectionDropdown />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading keys...')).not.toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(screen.getByText('My Backup Key')).toBeInTheDocument();

      await userEvent.keyboard('{Escape}');

      expect(screen.queryByText('My Backup Key')).not.toBeInTheDocument();
    });

    it('should have proper ARIA attributes', async () => {
      await act(async () => {
        render(<KeySelectionDropdown />);
      });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Error Handling', () => {
    it('should display custom error message', async () => {
      await act(async () => {
        render(<KeySelectionDropdown error="Custom error message" />);
      });

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('should display loading error message', async () => {
      mockInvoke.mockRejectedValue({ message: 'Network error' });

      render(<KeySelectionDropdown />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no keys are available', async () => {
      mockInvoke.mockResolvedValue([]);

      render(<KeySelectionDropdown />);

      await waitFor(() => {
        expect(
          screen.getByText('No encryption keys found. Generate a key to get started.'),
        ).toBeInTheDocument();
      });
    });

    it('should show message in dropdown when no keys', async () => {
      mockInvoke.mockResolvedValue([]);

      render(<KeySelectionDropdown />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(screen.getByText('No keys available. Generate a key first.')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onKeysLoaded when keys are loaded', async () => {
      const mockOnKeysLoaded = vi.fn();
      render(<KeySelectionDropdown onKeysLoaded={mockOnKeysLoaded} />);

      await waitFor(() => {
        expect(mockOnKeysLoaded).toHaveBeenCalledWith(mockKeys);
      });
    });

    it('should call onLoadingChange when loading state changes', async () => {
      const mockOnLoadingChange = vi.fn();
      render(<KeySelectionDropdown onLoadingChange={mockOnLoadingChange} />);

      expect(mockOnLoadingChange).toHaveBeenCalledWith(true);

      await waitFor(() => {
        expect(mockOnLoadingChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', async () => {
      await act(async () => {
        render(<KeySelectionDropdown disabled />);
      });

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not open dropdown when disabled', async () => {
      render(<KeySelectionDropdown disabled />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(screen.queryByText('My Backup Key')).not.toBeInTheDocument();
    });
  });
});
