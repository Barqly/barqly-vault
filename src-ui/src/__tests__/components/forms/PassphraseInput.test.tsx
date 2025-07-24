import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PassphraseInput from '../../../components/forms/PassphraseInput';

describe('PassphraseInput (4.2.1.2)', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should render with default props', () => {
      render(<PassphraseInput />);

      expect(screen.getByPlaceholderText('Enter your passphrase')).toBeInTheDocument();
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });

    it('should handle controlled value', () => {
      const testValue = 'test-passphrase';
      render(<PassphraseInput value={testValue} />);

      const input = screen.getByDisplayValue(testValue);
      expect(input).toHaveValue(testValue);
    });

    it('should handle uncontrolled value', () => {
      render(<PassphraseInput />);

      const input = screen.getByPlaceholderText('Enter your passphrase') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'new-value' } });

      expect(input.value).toBe('new-value');
    });

    it('should call onChange when value changes', () => {
      const mockOnChange = vi.fn();
      render(<PassphraseInput onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      fireEvent.change(input, { target: { value: 'new-value' } });

      expect(mockOnChange).toHaveBeenCalledWith('new-value');
    });

    it('should handle placeholder prop', () => {
      const customPlaceholder = 'Custom placeholder';
      render(<PassphraseInput placeholder={customPlaceholder} />);

      expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument();
    });

    it('should handle label prop', () => {
      const customLabel = 'Custom Label';
      render(<PassphraseInput label={customLabel} />);

      expect(screen.getByText(customLabel)).toBeInTheDocument();
    });

    it('should show required indicator when required is true', () => {
      render(<PassphraseInput required />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should not show required indicator when required is false', () => {
      render(<PassphraseInput required={false} />);

      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<PassphraseInput disabled />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      expect(input).toBeDisabled();
    });

    it('should not be disabled when disabled prop is false', () => {
      render(<PassphraseInput disabled={false} />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      expect(input).not.toBeDisabled();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility when eye icon is clicked', () => {
      render(<PassphraseInput />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      // Initially should be password type
      expect(input).toHaveAttribute('type', 'password');

      // Click to show password
      fireEvent.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');

      // Click to hide password again
      fireEvent.click(toggleButton);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should update aria-label when visibility is toggled', () => {
      render(<PassphraseInput />);

      const toggleButton = screen.getByRole('button', { name: /show password/i });

      // Initially should show "Show password"
      expect(toggleButton).toHaveAttribute('aria-label', 'Show password');

      // Click to show password
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-label', 'Hide password');

      // Click to hide password again
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
    });

    it('should be disabled when input is disabled', () => {
      render(<PassphraseInput disabled />);

      const toggleButton = screen.getByRole('button', { name: /show password/i });
      expect(toggleButton).toBeDisabled();
    });
  });

  describe('Passphrase Strength', () => {
    it('should show strength indicator when showStrength is true', () => {
      render(<PassphraseInput showStrength />);

      expect(screen.getByText('Passphrase Strength:')).toBeInTheDocument();
    });

    it('should not show strength indicator when showStrength is false', () => {
      render(<PassphraseInput showStrength={false} />);

      expect(screen.queryByText('Passphrase Strength:')).not.toBeInTheDocument();
    });

    it('should update strength when passphrase changes', async () => {
      render(<PassphraseInput />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      await user.type(input, 'weak');

      expect(screen.getByText(/too short/i)).toBeInTheDocument();
    });

    it('should show strong passphrase message for valid passphrase', async () => {
      render(<PassphraseInput />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      await user.type(input, 'StrongPass123!');

      expect(screen.getByText(/strong passphrase/i)).toBeInTheDocument();
    });

    it('should call onStrengthChange when strength changes', async () => {
      const mockOnStrengthChange = vi.fn();
      render(<PassphraseInput onStrengthChange={mockOnStrengthChange} />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      await user.type(input, 'test');

      expect(mockOnStrengthChange).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should show validation error when validation fails', () => {
      render(<PassphraseInput error="Validation error" />);

      expect(screen.getByText('Validation error')).toBeInTheDocument();
    });

    it('should validate on blur when required', () => {
      render(<PassphraseInput required />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      fireEvent.blur(input);

      expect(screen.getByText('Passphrase is required')).toBeInTheDocument();
    });

    it('should validate minimum length', () => {
      render(<PassphraseInput minLength={8} />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      fireEvent.change(input, { target: { value: 'short' } });
      fireEvent.blur(input);

      expect(screen.getByText('Passphrase must be at least 8 characters long')).toBeInTheDocument();
    });

    it('should validate strong passphrase requirement', () => {
      render(<PassphraseInput requireStrong />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      fireEvent.change(input, { target: { value: 'weakpassphrase' } });
      fireEvent.blur(input);

      expect(screen.getByText('Passphrase is too weak')).toBeInTheDocument();
    });
  });

  describe('Confirmation Field', () => {
    it('should show confirmation match status', () => {
      render(
        <PassphraseInput
          isConfirmationField
          originalPassphrase="original123"
          value="original123"
        />,
      );

      expect(screen.getByText('Passphrases match')).toBeInTheDocument();
    });

    it('should show confirmation mismatch status', () => {
      render(
        <PassphraseInput
          isConfirmationField
          originalPassphrase="original123"
          value="different123"
        />,
      );

      expect(screen.getByText("Passphrases don't match")).toBeInTheDocument();
    });

    it('should not show strength indicator for confirmation field', () => {
      render(<PassphraseInput isConfirmationField />);

      expect(screen.queryByText('Passphrase Strength:')).not.toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('should call onChange when input value changes', async () => {
      const mockOnChange = vi.fn();
      render(<PassphraseInput onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      await user.type(input, 'test');

      // user.type calls onChange for each character, so we check that it was called
      expect(mockOnChange).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith('t');
      expect(mockOnChange).toHaveBeenCalledWith('te');
      expect(mockOnChange).toHaveBeenCalledWith('tes');
      expect(mockOnChange).toHaveBeenCalledWith('test');
    });

    it('should call onStrengthChange when strength changes', async () => {
      const mockOnStrengthChange = vi.fn();
      render(<PassphraseInput onStrengthChange={mockOnStrengthChange} />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      await user.type(input, 'MySecure@2024!');

      // Check that onStrengthChange was called
      expect(mockOnStrengthChange).toHaveBeenCalled();
      // Check that it was called with the final strength
      expect(mockOnStrengthChange).toHaveBeenCalledWith({
        isStrong: true,
        message: 'Strong passphrase',
        score: expect.any(Number),
      });
    });

    it('should call onBlur when input loses focus', async () => {
      const mockOnBlur = vi.fn();
      render(<PassphraseInput onBlur={mockOnBlur} />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      await user.click(input);
      await user.tab();

      expect(mockOnBlur).toHaveBeenCalled();
    });

    it('should call onFocus when input gains focus', async () => {
      const mockOnFocus = vi.fn();
      render(<PassphraseInput onFocus={mockOnFocus} />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      await user.click(input);

      expect(mockOnFocus).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<PassphraseInput />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      expect(input).toHaveAttribute('type', 'password');
      expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
      expect(toggleButton).toHaveAttribute('tabIndex', '-1');
    });

    it('should handle keyboard navigation correctly', async () => {
      render(<PassphraseInput value="" onChange={() => {}} />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      input.focus();
      expect(input).toHaveFocus();

      // Tab to the info button
      await user.tab();
      expect(screen.getByRole('button', { name: /passphrase requirements/i })).toHaveFocus();

      // Tab again to move focus away
      await user.tab();
      expect(document.body).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('should display custom error message when provided', () => {
      render(<PassphraseInput error="Custom error message" />);

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('should display error with proper styling', () => {
      render(<PassphraseInput error="Error message" />);

      const errorElement = screen.getByText('Error message');
      expect(errorElement).toHaveClass('text-red-600');
    });

    it('should not display error when no error is provided', () => {
      render(<PassphraseInput />);

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle rapid input changes efficiently', async () => {
      const mockOnChange = vi.fn();
      render(<PassphraseInput onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Enter your passphrase');

      // Rapidly type many characters
      await user.type(input, 'a'.repeat(50));

      expect(input).toHaveValue('a'.repeat(50));
      // Check that strength is calculated correctly (repeated chars should be weak)
      expect(screen.getByText(/add uppercase, numbers, symbols/i)).toBeInTheDocument();
    });

    it('should correctly assess Alice256789u7u7u8i9o8k7 passphrase', async () => {
      render(<PassphraseInput />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      await user.type(input, 'Alice256789u7u7u8i9o8k7');

      // This should be weak because it's missing symbols
      expect(screen.getByText(/add symbols/i)).toBeInTheDocument();
    });

    it('should call onStrengthChange for each keystroke', async () => {
      const mockOnStrengthChange = vi.fn();
      render(<PassphraseInput onStrengthChange={mockOnStrengthChange} />);

      const input = screen.getByPlaceholderText('Enter your passphrase');

      // Rapid typing
      for (let i = 0; i < 10; i++) {
        await user.type(input, 'a');
      }

      // Should call onStrengthChange for initial render + each keystroke
      expect(mockOnStrengthChange).toHaveBeenCalledTimes(11);
    });

    it('should correctly assess Alice123af5b8o0 passphrase', async () => {
      render(<PassphraseInput />);

      const input = screen.getByPlaceholderText('Enter your passphrase');
      await user.type(input, 'Alice123af5b8o0');

      // This should be weak because it's missing symbols
      expect(screen.getByText(/add symbols/i)).toBeInTheDocument();
    });
  });
});
