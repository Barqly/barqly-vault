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

  it('renders passphrase input correctly', () => {
    render(<PassphraseField {...defaultProps} />);

    expect(screen.getByTestId('passphrase-field')).toBeInTheDocument();
    expect(screen.getByTestId('passphrase-input')).toBeInTheDocument();
    expect(screen.getByTestId('visibility-toggle')).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(<PassphraseField {...defaultProps} />);

    const input = screen.getByTestId('passphrase-input');
    const toggle = screen.getByTestId('visibility-toggle');

    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('calls onChange when input value changes', () => {
    const handleChange = vi.fn();
    render(<PassphraseField {...defaultProps} onChange={handleChange} />);

    const input = screen.getByTestId('passphrase-input');
    fireEvent.change(input, { target: { value: 'test passphrase' } });

    expect(handleChange).toHaveBeenCalledWith('test passphrase');
  });

  it('shows strength indicator when showStrength is true and value exists', () => {
    render(<PassphraseField {...defaultProps} value="test123" showStrength={true} />);

    expect(screen.getByTestId('strength-indicator')).toBeInTheDocument();
  });

  it('shows strength indicator with default state when value is empty', () => {
    render(<PassphraseField {...defaultProps} value="" showStrength={true} />);

    expect(screen.getByTestId('strength-indicator')).toBeInTheDocument();
    expect(screen.getByText('Passphrase Strength:')).toBeInTheDocument();
  });

  it('shows match indicator when matchValue is provided', () => {
    render(<PassphraseField {...defaultProps} value="test123" matchValue="test123" />);

    const matchIndicator = screen.getByTestId('match-indicator');
    expect(matchIndicator).toBeInTheDocument();
    expect(matchIndicator).toHaveTextContent('Passphrases match');
  });

  it('shows mismatch indicator when values do not match', () => {
    render(<PassphraseField {...defaultProps} value="test123" matchValue="different" />);

    const matchIndicator = screen.getByTestId('match-indicator');
    expect(matchIndicator).toHaveTextContent("Passphrases don't match");
  });

  it('does not show match indicator when value is empty', () => {
    render(<PassphraseField {...defaultProps} value="" matchValue="test123" />);

    expect(screen.queryByTestId('match-indicator')).not.toBeInTheDocument();
  });

  it('applies correct styles for match state', () => {
    const { rerender } = render(
      <PassphraseField {...defaultProps} value="test123" matchValue="test123" />,
    );

    const input = screen.getByTestId('passphrase-input');
    expect(input).toHaveClass('border-green-500');

    rerender(<PassphraseField {...defaultProps} value="test123" matchValue="different" />);

    expect(input).toHaveClass('border-red-400', 'bg-red-50');
  });

  it('sets placeholder correctly', () => {
    const placeholder = 'Enter your passphrase';
    render(<PassphraseField {...defaultProps} placeholder={placeholder} />);

    expect(screen.getByTestId('passphrase-input')).toHaveAttribute('placeholder', placeholder);
  });

  it('sets required attribute when required is true', () => {
    render(<PassphraseField {...defaultProps} required={true} />);

    expect(screen.getByTestId('passphrase-input')).toBeRequired();
  });

  it('applies custom className', () => {
    render(<PassphraseField {...defaultProps} className="custom-class" />);

    expect(screen.getByTestId('passphrase-input')).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<PassphraseField {...defaultProps} showStrength={true} value="test" />);

    const input = screen.getByTestId('passphrase-input');
    expect(input).toHaveAttribute('aria-describedby', `${defaultProps.id}-strength`);

    const toggle = screen.getByTestId('visibility-toggle');
    expect(toggle).toHaveAttribute('aria-label', 'Show passphrase');
  });
});
