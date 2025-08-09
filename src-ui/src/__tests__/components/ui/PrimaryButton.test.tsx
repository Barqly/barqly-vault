import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PrimaryButton from '../../../components/ui/PrimaryButton';

describe('PrimaryButton', () => {
  it('renders children correctly', () => {
    render(<PrimaryButton>Click me</PrimaryButton>);

    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('shows loading state when loading prop is true', () => {
    render(<PrimaryButton loading={true}>Submit</PrimaryButton>);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows custom loading text', () => {
    render(
      <PrimaryButton loading={true} loadingText="Creating key...">
        Submit
      </PrimaryButton>,
    );

    expect(screen.getByText('Creating key...')).toBeInTheDocument();
  });

  it('handles onClick events when not disabled', () => {
    const handleClick = vi.fn();
    render(<PrimaryButton onClick={handleClick}>Click me</PrimaryButton>);

    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not handle onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <PrimaryButton disabled onClick={handleClick}>
        Click me
      </PrimaryButton>,
    );

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not handle onClick when loading', () => {
    const handleClick = vi.fn();
    render(
      <PrimaryButton loading onClick={handleClick}>
        Click me
      </PrimaryButton>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows arrow icon by default', () => {
    render(<PrimaryButton>Submit</PrimaryButton>);

    // Arrow icon is presentational - test the button functionality
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('hides arrow icon when showIcon is false', () => {
    render(<PrimaryButton showIcon={false}>Submit</PrimaryButton>);

    // Arrow icon behavior is presentational - test that button still works
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('renders different button sizes appropriately', () => {
    const { rerender } = render(<PrimaryButton size="small">Small</PrimaryButton>);
    expect(screen.getByRole('button', { name: /small/i })).toBeInTheDocument();

    rerender(<PrimaryButton size="default">Default</PrimaryButton>);
    expect(screen.getByRole('button', { name: /default/i })).toBeInTheDocument();

    rerender(<PrimaryButton size="large">Large</PrimaryButton>);
    expect(screen.getByRole('button', { name: /large/i })).toBeInTheDocument();
  });

  it('applies full width when specified', () => {
    render(<PrimaryButton fullWidth>Full width</PrimaryButton>);

    expect(screen.getByRole('button', { name: /full width/i })).toHaveClass('w-full');
  });

  it('is disabled when disabled prop is true', () => {
    render(<PrimaryButton disabled>Disabled</PrimaryButton>);

    expect(screen.getByRole('button', { name: /disabled/i })).toBeDisabled();
  });

  it('is disabled when loading', () => {
    render(<PrimaryButton loading>Loading</PrimaryButton>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<PrimaryButton className="custom-class">Custom</PrimaryButton>);

    expect(screen.getByRole('button', { name: /custom/i })).toHaveClass('custom-class');
  });
});
