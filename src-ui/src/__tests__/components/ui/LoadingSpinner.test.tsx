import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

describe('LoadingSpinner', () => {
  describe('Basic Rendering', () => {
    it('renders loading spinner with default props', () => {
      render(<LoadingSpinner />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('h-6', 'w-6', 'animate-spin');
    });

    it('renders with custom className', () => {
      render(<LoadingSpinner className="custom-class" />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('custom-class');
    });

    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(<LoadingSpinner ref={ref} />);

      expect(ref).toHaveBeenCalled();
    });
  });

  describe('Size Variants', () => {
    it('renders xs size correctly', () => {
      render(<LoadingSpinner size="xs" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('h-3', 'w-3');
    });

    it('renders sm size correctly', () => {
      render(<LoadingSpinner size="sm" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('h-4', 'w-4');
    });

    it('renders md size correctly', () => {
      render(<LoadingSpinner size="md" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('h-6', 'w-6');
    });

    it('renders lg size correctly', () => {
      render(<LoadingSpinner size="lg" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('h-8', 'w-8');
    });

    it('renders xl size correctly', () => {
      render(<LoadingSpinner size="xl" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('h-12', 'w-12');
    });
  });

  describe('Animation Variants', () => {
    it('renders spin animation correctly', () => {
      render(<LoadingSpinner animation="spin" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('renders pulse animation correctly', () => {
      render(<LoadingSpinner animation="pulse" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('animate-pulse');
    });

    it('renders bounce animation correctly', () => {
      render(<LoadingSpinner animation="bounce" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('animate-bounce');
    });

    it('renders wave animation correctly', () => {
      render(<LoadingSpinner animation="wave" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('animate-pulse');
    });
  });

  describe('Color Variants', () => {
    it('renders default variant correctly', () => {
      render(<LoadingSpinner variant="default" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('text-primary');
    });

    it('renders muted variant correctly', () => {
      render(<LoadingSpinner variant="muted" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('text-muted-foreground');
    });

    it('renders white variant correctly', () => {
      render(<LoadingSpinner variant="white" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('text-white');
    });

    it('renders blue variant correctly', () => {
      render(<LoadingSpinner variant="blue" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('text-blue-600');
    });

    it('renders green variant correctly', () => {
      render(<LoadingSpinner variant="green" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('text-green-600');
    });

    it('renders red variant correctly', () => {
      render(<LoadingSpinner variant="red" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('text-red-600');
    });
  });

  describe('Text Display', () => {
    it('does not show text by default', () => {
      render(<LoadingSpinner text="Loading..." />);

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('shows text when showText is true', () => {
      render(<LoadingSpinner text="Loading..." showText />);

      const text = screen.getByText('Loading...');
      expect(text).toBeInTheDocument();
    });

    it('hides text when showText is false', () => {
      render(<LoadingSpinner text="Loading..." showText={false} />);

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('hides text when no text is provided', () => {
      render(<LoadingSpinner showText />);

      const status = screen.getByRole('status');
      const textElement = status.querySelector('span');
      expect(textElement).not.toBeInTheDocument();
    });

    it('applies correct text size based on spinner size', () => {
      render(<LoadingSpinner size="lg" text="Loading..." showText />);

      const text = screen.getByText('Loading...');
      expect(text).toHaveClass('text-base');
    });
  });

  describe('Layout Options', () => {
    it('renders inline by default', () => {
      render(<LoadingSpinner />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('inline-flex');
      expect(container).not.toHaveClass('justify-center', 'w-full', 'h-full');
    });

    it('renders centered when centered prop is true', () => {
      render(<LoadingSpinner centered />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('justify-center', 'w-full', 'h-full');
    });

    it('renders full screen when fullScreen prop is true', () => {
      render(<LoadingSpinner fullScreen />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass(
        'fixed',
        'inset-0',
        'z-50',
        'bg-background/80',
        'backdrop-blur-sm',
        'justify-center',
        'w-full',
        'h-full',
      );
    });

    it('renders overlay when overlay prop is true', () => {
      render(<LoadingSpinner overlay />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('absolute', 'inset-0', 'z-10', 'bg-background/50');
    });

    it('prioritizes fullScreen over overlay', () => {
      render(<LoadingSpinner fullScreen overlay />);

      const container = screen.getByRole('status');
      expect(container).toHaveClass('fixed', 'inset-0', 'z-50');
      expect(container).not.toHaveClass('absolute', 'z-10');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<LoadingSpinner text="Loading files..." showText />);

      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-live', 'polite');
      expect(container).toHaveAttribute('aria-label', 'Loading files...');
    });

    it('uses default aria-label when no text provided', () => {
      render(<LoadingSpinner />);

      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-label', 'Loading');
    });

    it('has correct role', () => {
      render(<LoadingSpinner />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Auto-hide Functionality', () => {
    it('does not auto-hide when fullScreen is true', () => {
      render(<LoadingSpinner text="Loading..." showText fullScreen />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });

    it('does not auto-hide when showText is false', () => {
      render(<LoadingSpinner text="Loading..." showText={false} />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });

    it('does not auto-hide when no text is provided', () => {
      render(<LoadingSpinner showText />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Completion Callback', () => {
    it('does not call onComplete when component remains visible', () => {
      const onComplete = vi.fn();

      render(<LoadingSpinner onComplete={onComplete} />);

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('renders button-sized loading spinner', () => {
      render(<LoadingSpinner size="sm" variant="white" />);

      const status = screen.getByRole('status');
      const spinner = status.querySelector('svg');
      expect(spinner).toHaveClass('h-4', 'w-4', 'text-white');
    });

    it('renders page loading spinner', () => {
      render(<LoadingSpinner size="xl" text="Loading application..." showText centered />);

      const container = screen.getByRole('status');
      const spinner = container.querySelector('svg');
      const text = screen.getByText('Loading application...');

      expect(container).toHaveClass('justify-center', 'w-full', 'h-full');
      expect(spinner).toHaveClass('h-12', 'w-12');
      expect(text).toHaveTextContent('Loading application...');
    });

    it('renders overlay loading spinner', () => {
      render(<LoadingSpinner size="lg" text="Processing..." showText overlay variant="blue" />);

      const container = screen.getByRole('status');
      const spinner = container.querySelector('svg');
      const text = screen.getByText('Processing...');

      expect(container).toHaveClass('absolute', 'inset-0', 'z-10');
      expect(spinner).toHaveClass('h-8', 'w-8', 'text-blue-600');
      expect(text).toHaveTextContent('Processing...');
    });
  });
});
