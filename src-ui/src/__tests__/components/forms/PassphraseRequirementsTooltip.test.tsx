import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PassphraseRequirementsTooltip from '../../../components/forms/PassphraseRequirementsTooltip';

describe('PassphraseRequirementsTooltip', () => {
  it('should show info button', () => {
    const mockToggle = vi.fn();
    render(<PassphraseRequirementsTooltip show={false} onToggle={mockToggle} />);

    const button = screen.getByLabelText('Passphrase requirements');
    expect(button).toBeInTheDocument();
  });

  it('should not show tooltip when show is false', () => {
    const mockToggle = vi.fn();
    render(<PassphraseRequirementsTooltip show={false} onToggle={mockToggle} />);

    expect(screen.queryByText('Passphrase Requirements:')).not.toBeInTheDocument();
  });

  it('should show tooltip when show is true', () => {
    const mockToggle = vi.fn();
    render(<PassphraseRequirementsTooltip show={true} onToggle={mockToggle} />);

    expect(screen.getByText('Passphrase Requirements:')).toBeInTheDocument();
    expect(screen.getByText(/Minimum 12 characters/)).toBeInTheDocument();
    expect(
      screen.getByText(/Must include ALL: uppercase, lowercase, numbers, and symbols/),
    ).toBeInTheDocument();
  });

  it('should call onToggle when info button is clicked', () => {
    const mockToggle = vi.fn();
    render(<PassphraseRequirementsTooltip show={false} onToggle={mockToggle} />);

    const button = screen.getByLabelText('Passphrase requirements');
    fireEvent.click(button);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('should call onToggle when clicking outside tooltip', () => {
    const mockToggle = vi.fn();
    render(<PassphraseRequirementsTooltip show={true} onToggle={mockToggle} />);

    // Click outside the tooltip
    fireEvent.mouseDown(document.body);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('should not call onToggle when clicking inside tooltip', () => {
    const mockToggle = vi.fn();
    render(<PassphraseRequirementsTooltip show={true} onToggle={mockToggle} />);

    const tooltip = screen.getByText('Passphrase Requirements:').closest('div');
    if (tooltip) {
      fireEvent.mouseDown(tooltip);
    }

    expect(mockToggle).not.toHaveBeenCalled();
  });
});
