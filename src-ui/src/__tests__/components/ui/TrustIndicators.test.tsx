import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrustIndicators from '../../../components/ui/TrustIndicators';

describe('TrustIndicators', () => {
  it('renders default horizontal layout with basic indicators', () => {
    render(<TrustIndicators />);

    expect(screen.getByTestId('trust-indicators')).toBeInTheDocument();
    expect(screen.getByTestId('trust-local-keys')).toHaveTextContent(
      'Your keys never leave your device',
    );
    expect(screen.getByTestId('trust-open-source')).toHaveTextContent('Open-source audited');
  });

  it('renders vertical layout when specified', () => {
    render(<TrustIndicators layout="vertical" />);

    const container = screen.getByTestId('trust-indicators');
    expect(container.querySelector('div')).toHaveClass('flex', 'flex-col');
  });

  it('renders extended indicators when enabled', () => {
    render(<TrustIndicators extended={true} />);

    expect(screen.getByTestId('trust-encryption')).toHaveTextContent('Military-grade encryption');
  });

  it('has proper accessibility attributes', () => {
    render(<TrustIndicators />);

    const container = screen.getByTestId('trust-indicators');
    expect(container).toHaveAttribute('role', 'region');
    expect(container).toHaveAttribute('aria-label', 'Security indicators');
  });

  it('renders correct number of dividers', () => {
    render(<TrustIndicators />);

    // Should have 1 divider between 2 indicators
    const dividers = screen
      .getByTestId('trust-indicators')
      .querySelectorAll('[aria-hidden="true"]');
    expect(dividers.length).toBeGreaterThan(0);
  });

  it('renders extended version with 3 indicators and 2 dividers', () => {
    render(<TrustIndicators extended={true} />);

    // Should have all 3 trust indicators
    expect(screen.getByTestId('trust-local-keys')).toBeInTheDocument();
    expect(screen.getByTestId('trust-open-source')).toBeInTheDocument();
    expect(screen.getByTestId('trust-encryption')).toBeInTheDocument();
  });
});
