import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PassphraseStrengthIndicator from '../../../components/forms/PassphraseStrengthIndicator';
import { type PassphraseStrength } from '../../../lib/validation';

describe('PassphraseStrengthIndicator', () => {
  const mockStrength: PassphraseStrength = {
    isStrong: true,
    message: 'Strong passphrase',
    score: 12,
  };

  const mockWeakStrength: PassphraseStrength = {
    isStrong: false,
    message: 'Too short (5/12 characters)',
    score: 4,
  };

  it('should show no message when user has not typed', () => {
    render(<PassphraseStrengthIndicator strength={mockStrength} hasUserTyped={false} />);

    expect(screen.queryByText('Strong passphrase')).not.toBeInTheDocument();
    expect(screen.queryByText('Too short')).not.toBeInTheDocument();
  });

  it('should show strength message when user has typed', () => {
    render(<PassphraseStrengthIndicator strength={mockStrength} hasUserTyped={true} />);

    expect(screen.getByText('Strong passphrase')).toBeInTheDocument();
  });

  it('should show green styling for strong passphrase', () => {
    render(<PassphraseStrengthIndicator strength={mockStrength} hasUserTyped={true} />);

    const strengthText = screen.getByText('Strong passphrase');
    expect(strengthText).toHaveClass('text-green-600');
  });

  it('should show red styling for weak passphrase', () => {
    render(<PassphraseStrengthIndicator strength={mockWeakStrength} hasUserTyped={true} />);

    const strengthText = screen.getByText('Too short');
    expect(strengthText).toHaveClass('text-red-600');
  });

  it('should render progress bar when user has typed', () => {
    render(<PassphraseStrengthIndicator strength={mockStrength} hasUserTyped={true} />);

    // Look for the progress bar by its new characteristic classes
    const progressContainer = document.querySelector('.h-1\\.5.w-full.rounded-full.bg-slate-200');
    expect(progressContainer).toBeInTheDocument();
  });

  it('should not render progress bar when user has not typed', () => {
    render(<PassphraseStrengthIndicator strength={mockStrength} hasUserTyped={false} />);

    // Progress bar should not be present
    const progressContainer = document.querySelector('.h-1\\.5.w-full.rounded-full.bg-slate-200');
    expect(progressContainer).not.toBeInTheDocument();
  });
});
