import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DecryptProgress from '../../../components/decrypt/DecryptProgress';
import { ProgressUpdate } from '../../../lib/api-types';
import '@testing-library/jest-dom';

describe('DecryptProgress', () => {
  const createProgress = (value: number, message?: string): ProgressUpdate => ({
    operation_id: 'test-op-id',
    progress: value,
    message: message || `Progress: ${value}%`,
    timestamp: new Date().toISOString(),
  });

  describe('Progress Phases', () => {
    it('should display all five decryption phases', () => {
      const progress = createProgress(0, 'Starting decryption...');
      render(<DecryptProgress progress={progress} />);

      expect(screen.getByText('Validating vault integrity')).toBeInTheDocument();
      expect(screen.getByText('Verifying passphrase')).toBeInTheDocument();
      expect(screen.getByText('Decrypting files')).toBeInTheDocument();
      expect(screen.getByText('Extracting and preserving structure')).toBeInTheDocument();
      expect(screen.getByText('Finalizing recovery')).toBeInTheDocument();
    });

    it('should show phase 1 active when progress is 0-10%', () => {
      const progress = createProgress(5, 'Validating vault...');
      render(<DecryptProgress progress={progress} />);

      const phase1 = screen.getByText('Validating vault integrity');
      expect(phase1.parentElement).toHaveClass('text-blue-600');
    });

    it('should show phase 2 active when progress is 10-20%', () => {
      const progress = createProgress(15, 'Checking passphrase...');
      render(<DecryptProgress progress={progress} />);

      const phase2 = screen.getByText('Verifying passphrase');
      expect(phase2.parentElement).toHaveClass('text-blue-600');
    });

    it('should show phase 3 active when progress is 20-70%', () => {
      const progress = createProgress(45, 'Decrypting data...');
      render(<DecryptProgress progress={progress} />);

      const phase3 = screen.getByText('Decrypting files');
      expect(phase3.parentElement).toHaveClass('text-blue-600');
    });

    it('should show phase 4 active when progress is 70-90%', () => {
      const progress = createProgress(80, 'Extracting files...');
      render(<DecryptProgress progress={progress} />);

      const phase4 = screen.getByText('Extracting and preserving structure');
      expect(phase4.parentElement).toHaveClass('text-blue-600');
    });

    it('should show phase 5 active when progress is 90-100%', () => {
      const progress = createProgress(95, 'Almost done...');
      render(<DecryptProgress progress={progress} />);

      const phase5 = screen.getByText('Finalizing recovery');
      expect(phase5.parentElement).toHaveClass('text-blue-600');
    });

    it('should mark completed phases with green color', () => {
      const progress = createProgress(75, 'Extracting...');
      render(<DecryptProgress progress={progress} />);

      // Phases 1-3 should be completed
      const phase1 = screen.getByText('Validating vault integrity');
      const phase2 = screen.getByText('Verifying passphrase');
      const phase3 = screen.getByText('Decrypting files');

      expect(phase1.parentElement).toHaveClass('text-green-600');
      expect(phase2.parentElement).toHaveClass('text-green-600');
      expect(phase3.parentElement).toHaveClass('text-green-600');
    });
  });

  describe('Progress Display', () => {
    it('should display the progress bar with percentage', () => {
      const progress = createProgress(42, 'Processing...');
      render(<DecryptProgress progress={progress} />);

      // The ProgressBar component should render the percentage
      expect(screen.getByText('42%')).toBeInTheDocument();
    });

    it('should display the progress message', () => {
      const progress = createProgress(30, 'Decrypting your important files...');
      render(<DecryptProgress progress={progress} />);

      expect(screen.getByText('Decrypting your important files...')).toBeInTheDocument();
    });

    it('should estimate remaining time based on progress', () => {
      const progress = createProgress(60);
      render(<DecryptProgress progress={progress} />);

      // Estimated time = (100 - 60) * 0.3 = 12 seconds
      expect(screen.getByText(/About 12 seconds remaining/)).toBeInTheDocument();
    });

    it('should not show negative time remaining', () => {
      const progress = createProgress(100);
      render(<DecryptProgress progress={progress} />);

      expect(screen.queryByText(/seconds remaining/)).not.toBeInTheDocument();
    });
  });

  describe('Cancel Functionality', () => {
    it('should show cancel button when onCancel is provided and progress < 90%', () => {
      const onCancel = vi.fn();
      const progress = createProgress(45);
      render(<DecryptProgress progress={progress} onCancel={onCancel} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should not show cancel button when progress >= 90%', () => {
      const onCancel = vi.fn();
      const progress = createProgress(92);
      render(<DecryptProgress progress={progress} onCancel={onCancel} />);

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('should not show cancel button when onCancel is not provided', () => {
      const progress = createProgress(45);
      render(<DecryptProgress progress={progress} />);

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      const progress = createProgress(45);
      render(<DecryptProgress progress={progress} onCancel={onCancel} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visual Elements', () => {
    it('should display the main heading', () => {
      const progress = createProgress(50);
      render(<DecryptProgress progress={progress} />);

      expect(screen.getByText('Decrypting Your Vault')).toBeInTheDocument();
    });

    it('should display the subtitle with reassuring message', () => {
      const progress = createProgress(50);
      render(<DecryptProgress progress={progress} />);

      expect(screen.getByText(/Your files are being securely recovered/)).toBeInTheDocument();
      expect(screen.getByText(/typically takes under 60 seconds/)).toBeInTheDocument();
    });

    it('should animate the active phase', () => {
      const progress = createProgress(35);
      render(<DecryptProgress progress={progress} />);

      const activePhase = screen.getByText('Decrypting files');
      expect(activePhase).toHaveClass('animate-pulse');
    });

    it('should show check icons for completed phases', () => {
      const progress = createProgress(75);
      const { container } = render(<DecryptProgress progress={progress} />);

      // Look for CheckCircle icons in completed phases
      const checkIcons = container.querySelectorAll('.text-green-600 svg');
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0% progress correctly', () => {
      const progress = createProgress(0);
      render(<DecryptProgress progress={progress} />);

      // All phases should be pending except the first one
      const phase1 = screen.getByText('Validating vault integrity');
      expect(phase1.parentElement).not.toHaveClass('text-green-600');
    });

    it('should handle 100% progress correctly', () => {
      const progress = createProgress(100, 'Complete!');
      render(<DecryptProgress progress={progress} />);

      // All phases should be completed
      const phases = [
        'Validating vault integrity',
        'Verifying passphrase',
        'Decrypting files',
        'Extracting and preserving structure',
        'Finalizing recovery',
      ];

      phases.forEach((phaseName) => {
        const phase = screen.getByText(phaseName);
        expect(phase.parentElement).toHaveClass('text-green-600');
      });
    });

    it('should handle missing progress message', () => {
      const progress: ProgressUpdate = {
        operation_id: 'test-op-id',
        progress: 50,
        message: undefined as any, // Simulating missing message
        timestamp: new Date().toISOString(),
      };
      render(<DecryptProgress progress={progress} />);

      // Should fall back to default message
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should handle rapid progress updates', () => {
      const { rerender } = render(<DecryptProgress progress={createProgress(10)} />);

      // Simulate rapid progress updates
      rerender(<DecryptProgress progress={createProgress(25)} />);
      rerender(<DecryptProgress progress={createProgress(50)} />);
      rerender(<DecryptProgress progress={createProgress(75)} />);
      rerender(<DecryptProgress progress={createProgress(100)} />);

      // Should display final state correctly
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });
  });
});
