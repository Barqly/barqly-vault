import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DecryptProgress from '../../../components/decrypt/DecryptProgress';
import { ProgressUpdate } from '../../../lib/api-types';

describe('DecryptProgress', () => {
  const createProgress = (value: number, message?: string): ProgressUpdate => ({
    operation_id: 'test-op-id',
    progress: value,
    message: message || `Progress: ${value}%`,
    timestamp: new Date().toISOString(),
  });

  describe('User Experience During Decryption', () => {
    it('should inform users about all decryption phases', () => {
      const progress = createProgress(0, 'Starting decryption...');
      render(<DecryptProgress progress={progress} />);

      // Users should see what phases the decryption process involves
      expect(screen.getByText('Validating vault integrity')).toBeInTheDocument();
      expect(screen.getByText('Verifying passphrase')).toBeInTheDocument();
      expect(screen.getByText('Decrypting files')).toBeInTheDocument();
      expect(screen.getByText('Extracting and preserving structure')).toBeInTheDocument();
      expect(screen.getByText('Finalizing recovery')).toBeInTheDocument();
    });

    it('should show users which phase is currently active in early stages', () => {
      const progress = createProgress(5, 'Validating vault...');
      render(<DecryptProgress progress={progress} />);

      // During early stages, users should see validation is the active phase
      const validationPhase = screen.getByText('Validating vault integrity');
      expect(validationPhase.closest('div')).toHaveClass('text-blue-600');
    });

    it('should show users when decryption phase is active', () => {
      const progress = createProgress(45, 'Decrypting data...');
      render(<DecryptProgress progress={progress} />);

      // During main decryption, users should see this phase highlighted
      const decryptionPhase = screen.getByText('Decrypting files');
      expect(decryptionPhase.closest('div')).toHaveClass('text-blue-600');
    });

    it('should indicate to users when phases are completed', () => {
      const progress = createProgress(75, 'Extracting...');
      render(<DecryptProgress progress={progress} />);

      // Users should see visual confirmation that earlier phases completed successfully
      const completedPhases = [
        screen.getByText('Validating vault integrity'),
        screen.getByText('Verifying passphrase'),
        screen.getByText('Decrypting files'),
      ];

      completedPhases.forEach((phase) => {
        expect(phase.closest('div')).toHaveClass('text-green-600');
      });
    });
  });

  describe('Progress Communication', () => {
    it('should provide accessible progress information for screen readers', () => {
      const progress = createProgress(42, 'Processing...');
      render(<DecryptProgress progress={progress} />);

      // Users with assistive technology should receive progress information
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '42');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should display status messages to keep users informed', () => {
      const progress = createProgress(30, 'Decrypting your important files...');
      render(<DecryptProgress progress={progress} />);

      // Users should see what's currently happening
      expect(screen.getByText('Decrypting your important files...')).toBeInTheDocument();
    });

    it('should help users estimate how much time is left', () => {
      const progress = createProgress(60);
      render(<DecryptProgress progress={progress} />);

      // Users should see time estimates to manage expectations
      expect(screen.getByText(/About 12 seconds remaining/)).toBeInTheDocument();
    });

    it('should not show confusing time estimates when complete', () => {
      const progress = createProgress(100);
      render(<DecryptProgress progress={progress} />);

      // Users shouldn't see "time remaining" when the process is done
      expect(screen.queryByText(/seconds remaining/)).not.toBeInTheDocument();
    });
  });

  describe('User Control Options', () => {
    it('should allow users to cancel during early decryption stages', () => {
      const onCancel = vi.fn();
      const progress = createProgress(45);
      render(<DecryptProgress progress={progress} onCancel={onCancel} />);

      // Users should be able to cancel if they change their mind
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should prevent cancellation when decryption is nearly complete', () => {
      const onCancel = vi.fn();
      const progress = createProgress(92);
      render(<DecryptProgress progress={progress} onCancel={onCancel} />);

      // Users shouldn't be able to cancel when process is almost done (data integrity)
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('should not show cancel option when cancellation is not available', () => {
      const progress = createProgress(45);
      render(<DecryptProgress progress={progress} />);

      // No cancel button should appear if cancellation isn't supported
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('should respond when user attempts to cancel', () => {
      const onCancel = vi.fn();
      const progress = createProgress(45);
      render(<DecryptProgress progress={progress} onCancel={onCancel} />);

      // User's cancel action should be handled
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Reassurance and Guidance', () => {
    it('should clearly communicate what is happening to users', () => {
      const progress = createProgress(50);
      render(<DecryptProgress progress={progress} />);

      // Users should understand what process is running
      expect(screen.getByText('Decrypting Your Vault')).toBeInTheDocument();
    });

    it('should reassure users about the process', () => {
      const progress = createProgress(50);
      render(<DecryptProgress progress={progress} />);

      // Users should feel confident the process is secure and will complete
      expect(screen.getByText(/Your files are being securely recovered/)).toBeInTheDocument();
      expect(screen.getByText(/typically takes under 60 seconds/)).toBeInTheDocument();
    });

    it('should provide visual feedback that work is actively happening', () => {
      const progress = createProgress(35);
      render(<DecryptProgress progress={progress} />);

      // Users should see visual indicators that the system is actively working
      const activePhase = screen.getByText('Decrypting files');
      expect(activePhase).toHaveClass('animate-pulse');
    });

    it('should show users visual confirmation of completed work', () => {
      const progress = createProgress(75);
      const { container } = render(<DecryptProgress progress={progress} />);

      // Users should see check marks or similar indicators for completed phases
      const completedIndicators = container.querySelectorAll('.text-green-600 svg');
      expect(completedIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Robust User Experience', () => {
    it('should handle the initial state gracefully', () => {
      const progress = createProgress(0);
      render(<DecryptProgress progress={progress} />);

      // Users should see a sensible initial state without errors
      const initialPhase = screen.getByText('Validating vault integrity');
      expect(initialPhase.closest('div')).not.toHaveClass('text-green-600');
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show initialization message when progress is 0', () => {
      const progress = createProgress(0, 'Starting...');
      render(<DecryptProgress progress={progress} />);

      // Users should see initialization message regardless of the progress message
      expect(screen.getByText('Starting decryption process...')).toBeInTheDocument();
    });

    it('should clearly indicate completion to users', () => {
      const progress = createProgress(100, 'Complete!');
      render(<DecryptProgress progress={progress} />);

      // Users should see clear visual confirmation that all work is done
      const allPhases = [
        'Validating vault integrity',
        'Verifying passphrase',
        'Decrypting files',
        'Extracting and preserving structure',
        'Finalizing recovery',
      ];

      allPhases.forEach((phaseName) => {
        const phase = screen.getByText(phaseName);
        expect(phase.closest('div')).toHaveClass('text-green-600');
      });
    });

    it('should provide fallback messaging when status is unclear', () => {
      const progress: ProgressUpdate = {
        operation_id: 'test-op-id',
        progress: 50,
        message: undefined as any, // Simulating missing message
        timestamp: new Date().toISOString(),
      };
      render(<DecryptProgress progress={progress} />);

      // Users should still see meaningful feedback even without specific messages
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should remain responsive during frequent updates', () => {
      const { rerender } = render(<DecryptProgress progress={createProgress(10)} />);

      // Simulate rapid progress updates that might occur during processing
      rerender(<DecryptProgress progress={createProgress(25)} />);
      rerender(<DecryptProgress progress={createProgress(50)} />);
      rerender(<DecryptProgress progress={createProgress(75)} />);
      rerender(<DecryptProgress progress={createProgress(100)} />);

      // Users should see the final state correctly without UI glitches
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });
});
