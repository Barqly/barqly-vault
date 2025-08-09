import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PassphraseField from '../../../components/forms/PassphraseField';

describe('PassphraseField', () => {
  const defaultProps = {
    id: 'test-passphrase',
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows users to enter passphrase securely', () => {
    render(<PassphraseField {...defaultProps} />);

    const input = screen.getByDisplayValue('');
    const toggleButton = screen.getByRole('button', { name: /show passphrase/i });

    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('id', defaultProps.id);
    expect(toggleButton).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(<PassphraseField {...defaultProps} />);

    const input = screen.getByDisplayValue('');
    const toggle = screen.getByRole('button', { name: /show passphrase/i });

    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide passphrase/i })).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('calls onChange when input value changes', () => {
    const handleChange = vi.fn();
    render(<PassphraseField {...defaultProps} onChange={handleChange} />);

    const input = screen.getByDisplayValue('');
    fireEvent.change(input, { target: { value: 'test passphrase' } });

    expect(handleChange).toHaveBeenCalledWith('test passphrase');
  });

  it('shows strength indicator when showStrength is true and value exists', () => {
    render(<PassphraseField {...defaultProps} value="test123" showStrength={true} />);

    expect(screen.getByText(/passphrase strength/i)).toBeInTheDocument();
  });

  it('shows strength indicator with default state when value is empty', () => {
    render(<PassphraseField {...defaultProps} value="" showStrength={true} />);

    expect(screen.getByText(/passphrase strength/i)).toBeInTheDocument();
  });

  it('shows match indicator when matchValue is provided', () => {
    render(<PassphraseField {...defaultProps} value="test123" matchValue="test123" />);

    expect(screen.getByText('Passphrases match')).toBeInTheDocument();
  });

  it('shows mismatch indicator when values do not match', () => {
    render(<PassphraseField {...defaultProps} value="test123" matchValue="different" />);

    expect(screen.getByText("Passphrases don't match")).toBeInTheDocument();
  });

  it('does not show match indicator when value is empty', () => {
    render(<PassphraseField {...defaultProps} value="" matchValue="test123" />);

    expect(screen.queryByText('Passphrases match')).not.toBeInTheDocument();
    expect(screen.queryByText("Passphrases don't match")).not.toBeInTheDocument();
  });

  it('provides user-visible feedback for match state', () => {
    const { rerender } = render(
      <PassphraseField {...defaultProps} value="test123" matchValue="test123" />,
    );

    expect(screen.getByText('Passphrases match')).toBeInTheDocument();

    rerender(<PassphraseField {...defaultProps} value="test123" matchValue="different" />);

    expect(screen.getByText("Passphrases don't match")).toBeInTheDocument();
  });

  it('sets placeholder correctly', () => {
    const placeholder = 'Enter your passphrase';
    render(<PassphraseField {...defaultProps} placeholder={placeholder} />);

    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
  });

  it('sets required attribute when required is true', () => {
    render(<PassphraseField {...defaultProps} required={true} />);

    expect(screen.getByDisplayValue('')).toBeRequired();
  });

  it('applies custom className', () => {
    render(<PassphraseField {...defaultProps} className="custom-class" />);

    expect(screen.getByDisplayValue('')).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<PassphraseField {...defaultProps} showStrength={true} value="test" />);

    const input = screen.getByDisplayValue('test');
    expect(input).toHaveAttribute('aria-describedby', `${defaultProps.id}-strength`);

    const toggle = screen.getByRole('button', { name: /show passphrase/i });
    expect(toggle).toHaveAttribute('aria-label', 'Show passphrase');
  });
});
