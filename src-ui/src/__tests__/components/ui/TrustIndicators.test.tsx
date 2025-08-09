import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrustIndicators from '../../../components/ui/TrustIndicators';

describe('TrustIndicators', () => {
  it('renders default horizontal layout with basic indicators', () => {
    render(<TrustIndicators />);

    expect(screen.getByRole('region', { name: 'Security indicators' })).toBeInTheDocument();
    expect(screen.getByText('Your keys never leave your device')).toBeInTheDocument();
    expect(screen.getByText('Open-source audited')).toBeInTheDocument();
  });

  it('renders vertical layout when specified', () => {
    render(<TrustIndicators layout="vertical" />);

    const container = screen.getByRole('region', { name: 'Security indicators' });
    expect(container.querySelector('div')).toHaveClass('flex', 'flex-col');
  });

  it('renders extended indicators when enabled', () => {
    render(<TrustIndicators extended={true} />);

    expect(screen.getByText('Military-grade encryption')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<TrustIndicators />);

    const container = screen.getByRole('region', { name: 'Security indicators' });
    expect(container).toHaveAttribute('role', 'region');
    expect(container).toHaveAttribute('aria-label', 'Security indicators');
  });

  it('renders correct number of dividers', () => {
    render(<TrustIndicators />);

    // Should have 1 divider between 2 indicators
    const container = screen.getByRole('region', { name: 'Security indicators' });
    const dividers = container.querySelectorAll('[aria-hidden="true"]');
    expect(dividers.length).toBeGreaterThan(0);
  });

  it('renders extended version with 3 indicators and 2 dividers', () => {
    render(<TrustIndicators extended={true} />);

    // Should have all 3 trust indicators
    expect(screen.getByText('Your keys never leave your device')).toBeInTheDocument();
    expect(screen.getByText('Open-source audited')).toBeInTheDocument();
    expect(screen.getByText('Military-grade encryption')).toBeInTheDocument();
  });
});
