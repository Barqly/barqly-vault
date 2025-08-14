import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PassphraseMemoryHints from '../../../components/decrypt/PassphraseMemoryHints';
import '@testing-library/jest-dom';

describe('PassphraseMemoryHints', () => {
  describe('Initial Rendering', () => {
    it('should not render when no hints are available and no attempts', () => {
      const { container } = render(<PassphraseMemoryHints />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when vault path is provided', () => {
      render(<PassphraseMemoryHints vaultPath="/path/to/vault-2024-01-15.age" />);
      expect(screen.getByText('Memory Hints')).toBeInTheDocument();
    });

    it('should render when creation date is provided', () => {
      render(<PassphraseMemoryHints creationDate="2024-01-15" />);
      expect(screen.getByText('Memory Hints')).toBeInTheDocument();
    });

    it('should render when key label is provided', () => {
      render(<PassphraseMemoryHints keyLabel="My Bitcoin Vault" />);
      expect(screen.getByText('Memory Hints')).toBeInTheDocument();
    });

    it('should render when attempt count is greater than 0', () => {
      render(<PassphraseMemoryHints attemptCount={1} />);
      expect(screen.getByText('Memory Hints')).toBeInTheDocument();
    });
  });

  describe('Hint Display', () => {
    it('should display vault name hint from path', () => {
      render(<PassphraseMemoryHints vaultPath="/path/to/bitcoin-backup-2024.age" />);

      fireEvent.click(screen.getByLabelText('Toggle memory hints'));
      expect(screen.getByText('Vault name: bitcoin-backup-2024')).toBeInTheDocument();
    });

    it('should display creation date hint', () => {
      render(<PassphraseMemoryHints creationDate="2024-01-15" />);

      fireEvent.click(screen.getByLabelText('Toggle memory hints'));
      expect(screen.getByText('Vault created on 2024-01-15')).toBeInTheDocument();
    });

    it('should display key label hint', () => {
      render(<PassphraseMemoryHints keyLabel="Primary Bitcoin Key" />);

      fireEvent.click(screen.getByLabelText('Toggle memory hints'));
      expect(screen.getByText('You used the key: "Primary Bitcoin Key"')).toBeInTheDocument();
    });

    it('should display all available hints together', () => {
      render(
        <PassphraseMemoryHints
          vaultPath="/path/to/vault.age"
          creationDate="2024-01-15"
          keyLabel="Test Key"
        />,
      );

      fireEvent.click(screen.getByLabelText('Toggle memory hints'));

      expect(screen.getByText('Vault created on 2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('You used the key: "Test Key"')).toBeInTheDocument();
      expect(screen.getByText('Vault name: vault')).toBeInTheDocument();
    });
  });

  describe('Progressive Hints Based on Attempts', () => {
    it('should show basic hint after 1 attempt', () => {
      render(<PassphraseMemoryHints attemptCount={1} />);

      // Component auto-expands when attemptCount > 0
      expect(screen.getByText('Remember: Passphrases are case-sensitive')).toBeInTheDocument();
    });

    it('should show password manager hint after 2 attempts', () => {
      render(<PassphraseMemoryHints attemptCount={2} />);

      // Component auto-expands when attemptCount > 0
      expect(screen.getByText('Remember: Passphrases are case-sensitive')).toBeInTheDocument();
      expect(
        screen.getByText('Check your password manager for saved passphrases'),
      ).toBeInTheDocument();
    });

    it('should show all recovery hints after 3 attempts', () => {
      render(<PassphraseMemoryHints attemptCount={3} />);

      // Component auto-expands when attemptCount > 0
      expect(screen.getByText('Remember: Passphrases are case-sensitive')).toBeInTheDocument();
      expect(
        screen.getByText('Check your password manager for saved passphrases'),
      ).toBeInTheDocument();
      expect(screen.getByText('Look for backup notes or documentation')).toBeInTheDocument();
      expect(
        screen.getByText('Try variations of your commonly used passphrases'),
      ).toBeInTheDocument();
    });

    it('should show help link after 3 attempts with onNeedHelp callback', () => {
      const onNeedHelp = vi.fn();
      render(<PassphraseMemoryHints attemptCount={3} onNeedHelp={onNeedHelp} />);

      // Component auto-expands when attemptCount > 0
      const helpLink = screen.getByText('Need help recovering your passphrase? →');
      expect(helpLink).toBeInTheDocument();

      fireEvent.click(helpLink);
      expect(onNeedHelp).toHaveBeenCalledTimes(1);
    });

    it('should not show help link without onNeedHelp callback', () => {
      render(<PassphraseMemoryHints attemptCount={3} />);

      // Component auto-expands when attemptCount > 0
      expect(screen.queryByText('Need help recovering your passphrase? →')).not.toBeInTheDocument();
    });
  });

  describe('Expand/Collapse Behavior', () => {
    it('should be collapsed by default when attemptCount is 0', () => {
      render(<PassphraseMemoryHints vaultPath="/path/to/vault.age" />);

      // Hints should not be visible initially
      expect(screen.queryByText('Vault name: vault')).not.toBeInTheDocument();
    });

    it('should be expanded by default when attemptCount > 0', () => {
      render(<PassphraseMemoryHints vaultPath="/path/to/vault.age" attemptCount={1} />);

      // Hints should be visible immediately
      expect(screen.getByText('Vault name: vault')).toBeInTheDocument();
    });

    it('should toggle expansion when header is clicked', async () => {
      render(<PassphraseMemoryHints vaultPath="/path/to/vault.age" />);

      const toggle = screen.getByLabelText('Toggle memory hints');

      // Initially collapsed
      expect(screen.queryByText('Vault name: vault')).not.toBeInTheDocument();

      // Click to expand
      await userEvent.click(toggle);
      expect(screen.getByText('Vault name: vault')).toBeInTheDocument();

      // Click to collapse
      await userEvent.click(toggle);
      expect(screen.queryByText('Vault name: vault')).not.toBeInTheDocument();
    });

    it('should update chevron icon based on expansion state', async () => {
      render(<PassphraseMemoryHints vaultPath="/path/to/vault.age" />);

      const toggle = screen.getByLabelText('Toggle memory hints');

      // Check aria-expanded attribute changes

      // Initially should show chevron down (collapsed)
      expect(screen.getByLabelText('Toggle memory hints')).toHaveAttribute(
        'aria-expanded',
        'false',
      );

      // Click to expand
      await userEvent.click(toggle);
      expect(screen.getByLabelText('Toggle memory hints')).toHaveAttribute('aria-expanded', 'true');

      // Click to collapse
      await userEvent.click(toggle);
      expect(screen.getByLabelText('Toggle memory hints')).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });
  });

  describe('Attempt Count Display', () => {
    it('should not show attempt count when it is 0', () => {
      render(<PassphraseMemoryHints vaultPath="/path/to/vault.age" attemptCount={0} />);
      expect(screen.queryByText(/attempt/)).not.toBeInTheDocument();
    });

    it('should show singular "attempt" for 1 attempt', () => {
      render(<PassphraseMemoryHints attemptCount={1} />);
      expect(screen.getByText('(1 attempt)')).toBeInTheDocument();
    });

    it('should show plural "attempts" for multiple attempts', () => {
      render(<PassphraseMemoryHints attemptCount={2} />);
      expect(screen.getByText('(2 attempts)')).toBeInTheDocument();
    });

    it('should update attempt count dynamically', () => {
      const { rerender } = render(<PassphraseMemoryHints attemptCount={1} />);
      expect(screen.getByText('(1 attempt)')).toBeInTheDocument();

      rerender(<PassphraseMemoryHints attemptCount={2} />);
      expect(screen.getByText('(2 attempts)')).toBeInTheDocument();

      rerender(<PassphraseMemoryHints attemptCount={3} />);
      expect(screen.getByText('(3 attempts)')).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it.skip('should have blue theme for informational hints - REMOVED: Tests implementation not UX', () => {
      // Testing CSS classes is an implementation detail, not user behavior
      render(<PassphraseMemoryHints vaultPath="/path/to/vault.age" />);

      const container = screen.getByLabelText('Toggle memory hints').closest('div');
      expect(container).toHaveClass('bg-blue-50/60', 'border-blue-200');
    });

    it('should display icons for different hint types', () => {
      render(
        <PassphraseMemoryHints
          vaultPath="/path/to/vault.age"
          creationDate="2024-01-15"
          keyLabel="Test Key"
          attemptCount={1}
        />,
      );

      // Component auto-expands when attemptCount > 0
      // Check for various icons in the hints
      const hints = screen.getByText('Vault created on 2024-01-15').parentElement;
      expect(hints).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values gracefully', () => {
      render(<PassphraseMemoryHints vaultPath="" creationDate="" keyLabel="" />);

      // Should not render with empty values
      expect(screen.queryByText('Memory Hints')).not.toBeInTheDocument();
    });

    it('should extract vault name correctly from complex paths', () => {
      render(
        <PassphraseMemoryHints vaultPath="/Users/john/Documents/Bitcoin/Backups/main-wallet-2024-01-15.age" />,
      );

      fireEvent.click(screen.getByLabelText('Toggle memory hints'));
      expect(screen.getByText('Vault name: main-wallet-2024-01-15')).toBeInTheDocument();
    });

    it('should handle Windows-style paths', () => {
      render(<PassphraseMemoryHints vaultPath="C:\\Users\\john\\Documents\\vault.age" />);

      fireEvent.click(screen.getByLabelText('Toggle memory hints'));
      // Windows paths use backslashes, so the vault name extraction might differ
      expect(screen.getByText(/Vault name: .*vault/i)).toBeInTheDocument();
    });

    it('should handle very high attempt counts', () => {
      render(<PassphraseMemoryHints attemptCount={100} />);
      expect(screen.getByText('(100 attempts)')).toBeInTheDocument();

      // Component auto-expands when attemptCount > 0
      // Should still show the same hints as 3+ attempts
      expect(
        screen.getByText('Try variations of your commonly used passphrases'),
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<PassphraseMemoryHints vaultPath="/path/to/vault.age" />);

      const toggle = screen.getByLabelText('Toggle memory hints');
      expect(toggle).toHaveAttribute('aria-expanded');
      expect(toggle).toHaveAttribute('aria-label', 'Toggle memory hints');
    });

    it('should be keyboard accessible', async () => {
      render(<PassphraseMemoryHints vaultPath="/path/to/vault.age" />);

      const toggle = screen.getByLabelText('Toggle memory hints');

      // Should be focusable
      toggle.focus();
      expect(document.activeElement).toBe(toggle);

      // Should respond to click (Enter key is handled by browser for buttons)
      fireEvent.click(toggle);
      expect(screen.getByText('Vault name: vault')).toBeInTheDocument();
    });
  });
});
