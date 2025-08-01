import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PrimaryButton from '../../../components/ui/PrimaryButton';

describe('PrimaryButton', () => {
  it('renders children correctly', () => {
    render(<PrimaryButton>Click me</PrimaryButton>);

    expect(screen.getByTestId('button-text')).toHaveTextContent('Click me');
  });

  it('shows loading state when loading prop is true', () => {
    render(<PrimaryButton loading={true}>Submit</PrimaryButton>);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('loading-text')).toHaveTextContent('Processing...');
    expect(screen.queryByTestId('button-text')).not.toBeInTheDocument();
  });

  it('shows custom loading text', () => {
    render(
      <PrimaryButton loading={true} loadingText="Creating key...">
        Submit
      </PrimaryButton>,
    );

    expect(screen.getByTestId('loading-text')).toHaveTextContent('Creating key...');
  });

  it('handles onClick events when not disabled', () => {
    const handleClick = vi.fn();
    render(<PrimaryButton onClick={handleClick}>Click me</PrimaryButton>);

    fireEvent.click(screen.getByTestId('primary-button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not handle onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <PrimaryButton disabled onClick={handleClick}>
        Click me
      </PrimaryButton>,
    );

    fireEvent.click(screen.getByTestId('primary-button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not handle onClick when loading', () => {
    const handleClick = vi.fn();
    render(
      <PrimaryButton loading onClick={handleClick}>
        Click me
      </PrimaryButton>,
    );

    fireEvent.click(screen.getByTestId('primary-button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows arrow icon by default', () => {
    render(<PrimaryButton>Submit</PrimaryButton>);

    expect(screen.getByTestId('arrow-icon')).toBeInTheDocument();
  });

  it('hides arrow icon when showIcon is false', () => {
    render(<PrimaryButton showIcon={false}>Submit</PrimaryButton>);

    expect(screen.queryByTestId('arrow-icon')).not.toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<PrimaryButton size="small">Small</PrimaryButton>);
    expect(screen.getByTestId('primary-button')).toHaveClass('h-10');

    rerender(<PrimaryButton size="default">Default</PrimaryButton>);
    expect(screen.getByTestId('primary-button')).toHaveClass('h-12');

    rerender(<PrimaryButton size="large">Large</PrimaryButton>);
    expect(screen.getByTestId('primary-button')).toHaveClass('h-14');
  });

  it('applies full width when specified', () => {
    render(<PrimaryButton fullWidth>Full width</PrimaryButton>);

    expect(screen.getByTestId('primary-button')).toHaveClass('w-full');
  });

  it('is disabled when disabled prop is true', () => {
    render(<PrimaryButton disabled>Disabled</PrimaryButton>);

    expect(screen.getByTestId('primary-button')).toBeDisabled();
  });

  it('is disabled when loading', () => {
    render(<PrimaryButton loading>Loading</PrimaryButton>);

    expect(screen.getByTestId('primary-button')).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<PrimaryButton className="custom-class">Custom</PrimaryButton>);

    expect(screen.getByTestId('primary-button')).toHaveClass('custom-class');
  });
});
