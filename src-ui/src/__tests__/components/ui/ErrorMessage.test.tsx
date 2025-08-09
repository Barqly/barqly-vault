import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorMessage } from '../../../components/ui/error-message';
import { CommandError, ErrorCode } from '../../../lib/api-types';

describe('ErrorMessage', () => {
  describe('Basic Rendering', () => {
    it('should not render when no error is provided', () => {
      const { container } = render(<ErrorMessage />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when error is null', () => {
      const { container } = render(<ErrorMessage error={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render with string error', () => {
      render(<ErrorMessage error="Something went wrong" />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render with CommandError object', () => {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'Invalid input provided',
        details: 'Technical details here',
        recovery_guidance: 'Please check your input',
        user_actionable: true,
        trace_id: 'trace-123',
        span_id: 'span-456',
      };

      render(<ErrorMessage error={error} />);
      expect(screen.getByText('Invalid input provided')).toBeInTheDocument();
      expect(screen.getByText('Please check your input')).toBeInTheDocument();
      expect(screen.getByText('Invalid Input')).toBeInTheDocument(); // Formatted error code
    });
  });

  describe('Variants and Styling', () => {
    it('should apply default variant styles', () => {
      render(<ErrorMessage error="Test error" />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-destructive/10', 'border-destructive/20');
    });

    it('should apply warning variant styles', () => {
      render(<ErrorMessage error="Test error" variant="warning" />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-yellow-50', 'border-yellow-200');
    });

    it('should apply info variant styles', () => {
      render(<ErrorMessage error="Test error" variant="info" />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-blue-50', 'border-blue-200');
    });

    it('should apply security variant styles', () => {
      render(<ErrorMessage error="Test error" variant="security" />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-red-50', 'border-red-200');
    });

    it('should apply different sizes', () => {
      const { rerender } = render(<ErrorMessage error="Test error" size="sm" />);
      let alert = screen.getByRole('alert');
      expect(alert).toHaveClass('p-3', 'text-sm');

      rerender(<ErrorMessage error="Test error" size="lg" />);
      alert = screen.getByRole('alert');
      expect(alert).toHaveClass('p-6', 'text-base');
    });
  });

  describe('Automatic Variant Detection', () => {
    it('should detect security errors', () => {
      const securityError: CommandError = {
        code: ErrorCode.WRONG_PASSPHRASE,
        message: 'Wrong passphrase',
        user_actionable: true,
      };

      render(<ErrorMessage error={securityError} />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-red-50', 'border-red-200');
    });

    it('should detect warning errors', () => {
      const warningError: CommandError = {
        code: ErrorCode.WEAK_PASSPHRASE,
        message: 'Weak passphrase',
        user_actionable: true,
      };

      render(<ErrorMessage error={warningError} />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-yellow-50', 'border-yellow-200');
    });

    it('should detect info errors', () => {
      const infoError: CommandError = {
        code: ErrorCode.MISSING_PARAMETER,
        message: 'Missing parameter',
        user_actionable: true,
      };

      render(<ErrorMessage error={infoError} />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-blue-50', 'border-blue-200');
    });
  });

  describe('Icons', () => {
    it('should show default icon by default', () => {
      render(<ErrorMessage error="Test error" />);
      const alert = screen.getByRole('alert');
      const icon = alert.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    it('should hide icon when showIcon is false', () => {
      render(<ErrorMessage error="Test error" showIcon={false} />);
      const alert = screen.getByRole('alert');
      const icon = alert.querySelector('[aria-hidden="true"]');
      expect(icon).not.toBeInTheDocument();
    });

    it('should show appropriate icon for each variant', () => {
      const { rerender } = render(<ErrorMessage error="Test error" variant="warning" />);
      let alert = screen.getByRole('alert');
      let icon = alert.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();

      rerender(<ErrorMessage error="Test error" variant="info" />);
      alert = screen.getByRole('alert');
      icon = alert.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();

      rerender(<ErrorMessage error="Test error" variant="security" />);
      alert = screen.getByRole('alert');
      icon = alert.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Title and Error Code', () => {
    it('should display custom title', () => {
      render(<ErrorMessage error="Test error" title="Custom Title" />);
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should format and display error code', () => {
      const error: CommandError = {
        code: ErrorCode.INVALID_KEY_LABEL,
        message: 'Invalid key label',
        user_actionable: true,
      };

      render(<ErrorMessage error={error} />);
      expect(screen.getByText('Invalid Key Label')).toBeInTheDocument();
    });

    it('should display both title and error code', () => {
      const error: CommandError = {
        code: ErrorCode.FILE_NOT_FOUND,
        message: 'File not found',
        user_actionable: true,
      };

      render(<ErrorMessage error={error} title="File Error" />);
      expect(screen.getByText('File Error')).toBeInTheDocument();
      expect(screen.getByText('File Not Found')).toBeInTheDocument();
    });
  });

  describe('Recovery Guidance', () => {
    it('should show recovery guidance by default', () => {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'Invalid input',
        recovery_guidance: 'Please check your input',
        user_actionable: true,
      };

      render(<ErrorMessage error={error} />);
      expect(screen.getByText(/Suggestion:/)).toBeInTheDocument();
      expect(screen.getByText('Please check your input')).toBeInTheDocument();
    });

    it('should hide recovery guidance when showRecoveryGuidance is false', () => {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'Invalid input',
        recovery_guidance: 'Please check your input',
        user_actionable: true,
      };

      render(<ErrorMessage error={error} showRecoveryGuidance={false} />);
      expect(screen.queryByText(/Suggestion:/)).not.toBeInTheDocument();
    });

    it('should not show recovery guidance when none provided', () => {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'Invalid input',
        user_actionable: true,
      };

      render(<ErrorMessage error={error} />);
      expect(screen.queryByText(/Suggestion:/)).not.toBeInTheDocument();
    });
  });

  describe('Technical Details', () => {
    it('should not show technical details by default', () => {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'Invalid input',
        details: 'Technical details here',
        user_actionable: true,
      };

      render(<ErrorMessage error={error} />);
      expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
    });

    it('should show technical details when showDetails is true', () => {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'Invalid input',
        details: 'Technical details here',
        user_actionable: true,
      };

      render(<ErrorMessage error={error} showDetails={true} />);
      expect(screen.getByText('Technical Details')).toBeInTheDocument();
      expect(screen.getByText('Technical details here')).toBeInTheDocument();
    });

    it('should not show technical details when none provided', () => {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'Invalid input',
        user_actionable: true,
      };

      render(<ErrorMessage error={error} showDetails={true} />);
      expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should show retry button when onRetry is provided and error is user actionable', () => {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'Invalid input',
        user_actionable: true,
      };

      const onRetry = vi.fn();
      render(<ErrorMessage error={error} onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveTextContent('Retry');
    });

    it('should not show retry button when error is not user actionable', () => {
      const error: CommandError = {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Internal error',
        user_actionable: false,
      };

      const onRetry = vi.fn();
      render(<ErrorMessage error={error} onRetry={onRetry} />);

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'Invalid input',
        user_actionable: true,
      };

      const onRetry = vi.fn();
      render(<ErrorMessage error={error} onRetry={onRetry} />);

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should use custom retry label', () => {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'Invalid input',
        user_actionable: true,
      };

      const onRetry = vi.fn();
      render(<ErrorMessage error={error} onRetry={onRetry} retryLabel="Try Again" />);

      expect(screen.getByRole('button', { name: /try again/i })).toHaveTextContent('Try Again');
    });
  });

  describe('Close Button', () => {
    it('should not show close button by default', () => {
      render(<ErrorMessage error="Test error" />);
      expect(screen.queryByLabelText(/close/i)).not.toBeInTheDocument();
    });

    it('should show close button when showCloseButton is true and onClose is provided', () => {
      const onClose = vi.fn();
      render(<ErrorMessage error="Test error" showCloseButton={true} onClose={onClose} />);

      expect(screen.getByLabelText('Close error message')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<ErrorMessage error="Test error" showCloseButton={true} onClose={onClose} />);

      fireEvent.click(screen.getByLabelText('Close error message'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should have proper aria-label for close button', () => {
      const onClose = vi.fn();
      render(<ErrorMessage error="Test error" showCloseButton={true} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close error message');
      expect(closeButton).toHaveAttribute('aria-label', 'Close error message');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ErrorMessage error="Test error" />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('should be focusable when close button is present', () => {
      const onClose = vi.fn();
      render(<ErrorMessage error="Test error" showCloseButton={true} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close error message');
      expect(closeButton).toHaveAttribute('type', 'button');
    });

    it('should have proper focus management for retry button', () => {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'Invalid input',
        user_actionable: true,
      };

      const onRetry = vi.fn();
      render(<ErrorMessage error={error} onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Error Code Formatting', () => {
    it('should format error codes correctly', () => {
      const testCases = [
        { code: ErrorCode.INVALID_INPUT, expected: 'Invalid Input' },
        { code: ErrorCode.MISSING_PARAMETER, expected: 'Missing Parameter' },
        { code: ErrorCode.FILE_NOT_FOUND, expected: 'File Not Found' },
        { code: ErrorCode.WRONG_PASSPHRASE, expected: 'Wrong Passphrase' },
      ];

      testCases.forEach(({ code, expected }) => {
        const error: CommandError = {
          code,
          message: 'Test error',
          user_actionable: true,
        };

        const { unmount } = render(<ErrorMessage error={error} />);
        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Integration with String Errors', () => {
    it('should handle string errors gracefully', () => {
      render(<ErrorMessage error="Simple string error" />);
      expect(screen.getByText('Simple string error')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should not show error code for string errors', () => {
      render(<ErrorMessage error="String error" />);
      // Should not show formatted error codes (like "Invalid Input", "File Not Found", etc.)
      expect(
        screen.queryByText(/^(Invalid|Missing|File|Wrong|Internal|Unexpected|Configuration)/),
      ).not.toBeInTheDocument();
    });

    it('should not show recovery guidance for string errors', () => {
      render(<ErrorMessage error="String error" />);
      expect(screen.queryByText(/Suggestion:/)).not.toBeInTheDocument();
    });
  });
});
