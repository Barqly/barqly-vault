import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SuccessMessage } from '@/components/ui/success-message';
import { Copy, Download } from 'lucide-react';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('SuccessMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with title and message', () => {
      render(
        <SuccessMessage
          title="Operation Complete"
          message="Your files have been encrypted successfully."
        />,
      );

      expect(screen.getByText('Operation Complete')).toBeInTheDocument();
      expect(screen.getByText('Your files have been encrypted successfully.')).toBeInTheDocument();
      // Check for success icon by looking for SVG within the status role
      const status = screen.getByRole('status');
      const icon = status.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    it('should render without icon when showIcon is false', () => {
      render(<SuccessMessage title="Success" message="Operation completed" showIcon={false} />);

      const status = screen.getByRole('status');
      const icon = status.querySelector('svg[aria-hidden="true"]');
      expect(icon).not.toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <SuccessMessage title="Success" message="Operation completed" className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Variants and Sizes', () => {
    it('should render with default variant', () => {
      const { container } = render(
        <SuccessMessage title="Success" message="Operation completed" />,
      );

      expect(container.firstChild).toHaveClass('bg-green-50', 'border-green-200');
    });

    it('should render with info variant', () => {
      const { container } = render(
        <SuccessMessage title="Info" message="Information message" variant="info" />,
      );

      expect(container.firstChild).toHaveClass('bg-blue-50', 'border-blue-200');
    });

    it('should render with warning variant', () => {
      const { container } = render(
        <SuccessMessage title="Warning" message="Warning message" variant="warning" />,
      );

      expect(container.firstChild).toHaveClass('bg-yellow-50', 'border-yellow-200');
    });

    it('should render with small size', () => {
      const { container } = render(
        <SuccessMessage title="Success" message="Operation completed" size="sm" />,
      );

      expect(container.firstChild).toHaveClass('p-3', 'text-sm');
    });

    it('should render with large size', () => {
      const { container } = render(
        <SuccessMessage title="Success" message="Operation completed" size="lg" />,
      );

      expect(container.firstChild).toHaveClass('p-6', 'text-base');
    });
  });

  describe('Close Button', () => {
    it('should render close button when showCloseButton is true', () => {
      const onClose = vi.fn();
      render(
        <SuccessMessage
          title="Success"
          message="Operation completed"
          showCloseButton
          onClose={onClose}
        />,
      );

      const closeButton = screen.getByLabelText('Close success message');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close success message');
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(
        <SuccessMessage
          title="Success"
          message="Operation completed"
          showCloseButton
          onClose={onClose}
        />,
      );

      fireEvent.click(screen.getByLabelText('Close success message'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not render close button when showCloseButton is false', () => {
      render(
        <SuccessMessage title="Success" message="Operation completed" showCloseButton={false} />,
      );

      expect(screen.queryByLabelText('Close success message')).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should render action buttons', () => {
      const mockAction = vi.fn();
      const actions = [
        {
          label: 'Copy Key',
          action: mockAction,
          icon: Copy,
          variant: 'primary' as const,
        },
        {
          label: 'Download',
          action: vi.fn(),
          icon: Download,
          variant: 'secondary' as const,
        },
      ];

      render(<SuccessMessage title="Success" message="Operation completed" actions={actions} />);

      expect(screen.getByText('Copy Key')).toBeInTheDocument();
      expect(screen.getByText('Download')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copy key/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    });

    it('should call action when button is clicked', () => {
      const mockAction = vi.fn();
      const actions = [
        {
          label: 'Copy Key',
          action: mockAction,
          icon: Copy,
        },
      ];

      render(<SuccessMessage title="Success" message="Operation completed" actions={actions} />);

      fireEvent.click(screen.getByText('Copy Key'));
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should render actions with different variants', () => {
      const actions = [
        {
          label: 'Primary',
          action: vi.fn(),
          variant: 'primary' as const,
        },
        {
          label: 'Secondary',
          action: vi.fn(),
          variant: 'secondary' as const,
        },
        {
          label: 'Outline',
          action: vi.fn(),
          variant: 'outline' as const,
        },
      ];

      render(<SuccessMessage title="Success" message="Operation completed" actions={actions} />);

      const primaryButton = screen.getByText('Primary').closest('button');
      const secondaryButton = screen.getByText('Secondary').closest('button');
      const outlineButton = screen.getByText('Outline').closest('button');

      expect(primaryButton).toHaveClass('bg-green-600', 'text-white');
      expect(secondaryButton).toHaveClass('bg-green-100', 'text-green-800');
      expect(outlineButton).toHaveClass('border', 'border-green-300');
    });
  });

  describe('Details', () => {
    it('should render details when showDetails is true', () => {
      const details = (
        <div data-testid="details-content">
          <p>Technical details here</p>
        </div>
      );

      render(
        <SuccessMessage
          title="Success"
          message="Operation completed"
          details={details}
          showDetails
        />,
      );

      expect(screen.getByTestId('details-content')).toBeInTheDocument();
    });

    it('should not render details when showDetails is false', () => {
      const details = (
        <div data-testid="details-content">
          <p>Technical details here</p>
        </div>
      );

      render(
        <SuccessMessage
          title="Success"
          message="Operation completed"
          details={details}
          showDetails={false}
        />,
      );

      expect(screen.queryByTestId('details-content')).not.toBeInTheDocument();
    });
  });

  describe('Auto-hide Functionality', () => {
    it('should not auto-hide when autoHide is false', () => {
      const onClose = vi.fn();
      render(
        <SuccessMessage
          title="Success"
          message="Operation completed"
          autoHide={false}
          autoHideDelay={1000}
          onClose={onClose}
        />,
      );

      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should render with autoHide prop', () => {
      render(
        <SuccessMessage
          title="Success"
          message="Operation completed"
          autoHide
          autoHideDelay={5000}
        />,
      );

      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<SuccessMessage title="Success" message="Operation completed" />);

      const message = screen.getByRole('status');
      expect(message).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper focus management for close button', () => {
      const onClose = vi.fn();
      render(
        <SuccessMessage
          title="Success"
          message="Operation completed"
          showCloseButton
          onClose={onClose}
        />,
      );

      const closeButton = screen.getByLabelText('Close success message');
      expect(closeButton).toHaveAttribute('aria-label', 'Close success message');
      expect(closeButton).toHaveAttribute('type', 'button');
    });

    it('should have proper focus management for action buttons', () => {
      const actions = [
        {
          label: 'Copy Key',
          action: vi.fn(),
          icon: Copy,
        },
      ];

      render(<SuccessMessage title="Success" message="Operation completed" actions={actions} />);

      const actionButton = screen.getByRole('button', { name: /copy key/i });
      expect(actionButton).toHaveAttribute('type', 'button');
      expect(actionButton).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });

  describe('Integration with Helper Functions', () => {
    it('should handle copy to clipboard', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const actions = [
        {
          label: 'Copy',
          action: () => navigator.clipboard.writeText('test-text'),
        },
      ];

      render(<SuccessMessage title="Success" message="Operation completed" actions={actions} />);

      fireEvent.click(screen.getByText('Copy'));
      expect(mockWriteText).toHaveBeenCalledWith('test-text');
    });

    it('should handle clipboard errors gracefully', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const actions = [
        {
          label: 'Copy',
          action: async () => {
            try {
              await navigator.clipboard.writeText('test-text');
            } catch (err) {
              console.error('Failed to copy to clipboard:', err);
            }
          },
        },
      ];

      render(<SuccessMessage title="Success" message="Operation completed" actions={actions} />);

      fireEvent.click(screen.getByText('Copy'));
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to copy to clipboard:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });
});
