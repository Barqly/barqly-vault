import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProgressBar } from '../../../components/ui/progress-bar';
import { ProgressUpdate } from '../../../lib/api-types';

// Mock the utils module
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
}));

describe('ProgressBar', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<ProgressBar />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('renders with custom value', () => {
      render(<ProgressBar value={0.5} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('renders with custom className', () => {
      render(<ProgressBar className="custom-class" />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('custom-class');
    });
  });

  describe('Determinate Mode', () => {
    it('shows percentage when showPercentage is true', () => {
      render(<ProgressBar value={0.75} showPercentage />);

      expect(screen.getByText(/75%/)).toBeInTheDocument();
    });

    it('hides percentage when showPercentage is false', () => {
      render(<ProgressBar value={0.75} showPercentage={false} />);

      expect(screen.queryByText('75%')).not.toBeInTheDocument();
    });

    it('shows status message when showStatus is true', () => {
      render(<ProgressBar value={0.5} showStatus />);

      expect(screen.getByText('In progress...')).toBeInTheDocument();
    });

    it('hides status when showStatus is false', () => {
      render(<ProgressBar value={0.5} showStatus={false} />);

      expect(screen.queryByText('In progress...')).not.toBeInTheDocument();
    });

    it('shows custom status message', () => {
      render(<ProgressBar value={0.5} statusMessage="Custom message" />);

      expect(screen.getByText('Custom message')).toBeInTheDocument();
    });

    it('shows complete status when value is 1.0', () => {
      render(<ProgressBar value={1.0} />);

      expect(screen.getByText('Complete')).toBeInTheDocument();
      // Check for success icon by looking for SVG with check appearance
      const statusElement = screen.getByText('Complete').parentElement;
      const icon = statusElement?.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-green-500');
    });

    it('clamps value between 0 and 1', () => {
      render(<ProgressBar value={1.5} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  describe('Indeterminate Mode', () => {
    it('renders indeterminate progress when indeterminate is true', () => {
      render(<ProgressBar indeterminate />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).not.toHaveAttribute('aria-valuenow');
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('shows loading spinner in indeterminate mode', () => {
      render(<ProgressBar indeterminate />);

      // Check for loading spinner by looking for SVG with animate-spin class
      const statusElement = screen.getByText('Processing...').parentElement;
      const spinner = statusElement?.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('hides percentage in indeterminate mode', () => {
      render(<ProgressBar indeterminate showPercentage />);

      expect(screen.queryByText('0%')).not.toBeInTheDocument();
    });
  });

  describe('Time Remaining', () => {
    it('shows time remaining in seconds', () => {
      render(<ProgressBar value={0.5} estimatedTimeRemaining={30} />);

      expect(screen.getByText('30s remaining')).toBeInTheDocument();
    });

    it('shows time remaining in minutes', () => {
      render(<ProgressBar value={0.5} estimatedTimeRemaining={120} />);

      expect(screen.getByText('2m remaining')).toBeInTheDocument();
    });

    it('shows time remaining in hours', () => {
      render(<ProgressBar value={0.5} estimatedTimeRemaining={7200} />);

      expect(screen.getByText('2h remaining')).toBeInTheDocument();
    });

    it('does not show time remaining when not provided', () => {
      render(<ProgressBar value={0.5} />);

      expect(screen.queryByText(/remaining/)).not.toBeInTheDocument();
    });
  });

  describe('Progress Update Integration', () => {
    const mockProgressUpdate: ProgressUpdate = {
      operation_id: 'test-op-123',
      progress: 0.6,
      message: 'Encrypting files...',
      timestamp: '2024-01-01T00:00:00Z',
      estimated_time_remaining: 45,
      details: {
        type: 'FileOperation',
        current_file: 'wallet.dat',
        total_files: 5,
        current_file_progress: 3,
        current_file_size: 1024,
        total_size: 5120,
      },
    };

    it('uses progress update data when provided', () => {
      render(<ProgressBar progressUpdate={mockProgressUpdate} />);

      expect(screen.getByText('Encrypting files...')).toBeInTheDocument();
      expect(screen.getByText('45s remaining')).toBeInTheDocument();
      expect(screen.getByText(/60%/)).toBeInTheDocument();
    });

    it('shows file operation details', () => {
      render(<ProgressBar progressUpdate={mockProgressUpdate} />);

      expect(screen.getByText('File 3 of 5')).toBeInTheDocument();
      expect(screen.getByText('wallet.dat')).toBeInTheDocument();
    });

    it('shows encryption details', () => {
      const encryptionUpdate: ProgressUpdate = {
        ...mockProgressUpdate,
        details: {
          type: 'Encryption',
          bytes_processed: 1024 * 1024, // 1MB
          total_bytes: 5 * 1024 * 1024, // 5MB
          encryption_rate: 1024 * 1024, // 1MB/s
        },
      };

      render(<ProgressBar progressUpdate={encryptionUpdate} />);

      expect(screen.getByText('Encrypting...')).toBeInTheDocument();
      const elements = screen.getAllByText((_content: string, element: Element | null) => {
        return !!(element?.textContent?.includes('1MB') && element?.textContent?.includes('5MB'));
      });
      expect(elements.length).toBeGreaterThan(0);
    });

    it('shows decryption details', () => {
      const decryptionUpdate: ProgressUpdate = {
        ...mockProgressUpdate,
        details: {
          type: 'Decryption',
          bytes_processed: 2 * 1024 * 1024, // 2MB
          total_bytes: 10 * 1024 * 1024, // 10MB
          decryption_rate: 1024 * 1024, // 1MB/s
        },
      };

      render(<ProgressBar progressUpdate={decryptionUpdate} />);

      expect(screen.getByText('Decrypting...')).toBeInTheDocument();
      const elements = screen.getAllByText((_content: string, element: Element | null) => {
        return !!(element?.textContent?.includes('2MB') && element?.textContent?.includes('10MB'));
      });
      expect(elements.length).toBeGreaterThan(0);
    });

    it('shows success variant when progress is complete', () => {
      const completeUpdate: ProgressUpdate = {
        ...mockProgressUpdate,
        progress: 1.0,
        message: 'Encryption complete',
      };

      render(<ProgressBar progressUpdate={completeUpdate} />);

      expect(screen.getByText('Encryption complete')).toBeInTheDocument();
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders with default size', () => {
      render(<ProgressBar />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.firstElementChild).toHaveClass('h-2');
    });

    it('renders with small size', () => {
      render(<ProgressBar size="sm" />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.firstElementChild).toHaveClass('h-1');
    });

    it('renders with large size', () => {
      render(<ProgressBar size="lg" />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.firstElementChild).toHaveClass('h-3');
    });
  });

  describe('Variant Colors', () => {
    it('renders with default variant', () => {
      render(<ProgressBar value={0.5} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.firstElementChild).toHaveClass('bg-secondary');
    });

    it('renders with success variant', () => {
      render(<ProgressBar value={1.0} variant="success" />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.firstElementChild).toHaveClass('bg-green-100');
    });

    it('renders with error variant', () => {
      render(<ProgressBar value={0.5} variant="error" />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.firstElementChild).toHaveClass('bg-red-100');
    });

    it('renders with warning variant', () => {
      render(<ProgressBar value={0.5} variant="warning" />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.firstElementChild).toHaveClass('bg-yellow-100');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for determinate progress', () => {
      render(<ProgressBar value={0.75} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'In progress...');
    });

    it('has proper ARIA attributes for indeterminate progress', () => {
      render(<ProgressBar indeterminate />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).not.toHaveAttribute('aria-valuenow');
      expect(progressBar).toHaveAttribute('aria-label', 'Processing...');
    });

    it('has proper ARIA attributes with custom status message', () => {
      render(<ProgressBar value={0.5} statusMessage="Custom status" />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Custom status');
    });
  });

  describe('Callback Functions', () => {
    it('calls onComplete when progress reaches 100%', () => {
      const onComplete = vi.fn();
      render(<ProgressBar value={1.0} onComplete={onComplete} />);

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('does not call onComplete when progress is less than 100%', () => {
      const onComplete = vi.fn();
      render(<ProgressBar value={0.5} onComplete={onComplete} />);

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('does not call onComplete when not provided', () => {
      render(<ProgressBar value={1.0} />);
      // Should not throw any errors
      expect(true).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles negative values', () => {
      render(<ProgressBar value={-0.5} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('handles values greater than 1', () => {
      render(<ProgressBar value={1.5} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('handles undefined value', () => {
      render(<ProgressBar />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('handles empty progress update', () => {
      render(<ProgressBar progressUpdate={{} as ProgressUpdate} />);

      expect(screen.getByText('In progress...')).toBeInTheDocument();
    });
  });
});
