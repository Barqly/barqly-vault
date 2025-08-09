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

    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<EnhancedInput {...defaultProps} required={true} />);

    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /test label/i })).toBeRequired();
  });

  it('displays helper text when provided', () => {
    const helper = 'This is helper text';
    render(<EnhancedInput {...defaultProps} helper={helper} />);

    expect(screen.getByText(helper)).toBeInTheDocument();
  });

  it('displays error message and accessibility when error is present', () => {
    const error = 'This field is required';
    render(<EnhancedInput {...defaultProps} error={error} />);

    const input = screen.getByLabelText('Test Label');
    const errorMessage = screen.getByRole('alert');

    expect(errorMessage).toHaveTextContent(error);
    expect(errorMessage).toHaveAttribute('role', 'alert');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', `${defaultProps.id}-description`);
  });

  it('indicates success state accessibly', () => {
    render(<EnhancedInput {...defaultProps} success={true} />);

    const input = screen.getByLabelText('Test Label');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('prioritizes error over helper text', () => {
    const error = 'Error message';
    const helper = 'Helper text';
    render(<EnhancedInput {...defaultProps} error={error} helper={helper} />);

    expect(screen.getByText(error)).toBeInTheDocument();
    expect(screen.queryByText(helper)).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(error);
  });

  it('renders different sizes appropriately', () => {
    const { rerender } = render(<EnhancedInput {...defaultProps} size="default" />);
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();

    rerender(<EnhancedInput {...defaultProps} size="large" />);
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  it('handles onChange events', () => {
    const handleChange = vi.fn();
    render(<EnhancedInput {...defaultProps} onChange={handleChange} />);

    const input = screen.getByLabelText('Test Label');
    fireEvent.change(input, { target: { value: 'test value' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('supports fullWidth prop', () => {
    const { rerender } = render(<EnhancedInput {...defaultProps} fullWidth={true} />);
    expect(screen.getByLabelText('Test Label')).toHaveClass('w-full');

    rerender(<EnhancedInput {...defaultProps} fullWidth={false} />);
    expect(screen.getByLabelText('Test Label')).not.toHaveClass('w-full');
  });

  it('forwards ref correctly', () => {
    const ref = vi.fn();
    render(<EnhancedInput {...defaultProps} ref={ref} />);

    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it('applies custom className', () => {
    render(<EnhancedInput {...defaultProps} className="custom-class" />);

    expect(screen.getByLabelText('Test Label')).toHaveClass('custom-class');
  });

  it('sets proper aria attributes', () => {
    const { rerender } = render(<EnhancedInput {...defaultProps} helper="Helper text" />);

    const input = screen.getByLabelText('Test Label');
    expect(input).toHaveAttribute('aria-describedby', `${defaultProps.id}-description`);
    expect(screen.getByText('Helper text')).toBeInTheDocument();

    rerender(<EnhancedInput {...defaultProps} />);
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('handles disabled state', () => {
    render(<EnhancedInput {...defaultProps} disabled={true} />);

    const input = screen.getByLabelText('Test Label');
    expect(input).toBeDisabled();
  });
});
