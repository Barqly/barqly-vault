import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PassphraseVisibilityToggle from '../../../components/forms/PassphraseVisibilityToggle';

describe('PassphraseVisibilityToggle', () => {
  it('should show eye icon when password is hidden', () => {
    const mockToggle = vi.fn();
    render(<PassphraseVisibilityToggle isVisible={false} onToggle={mockToggle} />);

    const button = screen.getByLabelText('Show password');
    expect(button).toBeInTheDocument();
  });

  it('should show eye-off icon when password is visible', () => {
    const mockToggle = vi.fn();
    render(<PassphraseVisibilityToggle isVisible={true} onToggle={mockToggle} />);

    const button = screen.getByLabelText('Hide password');
    expect(button).toBeInTheDocument();
  });

  it('should call onToggle when clicked', () => {
    const mockToggle = vi.fn();
    render(<PassphraseVisibilityToggle isVisible={false} onToggle={mockToggle} />);

    const button = screen.getByLabelText('Show password');
    fireEvent.click(button);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    const mockToggle = vi.fn();
    render(<PassphraseVisibilityToggle isVisible={false} onToggle={mockToggle} disabled={true} />);

    const button = screen.getByLabelText('Show password');
    expect(button).toBeDisabled();
  });

  it('should not call onToggle when disabled and clicked', () => {
    const mockToggle = vi.fn();
    render(<PassphraseVisibilityToggle isVisible={false} onToggle={mockToggle} disabled={true} />);

    const button = screen.getByLabelText('Show password');
    fireEvent.click(button);

    expect(mockToggle).not.toHaveBeenCalled();
  });
});
