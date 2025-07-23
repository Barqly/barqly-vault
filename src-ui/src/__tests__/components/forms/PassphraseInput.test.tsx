import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PassphraseInput from '../../../components/forms/PassphraseInput';

describe('PassphraseInput (4.2.1.2)', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render passphrase input with all required elements', () => {
      render(<PassphraseInput />);

      expect(screen.getByLabelText(/passphrase/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
      expect(screen.getByText(/passphrase strength/i)).toBeInTheDocument();
    });

    it('should render with custom label when provided', () => {
      render(<PassphraseInput label="Custom Password" />);

      expect(screen.getByLabelText(/custom password/i)).toBeInTheDocument();
    });

    it('should render with placeholder when provided', () => {
      render(<PassphraseInput placeholder="Enter your secret passphrase" />);

      expect(screen.getByPlaceholderText(/enter your secret passphrase/i)).toBeInTheDocument();
    });

    it('should render with initial value when provided', () => {
      render(<PassphraseInput value="initial-passphrase" />);

      expect(screen.getByDisplayValue('initial-passphrase')).toBeInTheDocument();
    });

    it('should render with disabled state when provided', () => {
      render(<PassphraseInput disabled />);

      const input = screen.getByLabelText(/passphrase/i);
      expect(input).toBeDisabled();
    });

    it('should render with required attribute when provided', () => {
      render(<PassphraseInput required />);

      const input = screen.getByLabelText(/passphrase/i);
      expect(input).toBeRequired();
    });
  });

  describe('Passphrase Visibility Toggle', () => {
    it('should toggle password visibility when eye button is clicked', async () => {
      render(<PassphraseInput />);

      const input = screen.getByLabelText(/passphrase/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      // Initially password should be hidden
      expect(input).toHaveAttribute('type', 'password');

      // Click to show password
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');
      expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

      // Click to hide password again
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'password');
      expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
    });

    it('should not toggle visibility when input is disabled', async () => {
      render(<PassphraseInput disabled />);

      const input = screen.getByLabelText(/passphrase/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      expect(toggleButton).toBeDisabled();
      expect(input).toHaveAttribute('type', 'password');

      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'password');
    });
  });

  describe('Passphrase Strength Validation', () => {
    it('should show weak passphrase strength for single character', async () => {
      render(<PassphraseInput />);

      const input = screen.getByLabelText(/passphrase/i);
      await user.type(input, 'a');

      expect(screen.getByText(/weak passphrase/i)).toBeInTheDocument();
      expect(screen.getByText(/passphrase strength: weak passphrase/i)).toBeInTheDocument();
    });

    it('should show weak passphrase strength', async () => {
      render(<PassphraseInput />);

      const input = screen.getByLabelText(/passphrase/i);
      await user.type(input, 'weakpass');

      expect(screen.getByText(/weak passphrase/i)).toBeInTheDocument();
      expect(screen.getByText(/passphrase strength: weak passphrase/i)).toBeInTheDocument();
    });

    it('should show weak passphrase strength for moderate input', async () => {
      render(<PassphraseInput />);

      const input = screen.getByLabelText(/passphrase/i);
      await user.type(input, 'moderate123');

      expect(screen.getByText(/weak passphrase/i)).toBeInTheDocument();
      expect(screen.getByText(/passphrase strength: weak passphrase/i)).toBeInTheDocument();
    });

    it('should show strong passphrase strength', async () => {
      render(<PassphraseInput />);

      const input = screen.getByLabelText(/passphrase/i);
      await user.type(input, 'StrongPass123!@#');

      expect(screen.getByText(/strong passphrase/i)).toBeInTheDocument();
      expect(screen.getByText(/passphrase strength: strong passphrase/i)).toBeInTheDocument();
    });

    it('should show strength indicator by default', () => {
      render(<PassphraseInput />);

      expect(screen.getByText(/passphrase strength: very weak passphrase/i)).toBeInTheDocument();
    });

    it('should hide strength indicator when showStrength is false', () => {
      render(<PassphraseInput showStrength={false} />);

      expect(screen.queryByText(/passphrase strength/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for empty required field', async () => {
      render(<PassphraseInput required />);

      const input = screen.getByLabelText(/passphrase/i);
      await user.click(input);
      await user.tab();

      expect(screen.getByText(/passphrase is required/i)).toBeInTheDocument();
    });

    it('should show validation error for too short passphrase', async () => {
      render(<PassphraseInput minLength={8} />);

      const input = screen.getByLabelText(/passphrase/i);
      await user.type(input, 'short');
      await user.tab();

      expect(screen.getByText(/passphrase must be at least 8 characters long/i)).toBeInTheDocument();
    });

    it('should show validation error for short passphrase when required', async () => {
      render(<PassphraseInput requireStrong />);

      const input = screen.getByLabelText(/passphrase/i);
      await user.type(input, 'weakpass');
      await user.tab();

      expect(screen.getByText(/passphrase must be at least 12 characters long/i)).toBeInTheDocument();
    });

    it('should not show validation error for strong passphrase', async () => {
      render(<PassphraseInput requireStrong />);

      const input = screen.getByLabelText(/passphrase/i);
      await user.type(input, 'StrongPass123!@#');
      await user.tab();

      expect(screen.queryByText(/passphrase is too weak/i)).not.toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('should call onChange when input value changes', async () => {
      const mockOnChange = vi.fn();
      render(<PassphraseInput onChange={mockOnChange} />);

      const input = screen.getByLabelText(/passphrase/i);
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

      const input = screen.getByLabelText(/passphrase/i);
      await user.type(input, 'StrongPass123!@#');

      // Check that onStrengthChange was called
      expect(mockOnStrengthChange).toHaveBeenCalled();
      // Check that it was called with the final strength
      expect(mockOnStrengthChange).toHaveBeenCalledWith({
        isStrong: true,
        message: 'Strong passphrase',
        score: 6
      });
    });

    it('should call onBlur when input loses focus', async () => {
      const mockOnBlur = vi.fn();
      render(<PassphraseInput onBlur={mockOnBlur} />);

      const input = screen.getByLabelText(/passphrase/i);
      await user.click(input);
      await user.tab();

      expect(mockOnBlur).toHaveBeenCalled();
    });

    it('should call onFocus when input gains focus', async () => {
      const mockOnFocus = vi.fn();
      render(<PassphraseInput onFocus={mockOnFocus} />);

      const input = screen.getByLabelText(/passphrase/i);
      await user.click(input);

      expect(mockOnFocus).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<PassphraseInput />);

      const input = screen.getByLabelText(/passphrase/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      expect(input).toHaveAttribute('type', 'password');
      expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
      expect(toggleButton).toHaveAttribute('tabIndex', '-1');
    });

    it('should be keyboard navigable', async () => {
      render(<PassphraseInput />);

      const input = screen.getByLabelText(/passphrase/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      await user.tab();
      expect(input).toHaveFocus();

      // Toggle button should not be focusable
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
      render(<PassphraseInput />);

      const input = screen.getByLabelText(/passphrase/i);
      
      // Rapid typing
      await user.type(input, 'a'.repeat(50));

      // Check that the input has the expected value
      expect(input).toHaveValue('a'.repeat(50));
      // Check that strength is calculated correctly
      expect(screen.getByText(/moderate passphrase/i)).toBeInTheDocument();
    });

    it('should call onStrengthChange for each keystroke', async () => {
      const mockOnStrengthChange = vi.fn();
      render(<PassphraseInput onStrengthChange={mockOnStrengthChange} />);

      const input = screen.getByLabelText(/passphrase/i);
      
      // Rapid typing
      for (let i = 0; i < 10; i++) {
        await user.type(input, 'a');
      }

      // Should call onStrengthChange for initial render + each keystroke
      expect(mockOnStrengthChange).toHaveBeenCalledTimes(11);
    });
  });
}); 