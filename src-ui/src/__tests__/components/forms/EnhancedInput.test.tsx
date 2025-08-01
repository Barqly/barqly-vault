import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EnhancedInput from '../../../components/forms/EnhancedInput';

describe('EnhancedInput', () => {
  const defaultProps = {
    id: 'test-input',
    label: 'Test Label',
  };

  it('renders label and input correctly', () => {
    render(<EnhancedInput {...defaultProps} />);

    expect(screen.getByTestId('input-label')).toHaveTextContent('Test Label');
    expect(screen.getByTestId('enhanced-input')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<EnhancedInput {...defaultProps} required={true} />);

    const label = screen.getByTestId('input-label');
    expect(label).toHaveTextContent('Test Label *');
    expect(label.querySelector('[aria-label="required"]')).toBeInTheDocument();
  });

  it('displays helper text when provided', () => {
    const helper = 'This is helper text';
    render(<EnhancedInput {...defaultProps} helper={helper} />);

    expect(screen.getByTestId('helper-text')).toHaveTextContent(helper);
  });

  it('displays error message and styles when error is present', () => {
    const error = 'This field is required';
    render(<EnhancedInput {...defaultProps} error={error} />);

    const input = screen.getByTestId('enhanced-input');
    const errorMessage = screen.getByTestId('error-message');

    expect(errorMessage).toHaveTextContent(error);
    expect(errorMessage).toHaveAttribute('role', 'alert');
    expect(input).toHaveClass('border-red-400', 'bg-red-50');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
  });

  it('displays success state when success is true', () => {
    render(<EnhancedInput {...defaultProps} success={true} />);

    const input = screen.getByTestId('enhanced-input');
    expect(input).toHaveClass('border-green-500');
    expect(screen.getByTestId('success-icon')).toBeInTheDocument();
  });

  it('prioritizes error over helper text', () => {
    const error = 'Error message';
    const helper = 'Helper text';
    render(<EnhancedInput {...defaultProps} error={error} helper={helper} />);

    expect(screen.getByTestId('error-message')).toHaveTextContent(error);
    expect(screen.queryByTestId('helper-text')).not.toBeInTheDocument();
  });

  it('handles different sizes correctly', () => {
    const { rerender } = render(<EnhancedInput {...defaultProps} size="default" />);
    expect(screen.getByTestId('enhanced-input')).toHaveClass('h-10');

    rerender(<EnhancedInput {...defaultProps} size="large" />);
    expect(screen.getByTestId('enhanced-input')).toHaveClass('h-11');
  });

  it('handles onChange events', () => {
    const handleChange = vi.fn();
    render(<EnhancedInput {...defaultProps} onChange={handleChange} />);

    const input = screen.getByTestId('enhanced-input');
    fireEvent.change(input, { target: { value: 'test value' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('supports fullWidth prop', () => {
    const { rerender } = render(<EnhancedInput {...defaultProps} fullWidth={true} />);
    expect(screen.getByTestId('enhanced-input')).toHaveClass('w-full');

    rerender(<EnhancedInput {...defaultProps} fullWidth={false} />);
    expect(screen.getByTestId('enhanced-input')).not.toHaveClass('w-full');
  });

  it('forwards ref correctly', () => {
    const ref = vi.fn();
    render(<EnhancedInput {...defaultProps} ref={ref} />);

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it('applies custom className', () => {
    render(<EnhancedInput {...defaultProps} className="custom-class" />);

    expect(screen.getByTestId('enhanced-input')).toHaveClass('custom-class');
  });

  it('sets proper aria attributes', () => {
    const { rerender } = render(<EnhancedInput {...defaultProps} helper="Helper text" />);

    const input = screen.getByTestId('enhanced-input');
    expect(input).toHaveAttribute('aria-describedby', `${defaultProps.id}-description`);

    rerender(<EnhancedInput {...defaultProps} />);
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('handles disabled state', () => {
    render(<EnhancedInput {...defaultProps} disabled={true} />);

    const input = screen.getByTestId('enhanced-input');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:bg-gray-50', 'disabled:cursor-not-allowed');
  });
});
